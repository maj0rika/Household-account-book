// 서버 캐시 무효화 경로 상수
// revalidatePath()에서 사용하여 mutation 후 관련 페이지를 자동 갱신

import { revalidatePath } from "next/cache";

export const CachePaths = {
	transactions: "/transactions",
	statistics: "/statistics",
	assets: "/assets",
	budget: "/budget",
	categories: "/categories",
	settings: "/settings",
} as const;

// 거래 mutation 시 무효화할 경로 (거래 + 통계 + 자산 + 예산)
export function revalidateTransactionPages(): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.assets, "page");
	revalidatePath(CachePaths.budget, "page");
}

// 계좌 mutation 시 무효화할 경로
export function revalidateAccountPages(): void {
	revalidatePath(CachePaths.assets, "page");
}

// 예산 mutation 시 무효화할 경로
export function revalidateBudgetPages(): void {
	revalidatePath(CachePaths.budget, "page");
}

// 카테고리 mutation 시 무효화할 경로
export function revalidateCategoryPages(): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.budget, "page");
	revalidatePath(CachePaths.categories, "page");
	revalidatePath(CachePaths.settings, "page");
}

// 고정거래 mutation 시 무효화할 경로
export function revalidateRecurringPages(): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.assets, "page");
	revalidatePath(CachePaths.budget, "page");
}
