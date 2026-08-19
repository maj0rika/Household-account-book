import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	testMatch: "runtime-verify.spec.ts",
	timeout: 180_000,
	fullyParallel: false,
	retries: 0,
	use: {
		baseURL: "http://localhost:3000",
		headless: true,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
});
