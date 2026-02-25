"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { NaturalInputBar } from "@/components/transaction/NaturalInputBar";
import { ParseResultSheet } from "@/components/transaction/ParseResultSheet";
import { ManualInputDialog } from "@/components/transaction/ManualInputDialog";
import type { ParsedTransaction } from "@/server/llm/types";
import type { Category } from "@/types";

interface TransactionInputSectionProps {
	categories: Category[];
}

export function TransactionInputSection({ categories }: TransactionInputSectionProps) {
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
			<div aria-hidden="true" className="h-40 md:h-32" />
			<NaturalInputBar onParsed={handleParsed} />
			<ParseResultSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				items={parsedItems}
				originalInput={originalInput}
				categories={categories}
			/>
			<ManualInputDialog open={manualOpen} onOpenChange={setManualOpen} />
		</>
	);
}
