function hostnameFromDatabaseUrl(databaseUrl: string): string {
	const normalized = databaseUrl.replace(/^postgres(ql)?:/i, "http:");
	return new URL(normalized).hostname.toLowerCase();
}

export function assertResetAllowed(env: NodeJS.ProcessEnv = process.env): void {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required");
	}

	if (env.NODE_ENV === "production" || env.DATABASE_ENV === "production") {
		throw new Error("Refusing to reset a production database.");
	}

	if (env.ALLOW_DB_RESET !== "1") {
		throw new Error("Refusing to reset: set ALLOW_DB_RESET=1 on a disposable database.");
	}

	if (env.CONFIRM_DB_RESET !== "RESET") {
		throw new Error("Refusing to reset: set CONFIRM_DB_RESET=RESET to confirm.");
	}

	let hostname = "";
	try {
		hostname = hostnameFromDatabaseUrl(databaseUrl);
	} catch {
		throw new Error("DATABASE_URL is not a valid connection string.");
	}

	if (/(^|\.)prod(uction)?(\.|-|$)/i.test(hostname)) {
		throw new Error("Refusing to reset: DATABASE_URL hostname looks like production.");
	}
}
