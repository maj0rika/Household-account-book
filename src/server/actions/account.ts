"use server";

import { unstable_cache } from "next/cache";

// 파일 역할:
// - 자산/부채 계정 CRUD와 파싱 결과 저장을 담당하는 서버 액션 파일이다.
// 사용 위치:
// - `src/app/(dashboard)/assets/page.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/app/(dashboard)/layout.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/app/(dashboard)/transactions/page.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 자산 화면/파싱 시트 요청 -> `getAuthUserIdOrThrow()`로 사용자 확인 -> accounts 테이블 읽기/쓰기 -> 필요한 암복호화 -> `revalidateAccountPages()` 호출 순서로 흐른다;
import { and, eq, desc } from "drizzle-orm";

import { getAuthUserIdOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { accounts } from "@/server/db/schema";
import { encrypt, decryptString, encryptNumber, decryptNumber } from "@/server/lib/crypto";
import { revalidateAccountPages, CacheTags } from "@/lib/cache-keys";
import type { Account, AccountSummary } from "@/types";

const getAuthUserId = getAuthUserIdOrThrow;

// `assets/page.tsx`, `transactions/page.tsx`, 계정 선택 시트가 이 함수를 호출한다.
// DB에는 암호문이 저장되어 있으므로, UI로 내려가기 전에 이름과 잔액을 모두 복호화한다.
const cachedGetAccounts = unstable_cache(
	async (userId: string): Promise<Account[]> => {
		const rows = await db
			.select()
			.from(accounts)
			.where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
			.orderBy(accounts.type, accounts.sortOrder, desc(accounts.createdAt));

		return rows.map((row) => ({
			id: row.id,
			userId: row.userId,
			name: decryptString(row.name),
			type: row.type,
			subType: row.subType,
			icon: row.icon,
			balance: decryptNumber(row.balance),
			sortOrder: row.sortOrder,
			isActive: row.isActive,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}));
	},
	["accounts-list"],
	{ tags: [CacheTags.accounts], revalidate: 120 },
);

export async function getAccounts(): Promise<Account[]> {
	const userId = await getAuthUserId();
	return cachedGetAccounts(userId);
}

const cachedGetAccountSummary = unstable_cache(
	async (userId: string): Promise<AccountSummary> => {
		const rows = await db
			.select({
				type: accounts.type,
				balance: accounts.balance,
			})
			.from(accounts)
			.where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)));

		let totalAssets = 0;
		let totalDebts = 0;
		for (const row of rows) {
			const balance = decryptNumber(row.balance);
			if (row.type === "asset") totalAssets += balance;
			if (row.type === "debt") totalDebts += balance;
		}

		return {
			totalAssets,
			totalDebts,
			netWorth: totalAssets - totalDebts,
		};
	},
	["account-summary"],
	{ tags: [CacheTags.accounts], revalidate: 120 },
);

export async function getAccountSummary(): Promise<AccountSummary> {
	const userId = await getAuthUserId();
	return cachedGetAccountSummary(userId);
}

export async function createAccount(data: {
	name: string;
	type: "asset" | "debt";
	subType: string;
	icon: string;
	balance: number;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 생성 시점부터 이름과 잔액을 암호화해 저장해야
		// 이후 조회/파싱/보안 경로가 같은 전제를 유지한다.
		const [row] = await db
			.insert(accounts)
			.values({
				userId,
				name: encrypt(data.name),
				type: data.type,
				subType: data.subType,
				icon: data.icon,
				balance: encryptNumber(data.balance),
			})
			.returning({ id: accounts.id });

		revalidateAccountPages();
		return { success: true, id: row.id };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "계정 생성에 실패했습니다." };
	}
}

export async function updateAccount(
	id: string,
	data: {
		name?: string;
		icon?: string;
		balance?: number;
		subType?: string;
		sortOrder?: number;
	},
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 부분 업데이트를 허용해 입력 시트가 바뀐 필드만 보낼 수 있게 한다.
		// undefined는 전개 조건으로 걸러 기존 컬럼을 덮어쓰지 않도록 한다.
		await db
			.update(accounts)
			.set({
				...(data.name !== undefined && { name: encrypt(data.name) }),
				...(data.icon !== undefined && { icon: data.icon }),
				...(data.balance !== undefined && { balance: encryptNumber(data.balance) }),
				...(data.subType !== undefined && { subType: data.subType }),
				...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
				updatedAt: new Date(),
			})
			.where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

		revalidateAccountPages();
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "계정 수정에 실패했습니다." };
	}
}

export type AccountBatchItem =
	| { action: "create"; name: string; type: "asset" | "debt"; subType: string; icon: string; balance: number }
	| { action: "update"; accountId: string; name: string; type: "asset" | "debt"; subType: string; icon: string; balance: number };

export async function upsertParsedAccountsBatch(
	items: AccountBatchItem[],
): Promise<{ success: true; count: number } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		if (items.length === 0) {
			return { success: false, error: "저장할 항목이 없습니다." };
		}

		// 자산 파싱 결과 시트는 create/update가 섞여서 저장될 수 있다.
		// 하나라도 실패하면 전체를 롤백해야 시트와 실제 DB 상태가 어긋나지 않는다.
		await db.transaction(async (tx) => {
			for (const item of items) {
				if (item.action === "update") {
					// update 경로는 기존 계정과 재매칭된 항목을 덮어쓸 때 사용한다.
					const result = await tx
						.update(accounts)
						.set({
							name: encrypt(item.name),
							type: item.type,
							subType: item.subType,
							icon: item.icon,
							balance: encryptNumber(item.balance),
							updatedAt: new Date(),
						})
						.where(and(eq(accounts.id, item.accountId), eq(accounts.userId, userId)));

					if (!result.rowCount || result.rowCount === 0) {
						throw new Error("수정할 계정을 찾을 수 없습니다.");
					}
				} else {
					// create 경로는 "신규"로 판정된 파싱 항목을 새 계정으로 저장한다.
					await tx.insert(accounts).values({
						userId,
						name: encrypt(item.name),
						type: item.type,
						subType: item.subType,
						icon: item.icon,
						balance: encryptNumber(item.balance),
					});
				}
			}
		});

		revalidateAccountPages();
		return { success: true, count: items.length };
	} catch (e) {
		return {
			success: false,
			error: e instanceof Error ? e.message : "자산/부채 저장에 실패했습니다.",
		};
	}
}

export async function deleteAccount(
	id: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 거래 이력과의 참조를 보존해야 하므로 실제 row 삭제 대신 소프트 삭제를 사용한다.
		await db
			.update(accounts)
			.set({ isActive: false, updatedAt: new Date() })
			.where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

		revalidateAccountPages();
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "계정 삭제에 실패했습니다." };
	}
}
