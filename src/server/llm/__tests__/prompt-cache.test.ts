import { describe, expect, it } from "vitest";

import {
	buildSystemPrompt,
	PROMPT_CACHE_DELIMITER,
	STATIC_SYSTEM_PROMPT_PREFIX,
	type LLMCategory,
} from "../prompt";

describe("LLM system prompt cache prefix ordering", () => {
	it("places immutable static instructions before dynamic context delimiter", () => {
		const categories: LLMCategory[] = [
			{ name: "식비", type: "expense" },
			{ name: "급여", type: "income" },
		];
		const prompt = buildSystemPrompt(categories, "2026-08-18", [
			{ name: "카카오뱅크", type: "asset" },
		]);

		const delimiterIndex = prompt.indexOf(PROMPT_CACHE_DELIMITER);
		expect(delimiterIndex).toBeGreaterThan(0);

		const prefix = prompt.slice(0, delimiterIndex);
		const suffix = prompt.slice(delimiterIndex + PROMPT_CACHE_DELIMITER.length);

		expect(prefix).toBe(STATIC_SYSTEM_PROMPT_PREFIX);
		expect(prefix).not.toContain("2026-08-18");
		expect(prefix).not.toContain("카카오뱅크(자산)");
		expect(suffix).toContain("2026-08-18");
		expect(suffix).toContain("식비");
		expect(suffix).toContain("급여");
		expect(suffix).toContain("카카오뱅크(자산)");
	});

	it("keeps static prefix byte-for-byte identical across varying dates, categories, and accounts", () => {
		const variants = [
			buildSystemPrompt([], "2026-01-01", []),
			buildSystemPrompt(
				[
					{ name: "식비", type: "expense" },
					{ name: "카페/간식", type: "expense" },
					{ name: "월급", type: "income" },
				],
				"2026-08-18",
				[
					{ name: "카카오뱅크", type: "asset" },
					{ name: "신한카드", type: "debt" },
				],
			),
			buildSystemPrompt(
				[
					{ name: "교통", type: "expense" },
					{ name: "투자수익", type: "income" },
				],
				"2027-12-31",
				[{ name: "토스증권", type: "asset" }],
			),
		];

		const prefixes = variants.map((prompt) => {
			const parts = prompt.split(PROMPT_CACHE_DELIMITER);
			expect(parts).toHaveLength(2);
			return parts[0];
		});

		expect(Buffer.from(prefixes[0], "utf8").equals(Buffer.from(prefixes[1], "utf8"))).toBe(true);
		expect(Buffer.from(prefixes[1], "utf8").equals(Buffer.from(prefixes[2], "utf8"))).toBe(true);
		expect(prefixes[0]).toBe(STATIC_SYSTEM_PROMPT_PREFIX);
	});
});
