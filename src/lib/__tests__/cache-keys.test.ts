import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
	revalidatePathMock: vi.fn(),
	revalidateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: revalidatePathMock,
	revalidateTag: revalidateTagMock,
}));

import {
	CachePaths,
	revalidateAccountPages,
	revalidateBudgetPages,
	revalidateCategoryPages,
	revalidateRecurringPages,
	revalidateTransactionPages,
	tenantCacheTag,
} from "../cache-keys";

describe("cache-keys", () => {
	beforeEach(() => {
		revalidatePathMock.mockClear();
		revalidateTagMock.mockClear();
	});

	it("죽은 /categories 경로를 포함하지 않는다", () => {
		expect(Object.values(CachePaths)).not.toContain("/categories");
	});

	it("테넌트별로 분리된 캐시 태그만 생성하고 무효화한다", () => {
		expect(tenantCacheTag("user-a", "transactions")).toBe("transactions:user-a");
		expect(tenantCacheTag("user-b", "transactions")).toBe("transactions:user-b");

		revalidateTransactionPages("user-a");
		expect(revalidateTagMock).toHaveBeenCalledWith("transactions:user-a");
		expect(revalidateTagMock).toHaveBeenCalledWith("categories:user-a");
		expect(revalidateTagMock).toHaveBeenCalledWith("accounts:user-a");
		expect(revalidateTagMock).not.toHaveBeenCalledWith("transactions:user-b");
		expect(revalidateTagMock).not.toHaveBeenCalledWith("transactions");
	});

	it("카테고리·계좌·예산·고정거래 무효화도 userId 스코프 태그만 사용한다", () => {
		revalidateAccountPages("user-1");
		revalidateBudgetPages("user-1");
		revalidateCategoryPages("user-1");
		revalidateRecurringPages("user-1");

		const tags = revalidateTagMock.mock.calls.map(([tag]) => tag as string);
		expect(tags.every((tag) => tag.endsWith(":user-1"))).toBe(true);
		expect(revalidatePathMock).not.toHaveBeenCalledWith("/categories", "page");
	});
});
