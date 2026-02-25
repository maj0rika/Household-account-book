"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Send, Loader2, ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseTransactionInput, parseTransactionImageInput } from "@/server/actions/parse";
import type { ParsedTransaction } from "@/server/llm/types";

const PLACEHOLDER_HINTS = [
	"점심 김치찌개 9000, 커피 4500",
	"카드 결제 문자를 붙여넣어 보세요",
	"어제 택시비 15000원",
	"매달 15일 통신비 5만원 고정",
	"스타벅스 아메리카노 4500",
	"이번달 월세 50만원 고정",
	"카드 내역 이미지를 첨부해 보세요",
	"3만원 마트 장보기",
	"월급 350만원",
	"넷플릭스 17000 매달 고정",
	"그제 저녁 삼겹살 2만원",
	"교통비 1450원",
];

function getRandomPlaceholder(): string {
	return PLACEHOLDER_HINTS[Math.floor(Math.random() * PLACEHOLDER_HINTS.length)];
}

interface NaturalInputBarProps {
	onParsed: (items: ParsedTransaction[], originalInput: string) => void;
}

export function NaturalInputBar({ onParsed }: NaturalInputBarProps) {
	const [input, setInput] = useState("");
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [placeholder, setPlaceholder] = useState("");
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 마운트 시 랜덤 플레이스홀더 설정
	useEffect(() => {
		setPlaceholder(getRandomPlaceholder());
	}, []);

	const resizeTextarea = useCallback((el: HTMLTextAreaElement) => {
		if (!el.value.trim()) {
			el.style.height = "";
			return;
		}
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
	}, []);

	const clearImage = () => {
		setImagePreview(null);
		setImageData(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setError("이미지 파일만 첨부할 수 있습니다.");
			return;
		}

		// 5MB 제한
		if (file.size > 5 * 1024 * 1024) {
			setError("이미지 크기는 5MB 이하여야 합니다.");
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			setImagePreview(result);
			// data:image/jpeg;base64,... 에서 base64 부분만 추출
			const base64 = result.split(",")[1];
			setImageData({ base64, mimeType: file.type });
			setError(null);
		};
		reader.readAsDataURL(file);
	};

	const handleSubmit = useCallback(() => {
		if ((!input.trim() && !imageData) || isPending) return;

		setError(null);
		const currentInput = input;

		startTransition(async () => {
			let result;

			if (imageData) {
				result = await parseTransactionImageInput(
					imageData.base64,
					imageData.mimeType,
					currentInput,
				);
			} else {
				result = await parseTransactionInput(currentInput);
			}

			if (result.success) {
				onParsed(result.transactions, currentInput || "이미지 파싱");
				setInput("");
				clearImage();
				setPlaceholder(getRandomPlaceholder());
				if (textareaRef.current) {
					textareaRef.current.value = "";
					resizeTextarea(textareaRef.current);
				}
			} else {
				setError(result.error);
			}
		});
	}, [input, imageData, isPending, onParsed, resizeTextarea]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.nativeEvent.isComposing) {
			if (e.shiftKey) return;
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div className="fixed bottom-16 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 px-3 md:bottom-4">
			<div className="rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur-lg">
				{/* 이미지 미리보기 */}
				{imagePreview && (
					<div className="relative mx-3 mt-2">
						<div className="relative h-20 w-20">
						<Image
							src={imagePreview}
							alt="첨부 이미지"
							fill
							className="rounded-lg border border-border object-cover"
							unoptimized
						/>
						<button
							type="button"
							onClick={clearImage}
							className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm"
						>
							<X className="h-3 w-3" />
						</button>
						</div>
					</div>
				)}

				<div className="flex items-end gap-2 px-3 py-2">
					{/* 이미지 첨부 버튼 */}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
						onClick={() => fileInputRef.current?.click()}
						disabled={isPending}
					>
						<ImagePlus className="h-4 w-4" />
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleImageSelect}
					/>

					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => {
							setInput(e.target.value);
							resizeTextarea(e.target);
							if (error) setError(null);
						}}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
						rows={1}
						disabled={isPending}
					/>
					<Button
						size="icon"
						onClick={handleSubmit}
						disabled={(!input.trim() && !imageData) || isPending}
						className="shrink-0"
					>
						{isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
					</Button>
				</div>
				{error && <p className="px-4 pb-2 text-center text-xs text-destructive">{error}</p>}
			</div>
		</div>
	);
}
