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
		}
		prevTxOpen.current = txSheetOpen;
	}, [txSheetOpen]);

	useEffect(() => {
		if (prevAccountOpen.current && !accountSheetOpen) {
			getAccounts().then((accs) => setExistingAccounts(accs));
		}
		prevAccountOpen.current = accountSheetOpen;
	}, [accountSheetOpen]);

	const handleParsed = (result: UnifiedParseResult, input: string) => {
		setOriginalInput(input);

		if (result.intent === "account" && result.accounts.length > 0) {
			setParsedAccounts(result.accounts);
			setAccountSheetOpen(true);
		} else if (result.transactions.length > 0) {
			setParsedTransactions(result.transactions);
			setTxSheetOpen(true);
		}

		// 혼합 결과
		if (result.intent === "transaction" && result.accounts.length > 0) {
			setParsedAccounts(result.accounts);
			setAccountSheetOpen(true);
		}
		if (result.intent === "account" && result.transactions.length > 0) {
			setParsedTransactions(result.transactions);
			setTxSheetOpen(true);
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
			/>
			<AccountParseResultSheet
				open={accountSheetOpen}
				onOpenChange={setAccountSheetOpen}
				items={parsedAccounts}
				existingAccounts={existingAccounts}
			/>
		</>
	);
}
