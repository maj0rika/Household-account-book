// 텍스트 파싱 동시 경쟁(first-success-wins) 전략의 핵심 패턴 테스트
// parse-core.ts의 raceTextProviders 로직을 DB/LLM 의존성 없이 검증한다.
import { describe, it, expect } from "vitest";

import type { UnifiedParseResponse } from "@/server/llm/types";

// raceTextProviders의 핵심 패턴을 재현하는 헬퍼
// 실제 함수는 parseUnifiedText를 호출하지만, 여기서는 task 함수 배열로 추상화
async function raceFirstSuccess(
	tasks: Array<{
		name: string;
		run: (signal: AbortSignal) => Promise<UnifiedParseResponse>;
	}>,
): Promise<UnifiedParseResponse> {
	if (tasks.length === 0) {
		return { success: false, error: "provider 없음" };
	}

	if (tasks.length === 1) {
		const controller = new AbortController();
		return tasks[0].run(controller.signal);
	}

	const controllers = tasks.map(() => new AbortController());
	// 실제 구현처럼 Promise.any 밖에서 실패 메시지를 따로 수집해
	// 모든 task가 실패한 경우 마지막 에러를 검증할 수 있게 한다.
	const failures: Array<{ name: string; error: string }> = [];

	const wrappedTasks = tasks.map(async (task, index) => {
		const controller = controllers[index];
		try {
			const result = await task.run(controller.signal);
			if (result.success) {
				return { name: task.name, result, index };
			}

			// success:false는 테스트에서도 "다음 후보 탐색"을 의미하므로 reject로 변환한다.
			throw { name: task.name, index, error: result.error };
		} catch (error) {
			const failure = error && typeof error === "object" && "error" in error
				? error as { name: string; index: number; error: string }
				: {
					name: task.name,
					index,
					error: `파싱 실패: ${error instanceof Error ? error.message : String(error)}`,
				};

			failures.push({ name: failure.name, error: failure.error });
			throw failure;
		}
	});

	try {
		// raceTextProviders와 동일하게 첫 성공만 채택한다.
		const winner = await Promise.any(wrappedTasks);
		for (let i = 0; i < controllers.length; i++) {
			if (i !== winner.index) controllers[i].abort();
		}
		// 패자 abort 이후에도 테스트 런타임에 미정리 promise가 남지 않게 한다.
		void Promise.allSettled(wrappedTasks);
		return winner.result;
	} catch {
		// 전부 실패한 경우에만 수집한 실패 목록을 읽는다.
		const lastFailure = failures[failures.length - 1];
		return { success: false, error: lastFailure?.error ?? "알 수 없는 오류" };
	}
}

// 지연 후 결과를 반환하는 mock task 생성
function createDelayedTask(
	name: string,
	delayMs: number,
	result: UnifiedParseResponse,
): {
	name: string;
	run: (signal: AbortSignal) => Promise<UnifiedParseResponse>;
	aborted: () => boolean;
} {
	let wasAborted = false;

	return {
		name,
		run: (signal: AbortSignal) =>
			new Promise<UnifiedParseResponse>((resolve, reject) => {
				const timer = setTimeout(() => {
					if (signal.aborted) {
						wasAborted = true;
						reject(new Error("aborted"));
						return;
					}
					resolve(result);
				}, delayMs);

				signal.addEventListener("abort", () => {
					wasAborted = true;
					clearTimeout(timer);
					reject(new Error("aborted"));
				}, { once: true });
			}),
		aborted: () => wasAborted,
	};
}

describe("텍스트 파싱 동시 경쟁 (first-success-wins)", () => {
	it("가장 빠른 성공 응답을 반환한다", async () => {
		const successResult: UnifiedParseResponse = {
			success: true,
			intent: "transaction",
			transactions: [{
				date: "2026-03-17",
				type: "expense",
				category: "식비",
				description: "CU",
				amount: 3500,
			}],
			accounts: [],
		};

		const slowTask = createDelayedTask("slow", 200, successResult);
		const fastTask = createDelayedTask("fast", 10, successResult);

		const result = await raceFirstSuccess([slowTask, fastTask]);
		expect(result.success).toBe(true);
	});

	it("빠른 실패를 무시하고 느린 성공을 반환한다", async () => {
		const failResult: UnifiedParseResponse = {
			success: false,
			error: "파싱 실패: fetch failed",
		};
		const successResult: UnifiedParseResponse = {
			success: true,
			intent: "transaction",
			transactions: [{
				date: "2026-03-17",
				type: "expense",
				category: "카페",
				description: "스타벅스",
				amount: 5500,
			}],
			accounts: [],
		};

		const fastFail = createDelayedTask("fast-fail", 5, failResult);
		const slowSuccess = createDelayedTask("slow-success", 50, successResult);

		const result = await raceFirstSuccess([fastFail, slowSuccess]);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.transactions[0].description).toBe("스타벅스");
		}
	});

	it("승자 결정 후 패자의 abort signal이 발동된다", async () => {
		const successResult: UnifiedParseResponse = {
			success: true,
			intent: "transaction",
			transactions: [{
				date: "2026-03-17",
				type: "expense",
				category: "식비",
				description: "김밥천국",
				amount: 7000,
			}],
			accounts: [],
		};

		const fastWinner = createDelayedTask("winner", 10, successResult);
		const slowLoser = createDelayedTask("loser", 500, successResult);

		const result = await raceFirstSuccess([fastWinner, slowLoser]);
		expect(result.success).toBe(true);

		// abort가 비동기로 처리될 수 있으므로 짧은 대기
		await new Promise((r) => setTimeout(r, 20));
		expect(slowLoser.aborted()).toBe(true);
	});

	it("모든 provider 실패 시 마지막 에러를 반환한다", async () => {
		const fail1: UnifiedParseResponse = { success: false, error: "파싱 실패: fetch failed" };
		const fail2: UnifiedParseResponse = { success: false, error: "파싱 실패: 429 rate limit" };

		const task1 = createDelayedTask("a", 10, fail1);
		const task2 = createDelayedTask("b", 20, fail2);

		const result = await raceFirstSuccess([task1, task2]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("429");
		}
	});

	it("단일 provider는 레이스 없이 직접 호출한다", async () => {
		const successResult: UnifiedParseResponse = {
			success: true,
			intent: "account",
			transactions: [],
			accounts: [{
				name: "카카오뱅크",
				type: "asset",
				subType: "bank",
				icon: "🏦",
				balance: 1500000,
			}],
		};

		const task = createDelayedTask("solo", 10, successResult);
		const result = await raceFirstSuccess([task]);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.accounts[0].name).toBe("카카오뱅크");
		}
	});

	it("provider가 없으면 즉시 실패를 반환한다", async () => {
		const result = await raceFirstSuccess([]);
		expect(result.success).toBe(false);
	});

	it("throw하는 task도 catch되어 실패로 처리된다", async () => {
		const throwTask = {
			name: "thrower",
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			run: async (_signal: AbortSignal): Promise<UnifiedParseResponse> => {
				throw new Error("unexpected error");
			},
		};
		const successResult: UnifiedParseResponse = {
			success: true,
			intent: "transaction",
			transactions: [{
				date: "2026-03-17",
				type: "expense",
				category: "식비",
				description: "CU",
				amount: 3500,
			}],
			accounts: [],
		};

		// 2개 이상의 task에서 throw가 발생해도 catch로 흡수
		const slowSuccess = createDelayedTask("slow", 30, successResult);
		const result = await raceFirstSuccess([throwTask, slowSuccess]);
		expect(result.success).toBe(true);
	});

	it("빠른 throw + 느린 성공 조합에서 성공을 반환한다", async () => {
		const throwTask = {
			name: "thrower",
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			run: async (_signal: AbortSignal): Promise<UnifiedParseResponse> => {
				throw new Error("network error");
			},
		};
		const successResult: UnifiedParseResponse = {
			success: true,
			intent: "transaction",
			transactions: [{
				date: "2026-03-17",
				type: "income",
				category: "급여",
				description: "3월 급여",
				amount: 3000000,
			}],
			accounts: [],
		};
		const slowSuccess = createDelayedTask("slow", 30, successResult);

		const result = await raceFirstSuccess([throwTask, slowSuccess]);
		expect(result.success).toBe(true);
	});
});
