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
		setSplitMeta(hasTransactions && hasAccounts ? { transactionCount, accountCount } : null);

		if (hasTransactions) {
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
