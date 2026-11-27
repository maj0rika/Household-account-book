// 서버 캐시 무효화 경로·태그 상수
// revalidatePath()와 테넌트(userId) 스코프 revalidateTag()를 조합하여 mutation 후 관련 캐시를 자동 갱신

import { revalidatePath, revalidateTag } from "next/cache";

export const CachePaths = {
	transactions: "/transactions",
	statistics: "/statistics",
	assets: "/assets",
	budget: "/budget",
	settings: "/settings",
} as const;

export type CacheTagScope = "transactions" | "accounts" | "categories" | "budget" | "recurring";

// unstable_cache와 revalidateTag가 동일한 테넌트 격리 태그를 공유하도록 단일 헬퍼로 생성
export function tenantCacheTag(userId: string, scope: CacheTagScope): string {
	return `${scope}:${userId}`;
}

// 거래 mutation 시 무효화 (경로 + 테넌트 태그)
export function revalidateTransactionPages(userId: string): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.assets, "page");
	revalidatePath(CachePaths.budget, "page");
	revalidateTag(tenantCacheTag(userId, "transactions"));
	revalidateTag(tenantCacheTag(userId, "categories"));
	revalidateTag(tenantCacheTag(userId, "accounts"));
}

// 계좌 mutation 시 무효화
export function revalidateAccountPages(userId: string): void {
	revalidatePath(CachePaths.assets, "page");
	revalidateTag(tenantCacheTag(userId, "accounts"));
}

// 예산 mutation 시 무효화
export function revalidateBudgetPages(userId: string): void {
	revalidatePath(CachePaths.budget, "page");
	revalidateTag(tenantCacheTag(userId, "budget"));
}

// 카테고리 mutation 시 무효화
export function revalidateCategoryPages(userId: string): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.budget, "page");
	revalidatePath(CachePaths.settings, "page");
	revalidateTag(tenantCacheTag(userId, "categories"));
	revalidateTag(tenantCacheTag(userId, "transactions"));
}

// 고정거래 mutation 시 무효화
export function revalidateRecurringPages(userId: string): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.assets, "page");
	revalidatePath(CachePaths.budget, "page");
	revalidateTag(tenantCacheTag(userId, "recurring"));
	revalidateTag(tenantCacheTag(userId, "transactions"));
}
