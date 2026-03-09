"use client";

import { useState, useEffect, useRef } from "react";

import { NaturalInputBar } from "@/components/transaction/NaturalInputBar";
import { ParseResultSheet } from "@/components/transaction/ParseResultSheet";
import { AccountParseResultSheet } from "@/components/assets/AccountParseResultSheet";
import { SettlementTransferParseResultSheet } from "@/components/settlement/SettlementTransferParseResultSheet";
import { getUserCategories } from "@/server/actions/transaction";
import { getAccounts } from "@/server/actions/account";
import type {
	UnifiedParseResult,
	ParsedTransaction,
	ParsedAccount,
	ParsedSettlementTransfer,
} from "@/server/llm/types";
import type { Category, Account } from "@/types";

interface UnifiedInputSectionProps {
	initialCategories: Category[];
	initialAccounts: Account[];
}

export function UnifiedInputSection({
	initialCategories,
	initialAccounts,
}: UnifiedInputSectionProps) {
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
	const [transferSheetOpen, setTransferSheetOpen] = useState(false);
	const [parsedSettlementTransfers, setParsedSettlementTransfers] = useState<ParsedSettlementTransfer[]>([]);
	const [deferTransferSheet, setDeferTransferSheet] = useState(false);
	const [splitMeta, setSplitMeta] = useState<{
		transactionCount: number;
		accountCount: number;
		transferCount: number;
	} | null>(null);

	// 시트 닫힐 때 데이터 갱신 (useEffect로 분리하여 렌더 중 setState 방지)
	const prevTxOpen = useRef(txSheetOpen);
	const prevAccountOpen = useRef(accountSheetOpen);
	const prevTransferOpen = useRef(transferSheetOpen);

	useEffect(() => {
		let mounted = true;

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

			// 혼합 입력이면 거래 시트 저장/닫기 후 자산 시트를 이어서 보여줌
			if (deferAccountSheet && parsedAccounts.length > 0) {
				setAccountSheetOpen(true);
				setDeferAccountSheet(false);
			} else if (deferTransferSheet && parsedSettlementTransfers.length > 0) {
				setTransferSheetOpen(true);
				setDeferTransferSheet(false);
			}
		}
		prevTxOpen.current = txSheetOpen;

		return () => {
			mounted = false;
		};
	}, [txSheetOpen, deferAccountSheet, deferTransferSheet, parsedAccounts.length, parsedSettlementTransfers.length]);

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

			if (deferTransferSheet && parsedSettlementTransfers.length > 0) {
				setTransferSheetOpen(true);
				setDeferTransferSheet(false);
			}
		}
		prevAccountOpen.current = accountSheetOpen;

		return () => {
			mounted = false;
		};
	}, [accountSheetOpen, deferTransferSheet, parsedSettlementTransfers.length]);

	useEffect(() => {
		let mounted = true;

		if (prevTransferOpen.current && !transferSheetOpen) {
			void (async () => {
				try {
					const accs = await getAccounts();
					if (!mounted) return;
					setExistingAccounts(accs);
				} catch (error) {
					console.error("[UnifiedInputSection] 정산 이력 시트 종료 후 동기화 실패", error);
				}
			})();
		}
		prevTransferOpen.current = transferSheetOpen;

		return () => {
			mounted = false;
		};
	}, [transferSheetOpen]);

	const handleParsed = (result: UnifiedParseResult, input: string) => {
		setOriginalInput(input);

		const transactionCount = result.transactions.length;
		const accountCount = result.accounts.length;
		const transferCount = result.settlementTransfers.length;
		const hasTransactions = transactionCount > 0;
		const hasAccounts = accountCount > 0;
		const hasTransfers = transferCount > 0;

		const activePaneCount = [hasTransactions, hasAccounts, hasTransfers].filter(Boolean).length;
		setSplitMeta(activePaneCount > 1 ? { transactionCount, accountCount, transferCount } : null);

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

		if (hasTransfers) {
			setParsedSettlementTransfers(result.settlementTransfers);
			if (hasTransactions || hasAccounts) {
				setDeferTransferSheet(true);
				setTransferSheetOpen(false);
			} else {
				setTransferSheetOpen(true);
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
			<SettlementTransferParseResultSheet
				open={transferSheetOpen}
				onOpenChange={setTransferSheetOpen}
				items={parsedSettlementTransfers}
				accounts={existingAccounts}
				splitMeta={splitMeta}
			/>
		</>
	);
}
