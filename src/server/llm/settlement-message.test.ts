import { describe, expect, it } from "vitest";

import {
	detectSettlementImageHint,
	detectSettlementTransferHint,
	preprocessSettlementImageMessage,
	preprocessSettlementTransferMessage,
} from "./settlement-message";
import {
	settlementImageHintFixtures,
	settlementImagePreprocessFixtures,
	settlementTransferHintFixtures,
	settlementTransferPreprocessFixtures,
} from "./settlement-fixtures";

describe("settlement message hints", () => {
	for (const fixture of settlementTransferHintFixtures) {
		it(fixture.title, () => {
			expect(
				detectSettlementTransferHint(fixture.input, fixture.options),
			).toEqual(fixture.expected);
		});
	}

	for (const fixture of settlementTransferPreprocessFixtures) {
		it(fixture.title, () => {
			const processed = preprocessSettlementTransferMessage(
				fixture.input,
				fixture.options,
			);

			if (!fixture.expectedLines) {
				expect(processed).not.toContain("[정산 이력 힌트]");
				return;
			}

			for (const line of fixture.expectedLines) {
				expect(processed).toContain(line);
			}
		});
	}

	for (const fixture of settlementImageHintFixtures) {
		it(fixture.title, () => {
			expect(detectSettlementImageHint(fixture.input)).toEqual(
				fixture.expected,
			);
		});
	}

	for (const fixture of settlementImagePreprocessFixtures) {
		it(fixture.title, () => {
			const processed = preprocessSettlementImageMessage(fixture.input);

			if (!fixture.expectedLines) {
				expect(processed).not.toContain("[이미지 정산 힌트]");
				return;
			}

			for (const line of fixture.expectedLines) {
				expect(processed).toContain(line);
			}
		});
	}
});
