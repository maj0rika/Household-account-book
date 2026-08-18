import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PARSE_SCHEMA_VERSION, parseLlmContent, ParseSchemaError } from "../../parse-schema";

interface Fixture {
	id: string;
	expect: "accept" | "reject" | "schema";
	content: string;
}

function loadFixtures(): Fixture[] {
	const path = resolve(fileURLToPath(new URL("../fixtures.jsonl", import.meta.url)));
	return readFileSync(path, "utf8")
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as Fixture);
}

describe("LLM parse candidate contract", () => {
	it("keeps a versioned schema name", () => {
		expect(PARSE_SCHEMA_VERSION).toBe("household-parse-v1");
	});

	it("grades the golden fixture set", () => {
		const fixtures = loadFixtures();
		expect(fixtures.length).toBeGreaterThanOrEqual(8);

		for (const fixture of fixtures) {
			if (fixture.expect === "accept") {
				const result = parseLlmContent(fixture.content);
				expect(result.transactions.length + result.accounts.length, fixture.id).toBeGreaterThan(0);
				continue;
			}

			expect(() => parseLlmContent(fixture.content), fixture.id).toThrow(ParseSchemaError);
		}
	});

	it("does not accept regex-fenced prose as JSON", () => {
		expect(() => parseLlmContent("결과는 다음과 같습니다 {\"rejected\":false}")).toThrow(
			ParseSchemaError,
		);
	});
});
