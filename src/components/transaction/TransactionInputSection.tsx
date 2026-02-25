"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { NaturalInputBar } from "@/components/transaction/NaturalInputBar";
import { ParseResultSheet } from "@/components/transaction/ParseResultSheet";
import { ManualInputDialog } from "@/components/transaction/ManualInputDialog";
import type { ParsedTransaction } from "@/server/llm/types";

export function TransactionInputSection() {
	const searchParams = useSearchParams();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [manualOpen, setManualOpen] = useState(false);
	const [parsedItems, setParsedItems] = useState<ParsedTransaction[]>([]);
	const [originalInput, setOriginalInput] = useState("");

	// URL ?manual=true 로 진입 시 수동 입력 다이얼로그 표시
	useEffect(() => {
		if (searchParams.get("manual") === "true") {
			setManualOpen(true);
		}
	}, [searchParams]);

	const handleParsed = (items: ParsedTransaction[], input: string) => {
		setParsedItems(items);
		setOriginalInput(input);
		setSheetOpen(true);
	};

	return (
		<>
			<NaturalInputBar onParsed={handleParsed} />
			<ParseResultSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				items={parsedItems}
				originalInput={originalInput}
			/>
			<ManualInputDialog open={manualOpen} onOpenChange={setManualOpen} />
		</>
	);
}
