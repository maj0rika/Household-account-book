import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	test: {
		include: [
			"src/**/*.test.ts",
			"src/**/*.test.tsx",
			"src/**/__tests__/**/*.ts",
			"src/**/__tests__/**/*.tsx",
		],
		exclude: ["e2e/**", "node_modules/**", ".next/**"],
	},
});
