// `cn()` 유틸이 Tailwind 클래스 충돌과 falsy 값을 올바르게 처리하는지 검증한다.
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
