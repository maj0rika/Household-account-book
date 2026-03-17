// 파일 역할:
// - 클라이언트와 서버가 함께 쓰는 공용 유틸 파일이다.
// 사용 위치:
// - 직접 import 경로가 드러나지 않는 진입점이거나, 프레임워크/테스트 러너가 런타임에 호출한다;
// 흐름:
// - 여러 계층이 이 유틸을 공유하면서 같은 계산 규칙이나 포맷 규칙을 재사용한다;
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
