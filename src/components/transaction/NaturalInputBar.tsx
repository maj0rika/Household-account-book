"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Send, Loader2, ImagePlus, X, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { parseUnifiedInput, parseUnifiedImageInput } from "@/server/actions/parse-unified";
import type { UnifiedParseResult } from "@/server/llm/types";

const PLACEHOLDER_HINTS = [
	"점심 김치찌개 9000, 커피 4500",
	"카드 결제 문자를 붙여넣어 보세요",
	"어제 택시비 15000원",
	"매달 15일 통신비 5만원 고정",
	"카카오뱅크 잔액 150만원",
	"신한카드 미결제 45만원",
	"스타벅스 아메리카노 4500",
	"현금 15만원, 적금 540만원",
	"월급 350만원",
	"학자금대출 1200만원",
	"그제 저녁 삼겹살 2만원",
	"카드 내역 이미지를 첨부해 보세요",
];

function AnimatedPlaceholder({ show }: { show: boolean }) {
	const [index, setIndex] = useState(0);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setIndex(Math.floor(Math.random() * PLACEHOLDER_HINTS.length));
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!show || !mounted) return;
		const interval = setInterval(() => {
			setIndex((prev) => (prev + 1) % PLACEHOLDER_HINTS.length);
		}, 2500);
		return () => clearInterval(interval);
	}, [show, mounted]);

	if (!show || !mounted) return null;

	return (
		<div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-3">
			<AnimatePresence mode="wait">
				<motion.span
					key={index}
					className="truncate text-sm text-muted-foreground"
					initial={{ y: 14, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -14, opacity: 0 }}
					transition={{ duration: 0.25, ease: "easeInOut" }}
				>
					{PLACEHOLDER_HINTS[index]}
				</motion.span>
			</AnimatePresence>
		</div>
	);
}

interface NaturalInputBarProps {
	onParsed: (result: UnifiedParseResult, originalInput: string) => void;
}

interface ParseSubmission {
	input: string;
	imageData: { base64: string; mimeType: string } | null;
}

function buildStatusStages(isLongTask: boolean): string[] {
	if (isLongTask) {
		return [
			"AI가 입력을 읽고 있어요...",
			"거래/자산 항목을 정리 중이에요...",
			"중복 여부와 날짜를 검증 중이에요...",
			"거의 완료됐어요. 결과를 마무리 중이에요...",
		];
	}

	return [
		"AI가 빠르게 분석 중이에요...",
		"결과를 정리 중이에요...",
		"검증 후 곧 보여드릴게요...",
	];
}

const DRAFT_STORAGE_KEY = "draft-natural-input";

export function NaturalInputBar({ onParsed }: NaturalInputBarProps) {
	const [input, setInput] = useState(() => {
		if (typeof window === "undefined") return "";
		return sessionStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
	});
	const [error, setError] = useState<string | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);

	const [isLoading, setIsLoading] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string>("");
	const [showLongHint, setShowLongHint] = useState(false);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const requestIdRef = useRef(0);
	const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const lastSubmissionRef = useRef<ParseSubmission | null>(null);

	const resizeTextarea = useCallback((el: HTMLTextAreaElement) => {
		if (!el.value.trim()) {
			el.style.height = "";
			return;
		}
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
	}, []);

	const stopStatusTicker = useCallback(() => {
		if (statusTimerRef.current) {
			clearInterval(statusTimerRef.current);
			statusTimerRef.current = null;
		}
		setStatusMessage("");
		setShowLongHint(false);
	}, []);

	const startStatusTicker = useCallback((isLongTask: boolean) => {
		const stages = buildStatusStages(isLongTask);
		let index = 0;
		setStatusMessage(stages[0]);
		setShowLongHint(isLongTask);

		if (statusTimerRef.current) {
			clearInterval(statusTimerRef.current);
		}

		statusTimerRef.current = setInterval(() => {
			index = Math.min(index + 1, stages.length - 1);
			setStatusMessage(stages[index]);
		}, 2800);
	}, []);

	const clearImage = useCallback(() => {
		setImagePreview(null);
		setImageData(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

	const executeParse = useCallback(async (submission: ParseSubmission) => {
		const requestId = ++requestIdRef.current;
		const trimmedInput = submission.input.trim();
		const isLongTask = !!submission.imageData || trimmedInput.length > 100;

		lastSubmissionRef.current = submission;
		setError(null);
		setIsLoading(true);
		startStatusTicker(isLongTask);

		try {
			const result = submission.imageData
				? await parseUnifiedImageInput(
						submission.imageData.base64,
						submission.imageData.mimeType,
						submission.input,
					)
				: await parseUnifiedInput(submission.input);

			if (requestId !== requestIdRef.current) return;

			if (result.success) {
				onParsed(result, submission.input || "이미지 파싱");
				setInput("");
				sessionStorage.removeItem(DRAFT_STORAGE_KEY);
				clearImage();
				lastSubmissionRef.current = null;
				if (textareaRef.current) {
					textareaRef.current.value = "";
					resizeTextarea(textareaRef.current);
				}
			} else {
				setError(result.error);
			}
		} catch (e) {
			if (requestId !== requestIdRef.current) return;
			console.error("[NaturalInputBar] 파싱 요청 실패", e);
			setError("요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
		} finally {
			if (requestId === requestIdRef.current) {
				setIsLoading(false);
				stopStatusTicker();
			}
		}
	}, [onParsed, clearImage, resizeTextarea, startStatusTicker, stopStatusTicker]);

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setError("이미지 파일만 첨부할 수 있습니다.");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			setError("이미지 크기는 5MB 이하여야 합니다.");
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			setImagePreview(result);
			const base64 = result.split(",")[1];
			setImageData({ base64, mimeType: file.type });
			setError(null);
		};
		reader.readAsDataURL(file);
	};

	const handleSubmit = useCallback(() => {
		if ((!input.trim() && !imageData) || isLoading) return;
		void executeParse({ input, imageData });
	}, [input, imageData, isLoading, executeParse]);

	const handleRetry = useCallback(() => {
		if (isLoading || !lastSubmissionRef.current) return;
		void executeParse(lastSubmissionRef.current);
	}, [isLoading, executeParse]);

	const handleCancel = useCallback(() => {
		if (!isLoading) return;
		requestIdRef.current += 1;
		setIsLoading(false);
		stopStatusTicker();
		setError("요청을 취소했어요. 필요하면 다시 시도해 주세요.");
	}, [isLoading, stopStatusTicker]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.nativeEvent.isComposing) {
			if (e.shiftKey) return;
			e.preventDefault();
			handleSubmit();
		}
	};

	useEffect(() => () => stopStatusTicker(), [stopStatusTicker]);

	const canRetry = !!error && !!lastSubmissionRef.current && !isLoading;

	return (
		<div className="fixed bottom-[calc(var(--bottom-nav-height)+0.25rem)] left-1/2 z-30 w-full max-w-lg -translate-x-1/2 px-3 md:bottom-4">
			<motion.div
				className="rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur-xl"
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.35, ease: "easeOut" }}
			>
				<AnimatePresence>
					{isLoading && (
						<motion.div
							className="space-y-1 px-4 pt-2"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.2 }}
						>
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<Loader2 className="h-3 w-3 animate-spin text-primary" />
									<span className="text-xs text-muted-foreground">{statusMessage}</span>
								</div>
								<button
									type="button"
									onClick={handleCancel}
									className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
								>
									<Square className="h-2.5 w-2.5" />
									취소
								</button>
							</div>
							{showLongHint && (
								<p className="text-[11px] text-muted-foreground">
									긴 입력/이미지는 시간이 더 걸릴 수 있어요.
								</p>
							)}
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{imagePreview && (
						<motion.div
							className="relative mx-3 mt-2"
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ duration: 0.2 }}
						>
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
									className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm active:scale-90"
									disabled={isLoading}
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="flex items-center gap-2 px-3 py-2">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground active:scale-90"
						onClick={() => fileInputRef.current?.click()}
						disabled={isLoading}
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

					<div className="relative min-w-0 flex-1">
						<AnimatedPlaceholder show={!input && !isLoading} />
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => {
								const val = e.target.value;
								setInput(val);
								sessionStorage.setItem(DRAFT_STORAGE_KEY, val);
								resizeTextarea(e.target);
								if (error) setError(null);
							}}
							onKeyDown={handleKeyDown}
							className="block h-9 min-h-9 w-full resize-none rounded-md border border-input bg-transparent px-3 py-[7px] text-sm leading-5 shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
							rows={1}
							disabled={isLoading}
						/>
					</div>
					<motion.div className="shrink-0" whileTap={{ scale: 0.9 }}>
						<Button
							size="icon"
							onClick={handleSubmit}
							disabled={(!input.trim() && !imageData) || isLoading}
							className="h-9 w-9"
						>
							{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						</Button>
					</motion.div>
				</div>

				<AnimatePresence>
					{error && (
						<motion.div
							className="space-y-1 px-4 pb-2 text-center"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.2 }}
						>
							<p className="whitespace-pre-line text-xs text-destructive">{error}</p>
							{canRetry && (
								<button
									type="button"
									onClick={handleRetry}
									className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
								>
									같은 요청 다시 시도
								</button>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
}
