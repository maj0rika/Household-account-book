"use client";

import { useState, useEffect, useRef } from "react";

import { NaturalInputBar } from "@/components/transaction/NaturalInputBar";
import { ParseResultSheet } from "@/components/transaction/ParseResultSheet";
import { AccountParseResultSheet } from "@/components/assets/AccountParseResultSheet";
import { getUserCategories } from "@/server/actions/transaction";
import { getAccounts } from "@/server/actions/account";
import type { UnifiedParseResult, ParsedTransaction, ParsedAccount } from "@/server/llm/types";
import type { Category, Account } from "@/types";

export function UnifiedInputSection() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [existingAccounts, setExistingAccounts] = useState<Account[]>([]);

	// 거래 결과 시트
	const [txSheetOpen, setTxSheetOpen] = useState(false);
	const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
	const [originalInput, setOriginalInput] = useState("");

	// 자산 결과 시트
	const [accountSheetOpen, setAccountSheetOpen] = useState(false);
	const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
	const [deferAccountSheet, setDeferAccountSheet] = useState(false);
	const [splitMeta, setSplitMeta] = useState<{ transactionCount: number; accountCount: number } | null>(null);

	// 초기 데이터 로드
	useEffect(() => {
		getUserCategories().then((cats) => setCategories(cats as Category[]));
		getAccounts().then((accs) => setExistingAccounts(accs));
	}, []);

	// 시트 닫힐 때 데이터 갱신 (useEffect로 분리하여 렌더 중 setState 방지)
	const prevTxOpen = useRef(txSheetOpen);
	const prevAccountOpen = useRef(accountSheetOpen);

	useEffect(() => {
		if (prevTxOpen.current && !txSheetOpen) {
			getAccounts().then((accs) => setExistingAccounts(accs));
			getUserCategories().then((cats) => setCategories(cats as Category[]));

			// 혼합 입력이면 거래 시트 저장/닫기 후 자산 시트를 이어서 보여줌
			if (deferAccountSheet && parsedAccounts.length > 0) {
				setAccountSheetOpen(true);
				setDeferAccountSheet(false);
			}
		}
		prevTxOpen.current = txSheetOpen;
	}, [txSheetOpen, deferAccountSheet, parsedAccounts.length]);

	useEffect(() => {
		if (prevAccountOpen.current && !accountSheetOpen) {
			getAccounts().then((accs) => setExistingAccounts(accs));
		}
		prevAccountOpen.current = accountSheetOpen;
	}, [accountSheetOpen]);

	const handleParsed = (result: UnifiedParseResult, input: string) => {
		setOriginalInput(input);

		const transactionCount = result.transactions.length;
		const accountCount = result.accounts.length;
		const hasTransactions = transactionCount > 0;
		const hasAccounts = accountCount > 0;

		setSplitMeta(hasTransactions && hasAccounts ? { transactionCount, accountCount } : null);

		if (hasTransactions) {
			setParsedTransactions(result.transactions);
			setTxSheetOpen(true);
		}

		if (hasAccounts) {
			setParsedAccounts(result.accounts);
			if (hasTransactions) {
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
