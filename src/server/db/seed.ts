import "dotenv/config";

import { eq, and } from "drizzle-orm";

import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { encryptNullable } from "@/server/lib/crypto";

import { db } from "./index";
import {
	categories,
	authUsers,
	transactions,
	budgets,
	recurringTransactions,
} from "./schema";

// CLI 인자에서 이메일 추출: npm run db:seed -- --email user@example.com
const getTargetEmail = (): string => {
	const emailArgIndex = process.argv.indexOf("--email");
	if (emailArgIndex !== -1 && process.argv[emailArgIndex + 1]) {
		return process.argv[emailArgIndex + 1];
	}
	return "seed@household.local";
};

const targetEmail = getTargetEmail();

const seed = async (): Promise<void> => {
	const now = new Date();

	// 기존 유저 찾기 (이미 가입된 계정)
	let user = await db
		.select({ id: authUsers.id })
		.from(authUsers)
		.where(eq(authUsers.email, targetEmail))
		.limit(1)
		.then((rows) => rows[0]);

	// 유저가 없으면 데모 유저 생성 (seed@household.local 등)
	if (!user) {
		await db
			.insert(authUsers)
			.values({
				id: `seed-${Date.now()}`,
				email: targetEmail,
				name: "Seed User",
				emailVerified: false,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing({ target: authUsers.email });

		user = await db
			.select({ id: authUsers.id })
			.from(authUsers)
			.where(eq(authUsers.email, targetEmail))
			.limit(1)
			.then((rows) => rows[0]);
	}

	if (!user) {
		throw new Error(`유저를 찾을 수 없습니다: ${targetEmail}`);
	}

	const userId = user.id;
	process.stdout.write(`대상 유저: ${targetEmail} (${userId})\n`);

	// 1. 기본 카테고리 삽입 (이미 있으면 무시)
	await db
		.insert(categories)
		.values(
			DEFAULT_CATEGORIES.map((category, index) => ({
				userId,
				name: category.name,
				icon: category.icon,
				type: category.type,
				sortOrder: index + 1,
				isDefault: true,
			})),
		)
		.onConflictDoNothing();

	// 카테고리 조회 (시드 거래에 사용)
	const userCategories = await db
		.select({ id: categories.id, name: categories.name, type: categories.type })
		.from(categories)
		.where(eq(categories.userId, userId));

	const findCategory = (name: string) =>
		userCategories.find((c) => c.name === name);

	// 2. 샘플 거래 내역 (이번 달 + 지난 달)
	const today = new Date();
	const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
	const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
	const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

	const sampleTransactions = [
		// 이번 달
		{ type: "expense" as const, amount: 12000, description: "점심 김치찌개", category: "식비", date: `${thisMonth}-03` },
		{ type: "expense" as const, amount: 8500, description: "스타벅스 아메리카노", category: "카페/간식", date: `${thisMonth}-05` },
		{ type: "expense" as const, amount: 1450, description: "지하철 출퇴근", category: "교통", date: `${thisMonth}-05` },
		{ type: "expense" as const, amount: 35000, description: "마트 장보기", category: "생활용품", date: `${thisMonth}-08` },
		{ type: "expense" as const, amount: 15000, description: "저녁 삼겹살", category: "식비", date: `${thisMonth}-10` },
		{ type: "expense" as const, amount: 6000, description: "카페라떼 2잔", category: "카페/간식", date: `${thisMonth}-12` },
		{ type: "expense" as const, amount: 50000, description: "통신비", category: "통신", date: `${thisMonth}-15` },
		{ type: "expense" as const, amount: 25000, description: "넷플릭스+유튜브 프리미엄", category: "여가/취미", date: `${thisMonth}-15` },
		{ type: "income" as const, amount: 3500000, description: "2월 급여", category: "급여", date: `${thisMonth}-10` },
		{ type: "income" as const, amount: 50000, description: "용돈", category: "용돈/부수입", date: `${thisMonth}-14` },
		// 지난 달
		{ type: "expense" as const, amount: 280000, description: "관리비", category: "주거/관리비", date: `${lastMonth}-05` },
		{ type: "expense" as const, amount: 150000, description: "대형마트 장보기", category: "생활용품", date: `${lastMonth}-10` },
		{ type: "expense" as const, amount: 85000, description: "식비 총합", category: "식비", date: `${lastMonth}-15` },
		{ type: "expense" as const, amount: 30000, description: "카페 지출", category: "카페/간식", date: `${lastMonth}-20` },
		{ type: "expense" as const, amount: 50000, description: "통신비", category: "통신", date: `${lastMonth}-15` },
		{ type: "income" as const, amount: 3500000, description: "1월 급여", category: "급여", date: `${lastMonth}-10` },
	];

	for (const tx of sampleTransactions) {
		const cat = findCategory(tx.category);
		if (!cat) continue;

		// 중복 방지: 같은 날짜 + 같은 설명 + 같은 금액이면 스킵
		const existing = await db
			.select({ id: transactions.id })
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.date, tx.date),
					eq(transactions.description, tx.description),
					eq(transactions.amount, tx.amount),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			await db.insert(transactions).values({
				userId,
				categoryId: cat.id,
				type: tx.type,
				amount: tx.amount,
				description: tx.description,
				date: tx.date,
				memo: encryptNullable("시드 데이터"),
			});
		}
	}

	// 3. 샘플 예산 (이번 달)
	const sampleBudgets = [
		{ category: "식비", amount: 300000 },
		{ category: "카페/간식", amount: 50000 },
		{ category: "교통", amount: 100000 },
		{ category: "생활용품", amount: 200000 },
		{ category: "통신", amount: 60000 },
		{ category: "여가/취미", amount: 100000 },
	];

	for (const b of sampleBudgets) {
		const cat = findCategory(b.category);
		if (!cat) continue;

		await db
			.insert(budgets)
			.values({
				userId,
				categoryId: cat.id,
				amount: b.amount,
				month: thisMonth,
			})
			.onConflictDoNothing();
	}

	// 4. 샘플 고정 거래
	const sampleRecurring = [
		{ type: "expense" as const, amount: 280000, description: "관리비", category: "주거/관리비", dayOfMonth: 5 },
		{ type: "expense" as const, amount: 50000, description: "통신비", category: "통신", dayOfMonth: 15 },
		{ type: "expense" as const, amount: 25000, description: "넷플릭스+유튜브", category: "여가/취미", dayOfMonth: 15 },
		{ type: "income" as const, amount: 3500000, description: "급여", category: "급여", dayOfMonth: 10 },
	];

	for (const r of sampleRecurring) {
		const cat = findCategory(r.category);
		if (!cat) continue;

		// 중복 방지
		const existing = await db
			.select({ id: recurringTransactions.id })
			.from(recurringTransactions)
			.where(
				and(
					eq(recurringTransactions.userId, userId),
					eq(recurringTransactions.description, r.description),
					eq(recurringTransactions.amount, r.amount),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			await db.insert(recurringTransactions).values({
				userId,
				categoryId: cat.id,
				type: r.type,
				amount: r.amount,
				description: r.description,
				dayOfMonth: r.dayOfMonth,
				isActive: true,
			});
		}
	}

	process.stdout.write(`시드 완료: 거래 ${sampleTransactions.length}건, 예산 ${sampleBudgets.length}건, 고정거래 ${sampleRecurring.length}건\n`);
};

seed()
	.then(() => {
		process.exit(0);
	})
	.catch((error: unknown) => {
		process.stderr.write(`시드 실패: ${String(error)}\n`);
		process.exit(1);
	});
