"use client";

import { useState, useEffect, useRef } from "react";

import { NaturalInputBar } from "@/components/transaction/NaturalInputBar";
import { ParseResultSheet } from "@/components/transaction/ParseResultSheet";
import { AccountParseResultSheet } from "@/components/assets/AccountParseResultSheet";
import { getUserCategories } from "@/server/actions/transaction";
import { getAccounts } from "@/server/actions/account";
import type { UnifiedParseResult, ParsedTransaction, ParsedAccount } from "@/server/llm/types";
import type { Category, Account } from "@/types";

interface UnifiedInputSectionProps {
	initialCategories: Category[];
	initialAccounts: Account[];
}

export function UnifiedInputSection({
	initialCategories,
	initialAccounts,
}: UnifiedInputSectionProps) {
	// 자연어/이미지 입력 결과를 거래 시트와 자산 시트로 분기하는
	// 최상위 오케스트레이션 컴포넌트다.
	const [categories, setCategories] = useState<Category[]>(initialCategories);
	const [existingAccounts, setExistingAccounts] = useState<Account[]>(initialAccounts);

	// 거래 결과 시트
	const [txSheetOpen, setTxSheetOpen] = useState(false);
	const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
	const [originalInput, setOriginalInput] = useState("");

	// 자산 결과 시트
	const [accountSheetOpen, setAccountSheetOpen] = useState(false);
	const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
	const [deferAccountSheet, setDeferAccountSheet] = useState(false);
	const [splitMeta, setSplitMeta] = useState<{ transactionCount: number; accountCount: number } | null>(null);

	// 시트 닫힐 때 데이터 갱신 (useEffect로 분리하여 렌더 중 setState 방지)
	const prevTxOpen = useRef(txSheetOpen);
	const prevAccountOpen = useRef(accountSheetOpen);

	// 서버 액션 이후 레이아웃에서 최신 초기값이 다시 내려오면
	// 전역 입력 시트도 같은 스냅샷을 사용하도록 동기화한다.
	useEffect(() => {
		setCategories(initialCategories);
	}, [initialCategories]);

	useEffect(() => {
		setExistingAccounts(initialAccounts);
	}, [initialAccounts]);

	// [라이프사이클: 거래 시트 종료 후 동기화]
	// 거래 입력 시트가 닫힐 때 최신 카테고리/계좌 목록을 다시 불러옵니다.
	// 특히 '혼합 입력'인 경우, 거래 시트가 닫히면 바로 이어서 자산 시트를 엽니다.
	useEffect(() => {
		let mounted = true;

		// 시트가 열려있다가(prev) 닫혔을 때(!txSheetOpen)만 실행
		if (prevTxOpen.current && !txSheetOpen) {
			void (async () => {
				try {
					const [accs, cats] = await Promise.all([
						getAccounts(),
						getUserCategories(),
					]);
					if (!mounted) return;
					setExistingAccounts(accs);
					setCategories(cats);
				} catch (error) {
					console.error("[UnifiedInputSection] 거래 시트 종료 후 동기화 실패", error);
				}
			})();

			// 거래 저장으로 서버 상태가 바뀔 수 있으므로 시트 종료 직후 스냅샷을 다시 맞춘다.
			// 혼합 입력이면 같은 입력 결과에 포함된 자산 시트를 이어서 열어 후속 단계를 연결한다.
			// 혼합 입력 시 거래 저장/닫기 후 자산 시트 이어서 표시
			if (deferAccountSheet && parsedAccounts.length > 0) {
				setAccountSheetOpen(true);
				setDeferAccountSheet(false);
			}
		}
		prevTxOpen.current = txSheetOpen;

		return () => {
			mounted = false;
		};
	}, [txSheetOpen, deferAccountSheet, parsedAccounts.length]);

	useEffect(() => {
		let mounted = true;

		// 자산 시트는 거래 시트처럼 카테고리를 바꾸진 않지만
		// 계좌 생성/수정 결과는 다음 입력 즉시 반영되어야 하므로 계좌 목록만 재동기화한다.
		if (prevAccountOpen.current && !accountSheetOpen) {
			void (async () => {
				try {
					const accs = await getAccounts();
					if (!mounted) return;
					setExistingAccounts(accs);
				} catch (error) {
					console.error("[UnifiedInputSection] 자산 시트 종료 후 동기화 실패", error);
				}
			})();
		}
		prevAccountOpen.current = accountSheetOpen;

		return () => {
			mounted = false;
		};
	}, [accountSheetOpen]);

	// 분석 결과에 따라 거래/자산 시트 또는 둘 다(혼합)를 열지 결정
	const handleParsed = (result: UnifiedParseResult, input: string) => {
		setOriginalInput(input);

		const transactionCount = result.transactions.length;
		const accountCount = result.accounts.length;
		const hasTransactions = transactionCount > 0;
		const hasAccounts = accountCount > 0;

		// 혼합 입력 여부를 저장하여 시트에 가이드 문구 표시용으로 사용
		// 단일 입력창의 결과를 거래 시트 상태와 자산 시트 상태로 분해해
		// 이후 UI 전이를 부모 오케스트레이터가 순차적으로 예약한다.
		setSplitMeta(hasTransactions && hasAccounts ? { transactionCount, accountCount } : null);

		if (hasTransactions) {
			// 거래가 하나라도 있으면 항상 거래 시트를 먼저 열어
			// 사용자가 저장 순서를 예측 가능하게 유지한다.
			setParsedTransactions(result.transactions);
			setTxSheetOpen(true);
		}

		if (hasAccounts) {
			setParsedAccounts(result.accounts);
			if (hasTransactions) {
				// 거래+자산 혼합: 거래 먼저 처리 후 자산 시트 지연 오픈
				setDeferAccountSheet(true);
				setAccountSheetOpen(false);
			} else {
				setAccountSheetOpen(true);
			}
		}
	};

	return (
		<>
			<NaturalInputBar onParsed={handleParsed} />
			<ParseResultSheet
				open={txSheetOpen}
				onOpenChange={setTxSheetOpen}
				items={parsedTransactions}
				originalInput={originalInput}
				categories={categories}
				accounts={existingAccounts}
				splitMeta={splitMeta}
			/>
			<AccountParseResultSheet
				open={accountSheetOpen}
				onOpenChange={setAccountSheetOpen}
				items={parsedAccounts}
				existingAccounts={existingAccounts}
				splitMeta={splitMeta}
			/>
		</>
	);
}
