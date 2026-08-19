import { describe, expect, it } from "vitest";

import { listRuntimeModels, RUNTIME_MODELS } from "../models";

describe("runtime model inventory", () => {
	it("does not keep sunset Kimi K2.5 IDs", () => {
		const ids = listRuntimeModels().map((item) => item.model);
		expect(ids).not.toContain("kimi-k2.5");
		expect(ids).not.toContain("accounts/fireworks/models/kimi-k2p5");
		expect(RUNTIME_MODELS.kimi.model).toBe("kimi-k3");
		expect(RUNTIME_MODELS.fireworks.model).toBe("accounts/fireworks/models/kimi-k3");
	});
});
