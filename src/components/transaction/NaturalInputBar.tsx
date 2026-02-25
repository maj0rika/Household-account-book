"use client";

import { useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTransactionInput } from "@/server/actions/parse";
import type { ParsedTransaction } from "@/server/llm/types";

interface NaturalInputBarProps {
	onParsed: (items: ParsedTransaction[], originalInput: string) => void;
}

export function NaturalInputBar({ onParsed }: NaturalInputBarProps) {
	const [input, setInput] = useState("");
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = () => {
		if (!input.trim() || isPending) return;

		setError(null);
		const currentInput = input;

		startTransition(async () => {
			const result = await parseTransactionInput(currentInput);
			if (result.success) {
				onParsed(result.transactions, currentInput);
				setInput("");
			} else {
				setError(result.error);
			}
		});
	};

	return (
		<div className="fixed bottom-14 left-0 right-0 z-30 border-t border-border bg-background/90 backdrop-blur-lg md:bottom-0">
			<div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2">
				<Input
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						if (error) setError(null);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.nativeEvent.isComposing) {
							handleSubmit();
						}
					}}
					placeholder="점심 김치찌개 9000, 커피 4500"
					className="flex-1 text-sm"
					disabled={isPending}
				/>
				<Button
					size="icon"
					onClick={handleSubmit}
					disabled={!input.trim() || isPending}
					className="shrink-0"
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</Button>
			</div>
			{error && (
				<p className="px-4 pb-2 text-center text-xs text-destructive">{error}</p>
			)}
		</div>
	);
}
