import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3002);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
	testDir: "./e2e",
	timeout: 180_000,
	expect: {
		timeout: 15_000,
	},
	fullyParallel: false,
	retries: 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL,
		headless: true,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	webServer: {
		command: "npm run dev -- --port 3002",
		url: `${baseURL}/login`,
		timeout: 120_000,
		reuseExistingServer: !process.env.CI,
		env: {
			...process.env,
			BETTER_AUTH_URL: baseURL,
			NEXT_PUBLIC_BETTER_AUTH_URL: baseURL,
		},
	},
});
