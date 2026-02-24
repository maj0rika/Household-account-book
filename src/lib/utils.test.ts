import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
	it("should merge tailwind classes", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("should ignore falsy values", () => {
		expect(cn("text-sm", false && "text-lg")).toBe("text-sm");
	});
});
