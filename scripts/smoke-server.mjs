import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const SSL_REQUEST_CODE = 80877103;
const AUTH_OK = Buffer.from([0x52, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00]);
const READY_IDLE = Buffer.from([0x5a, 0x00, 0x00, 0x00, 0x05, 0x49]);

function getReadyStatus(payload) {
	let offset = 0;
	let status = null;
	while (offset + 5 <= payload.length) {
		const type = payload[offset];
		const len = payload.readInt32BE(offset + 1);
		const total = 1 + len;
		if (offset + total > payload.length) {
			break;
		}
		if (type === 0x5a && total === 6) {
			status = payload[offset + 5];
		}
		offset += total;
	}
	return status;
}

async function createMigratedPglite() {
	const pglite = new PGlite();
	await pglite.waitReady;

	const migrationsFolder = path.resolve(process.cwd(), "src/server/db/migrations");
	const journal = JSON.parse(
		readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"),
	);

	for (const entry of journal.entries) {
		const sql = readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`), "utf8");
		await pglite.exec(sql);
	}

	return pglite;
}

function startPgliteTcpProxy(pglite) {
	let lockOwner = null;
	const waiters = [];

	function acquireLock(owner) {
		if (lockOwner === owner) {
			return Promise.resolve();
		}
		if (lockOwner === null) {
			lockOwner = owner;
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			waiters.push({ owner, resolve });
		});
	}

	function releaseLock(owner) {
		if (lockOwner !== owner) {
			return;
		}
		const next = waiters.shift();
		if (next) {
			lockOwner = next.owner;
			next.resolve();
		} else {
			lockOwner = null;
		}
	}

	const server = net.createServer((socket) => {
		let buffer = Buffer.alloc(0);
		let started = false;
		let chain = Promise.resolve();

		const processBuffer = async () => {
			while (buffer.length >= 4) {
				if (!started) {
					const len = buffer.readInt32BE(0);
					if (len < 4 || buffer.length < len) {
						break;
					}
					const packet = buffer.subarray(0, len);
					buffer = buffer.subarray(len);
					if (len === 8 && packet.readInt32BE(4) === SSL_REQUEST_CODE) {
						socket.write(Buffer.from("N"));
						continue;
					}
					started = true;
					socket.write(Buffer.concat([AUTH_OK, READY_IDLE]));
					continue;
				}

				if (buffer.length < 5) {
					break;
				}
				const msgLen = buffer.readInt32BE(1) + 1;
				if (buffer.length < msgLen) {
					break;
				}
				const msg = buffer.subarray(0, msgLen);
				buffer = buffer.subarray(msgLen);

				if (msg[0] === 0x58) {
					releaseLock(socket);
					socket.end();
					return;
				}

				await acquireLock(socket);
				try {
					const result = Buffer.from(await pglite.execProtocolRaw(new Uint8Array(msg)));
					socket.write(result);
					const readyStatus = getReadyStatus(result);
					if (readyStatus === 0x49) {
						releaseLock(socket);
					}
				} catch (error) {
					releaseLock(socket);
					throw error;
				}
			}
		};

		socket.on("data", (chunk) => {
			buffer = Buffer.concat([buffer, chunk]);
			chain = chain.then(processBuffer).catch((error) => {
				console.error("[smoke-db-proxy] error:", error);
				releaseLock(socket);
				socket.destroy();
			});
		});

		socket.on("close", () => releaseLock(socket));
		socket.on("error", () => releaseLock(socket));
	});

	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			resolve({ server, port: address.port });
		});
	});
}

async function main() {
	const port = Number(process.env.PLAYWRIGHT_SMOKE_PORT ?? 3105);
	const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

	const pglite = await createMigratedPglite();
	const { server, port: dbPort } = await startPgliteTcpProxy(pglite);
	const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${dbPort}/household_smoke`;

	const nextBin = path.resolve(process.cwd(), "node_modules", ".bin", "next");
	const child = spawn(nextBin, ["start", "--hostname", "127.0.0.1", "--port", String(port)], {
		stdio: "inherit",
		env: {
			...process.env,
			DATABASE_URL: databaseUrl,
			BETTER_AUTH_SECRET:
				process.env.BETTER_AUTH_SECRET ??
				"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			BETTER_AUTH_URL: baseURL,
			NEXT_PUBLIC_BETTER_AUTH_URL: baseURL,
			ENCRYPTION_KEY:
				process.env.ENCRYPTION_KEY ??
				"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			NEXT_TELEMETRY_DISABLED: "1",
		},
	});

	let shuttingDown = false;
	const shutdown = async (signal) => {
		if (shuttingDown) {
			return;
		}
		shuttingDown = true;
		if (!child.killed) {
			child.kill(signal);
		}
		server.close();
		await pglite.close().catch(() => undefined);
	};

	process.on("SIGINT", () => void shutdown("SIGINT"));
	process.on("SIGTERM", () => void shutdown("SIGTERM"));

	child.on("exit", async (code, signal) => {
		server.close();
		await pglite.close().catch(() => undefined);
		if (signal) {
			process.exit(1);
		}
		process.exit(code ?? 0);
	});
}

main().catch((error) => {
	console.error("[smoke-server] fatal:", error);
	process.exit(1);
});
