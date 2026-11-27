import { afterEach, describe, expect, it, vi } from "vitest";

import { GOLDEN_CORPUS_GROUPS, loadGoldenCorpus, runOfflineEval } from "../runner";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Deterministic offline Korean household eval corpus", () => {
	it("contains 100+ distinct cases covering all required Korean utterance categories", () => {
		const corpus = loadGoldenCorpus();
		expect(corpus.length).toBeGreaterThanOrEqual(100);

		const ids = new Set(corpus.map((c) => c.id));
		const inputs = new Set(corpus.map((c) => c.input));
		expect(ids.size).toBe(corpus.length);
		expect(inputs.size).toBe(corpus.length);

		for (const group of GOLDEN_CORPUS_GROUPS) {
			const count = corpus.filter((c) => c.group === group).length;
			expect(count, `missing cases for group ${group}`).toBeGreaterThanOrEqual(10);
		}
	});

	it("passes 100% of offline OOD, bank preprocessing, prompt prefix, schema, and telemetry checks at $0 spend", async () => {
		vi.spyOn(console, "info").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const report = await runOfflineEval();

		expect(report.totalCases).toBeGreaterThanOrEqual(100);
		expect(report.failures).toEqual([]);
		expect(report.failedCases).toBe(0);
		expect(report.passedCases).toBe(report.totalCases);
		expect(report.telemetrySampleCount).toBeGreaterThanOrEqual(100);
	});
});
