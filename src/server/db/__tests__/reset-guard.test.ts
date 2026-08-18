import { describe, expect, it } from "vitest";

import { assertResetAllowed } from "../reset-guard";

const disposable = {
	DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/household_dev",
	ALLOW_DB_RESET: "1",
	CONFIRM_DB_RESET: "RESET",
	DATABASE_ENV: "development",
	NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

describe("assertResetAllowed", () => {
	it("명시 확인이 있는 disposable URL은 허용한다", () => {
		expect(() => assertResetAllowed(disposable)).not.toThrow();
	});

	it("ALLOW_DB_RESET이 없으면 거부한다", () => {
		expect(() =>
			assertResetAllowed({ ...disposable, ALLOW_DB_RESET: undefined }),
		).toThrow("ALLOW_DB_RESET=1");
	});

	it("CONFIRM_DB_RESET이 RESET이 아니면 거부한다", () => {
		expect(() =>
			assertResetAllowed({ ...disposable, CONFIRM_DB_RESET: "yes" }),
		).toThrow("CONFIRM_DB_RESET=RESET");
	});

	it("production 환경은 거부한다", () => {
		expect(() =>
			assertResetAllowed({ ...disposable, DATABASE_ENV: "production" }),
		).toThrow("production database");
		expect(() =>
			assertResetAllowed({ ...disposable, NODE_ENV: "production" }),
		).toThrow("production database");
	});

	it("hostname에 prod가 있으면 거부한다", () => {
		expect(() =>
			assertResetAllowed({
				...disposable,
				DATABASE_URL: "postgresql://postgres:postgres@db.prod.example:5432/household",
			}),
		).toThrow("hostname looks like production");
	});
});
