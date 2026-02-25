"use client";

import { useState } from "react";

import { NaturalInputBar } from "@/components/transaction/NaturalInputBar";
import { ParseResultSheet } from "@/components/transaction/ParseResultSheet";
import type { ParsedTransaction } from "@/server/llm/types";
import type { Category } from "@/types";

interface TransactionInputSectionProps {
	categories: Category[];
}

export function TransactionInputSection({ categories }: TransactionInputSectionProps) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const [parsedItems, setParsedItems] = useState<ParsedTransaction[]>([]);
	const [originalInput, setOriginalInput] = useState("");

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
		</>
	);
}
