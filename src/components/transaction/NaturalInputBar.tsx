"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseTransactionInput } from "@/server/actions/parse";
import type { ParsedTransaction } from "@/server/llm/types";

interface NaturalInputBarProps {
	onParsed: (items: ParsedTransaction[], originalInput: string) => void;
}

export function NaturalInputBar({ onParsed }: NaturalInputBarProps) {
	const [input, setInput] = useState("");
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// 입력 내용에 따라 textarea 높이 자동 조절
	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "0";
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
	}, [input]);

	const handleSubmit = useCallback(() => {
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
	}, [input, isPending, onParsed]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.nativeEvent.isComposing) {
			if (e.shiftKey) return; // Shift+Enter: 줄바꿈
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div className="fixed bottom-14 left-0 right-0 z-30 border-t border-border bg-background/90 backdrop-blur-lg md:bottom-0">
			<div className="mx-auto flex max-w-lg items-end gap-2 px-3 py-2">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						if (error) setError(null);
					}}
					onKeyDown={handleKeyDown}
					placeholder="점심 김치찌개 9000, 커피 4500"
					className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
					rows={1}
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
