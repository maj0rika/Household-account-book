import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const CHROME_MAC_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = Number(process.env.PLAYWRIGHT_SMOKE_PORT ?? 3105);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

function resolveExecutablePath(): string | undefined {
	const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
	if (envPath) {
		return envPath;
	}
	if (process.platform === "darwin" && existsSync(CHROME_MAC_PATH)) {
		return CHROME_MAC_PATH;
	}
	return undefined;
}

const executablePath = resolveExecutablePath();

export default defineConfig({
	testDir: "./e2e",
	testMatch: "smoke-public.spec.ts",
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: false,
	retries: 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL,
		headless: true,
		...(executablePath ? { launchOptions: { executablePath } } : {}),
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	webServer: {
		command: "node scripts/smoke-server.mjs",
		url: `${baseURL}/login`,
		timeout: 60_000,
		reuseExistingServer: false,
		env: {
			...process.env,
			PLAYWRIGHT_SMOKE_PORT: String(port),
			PLAYWRIGHT_BASE_URL: baseURL,
		},
	},
});
