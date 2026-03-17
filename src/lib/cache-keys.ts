// 서버 캐시 무효화 경로·태그 상수
// revalidatePath()와 revalidateTag()를 조합하여 mutation 후 관련 캐시를 자동 갱신

import { revalidatePath, revalidateTag } from "next/cache";

export const CachePaths = {
	transactions: "/transactions",
	statistics: "/statistics",
	assets: "/assets",
	budget: "/budget",
	categories: "/categories",
	settings: "/settings",
} as const;

// unstable_cache에서 사용하는 캐시 태그
export const CacheTags = {
	transactions: "transactions",
	accounts: "accounts",
	categories: "categories",
	budget: "budget",
	recurring: "recurring",
} as const;

// 거래 mutation 시 무효화 (경로 + 태그)
export function revalidateTransactionPages(): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.assets, "page");
	revalidatePath(CachePaths.budget, "page");
	revalidateTag(CacheTags.transactions);
	revalidateTag(CacheTags.categories);
}

// 계좌 mutation 시 무효화
export function revalidateAccountPages(): void {
	revalidatePath(CachePaths.assets, "page");
	revalidateTag(CacheTags.accounts);
}

// 예산 mutation 시 무효화
export function revalidateBudgetPages(): void {
	revalidatePath(CachePaths.budget, "page");
	revalidateTag(CacheTags.budget);
}

// 카테고리 mutation 시 무효화
export function revalidateCategoryPages(): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.budget, "page");
	revalidatePath(CachePaths.categories, "page");
	revalidatePath(CachePaths.settings, "page");
	revalidateTag(CacheTags.categories);
	revalidateTag(CacheTags.transactions);
}

// 고정거래 mutation 시 무효화
export function revalidateRecurringPages(): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.assets, "page");
	revalidatePath(CachePaths.budget, "page");
	revalidateTag(CacheTags.recurring);
	revalidateTag(CacheTags.transactions);
}
