"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import Image from "next/image";
import { Send, Loader2, ImagePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import type { UnifiedParseResponse, UnifiedParseResult } from "@/server/llm/types";

// 자연어 입력 예시 힌트 (다양한 시나리오 포함)
const PLACEHOLDER_HINTS = [
	"점심 김치찌개 9000, 커피 4500",
	"쿠팡 장보기 38200",
	"국민카드 결제 취소 23000원",
	"어제 택시비 15000원",
	"매달 15일 통신비 5만원 고정",
	"카카오뱅크 잔액 150만원",
	"신한카드 미결제 45만원",
	"배당금 12만원 입금",
	"현금 15만원, 적금 540만원",
	"당근 판매 3만원 들어옴",
	"학자금대출 1200만원",
	"카드 내역 이미지를 첨부해 보세요",
];

// 빈 입력창에 힌트를 순차 롤링하는 애니메이션 컴포넌트
function AnimatedPlaceholder({ show }: { show: boolean }) {
	const [index, setIndex] = useState(0);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		// 마운트 시 랜덤 인덱스로 시작
		setIndex(Math.floor(Math.random() * PLACEHOLDER_HINTS.length));
		setMounted(true);
	}, []);

	useEffect(() => {
		// 2.5초마다 다음 힌트로 롤링 (언마운트 시 clearInterval)
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

// 서버 /api/parse 호출 (AbortSignal로 취소 지원)
async function requestUnifiedParse(
	submission: ParseSubmission,
	signal: AbortSignal,
): Promise<UnifiedParseResponse> {
	const response = await fetch("/api/parse", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			input: submission.input,
			imageBase64: submission.imageData?.base64 ?? undefined,
			mimeType: submission.imageData?.mimeType ?? undefined,
		}),
		signal,
	});

	const text = await response.text();
	if (!text) {
		throw new Error("파싱 응답이 비어 있습니다.");
	}

	try {
		return JSON.parse(text) as UnifiedParseResponse;
	} catch {
		console.error("[NaturalInputBar] JSON 파싱 실패", {
			status: response.status,
			bodyPreview: text.slice(0, 300),
		});
		throw new Error("파싱 응답 형식을 읽지 못했습니다.");
	}
}

// 로딩 중 단계별 상태 메시지 (이미지 포함 시 단계 추가)
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
const SUPPORTED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// 파일을 base64 Data URL로 변환
function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("이미지 읽기에 실패했습니다."));
		reader.readAsDataURL(file);
	});
}

// 클라이언트 JPEG 압축 — maxDim 리사이즈 + quality 조절로 전송 비용 절감
async function compressToJpeg(dataUrl: string, maxDim = 1600, quality = 0.82): Promise<string> {
	const img = await new Promise<HTMLImageElement>((resolve, reject) => {
		const i = new window.Image();
		i.onload = () => resolve(i);
		i.onerror = () => reject(new Error("이미지 디코딩에 실패했습니다."));
		i.src = dataUrl;
	});
	const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
	const width = Math.max(1, Math.round(img.width * scale));
	const height = Math.max(1, Math.round(img.height * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("이미지 변환 컨텍스트를 생성하지 못했습니다.");

	ctx.drawImage(img, 0, 0, width, height);
	return canvas.toDataURL("image/jpeg", quality);
}

export function NaturalInputBar({ onParsed }: NaturalInputBarProps) {
	const [input, setInput] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);

	const [isLoading, setIsLoading] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string>("");
	const [showLongHint, setShowLongHint] = useState(false);
	const inputId = useId();
	const hintId = useId();

	// [참조 관리]
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	// requestIdRef: 빠른 연속 클릭이나 중복 요청 발생 시, 늦게 온 응답을 무시하기 위한 고유 ID입니다.
	const requestIdRef = useRef(0);
	const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const lastSubmissionRef = useRef<ParseSubmission | null>(null);
	const requestAbortRef = useRef<AbortController | null>(null);

	// textarea 높이 자동 조정 (최대 120px)
	const resizeTextarea = useCallback((el: HTMLTextAreaElement) => {
		if (!el.value.trim()) {
			el.style.height = "";
			return;
		}
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
	}, []);

	// [Life Cycle] 마운트 시 브라우저 세션에 저장된 '작성 중인 글'을 복원합니다.
	useEffect(() => {
		const draft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
		if (!draft) return;

		setInput(draft);
		if (textareaRef.current) {
			textareaRef.current.value = draft;
			resizeTextarea(textareaRef.current);
		}
	}, [resizeTextarea]);

	// 상태 메시지 타이머 중단 + 초기화
	const stopStatusTicker = useCallback(() => {
		if (statusTimerRef.current) {
			clearInterval(statusTimerRef.current);
			statusTimerRef.current = null;
		}
		setStatusMessage("");
		setShowLongHint(false);
	}, []);

	// 2.8초 간격으로 로딩 상태 메시지 롤테이션
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

	// 첨부 이미지 삭제 (preview + data 초기화, input value 리셋)
	const clearImage = useCallback(() => {
		setImagePreview(null);
		setImageData(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

	// 파싱 실행 — requestId 증가 + 이전 요청 abort + API 호출
	const executeParse = useCallback(async (submission: ParseSubmission) => {
		// 새 요청을 현재 요청으로 승격하고 이전 요청은 취소한다.
		// 성공 시 결과 전달과 draft 정리를, 실패 시 최신 요청 기준 에러 상태 갱신을 담당한다.
		const requestId = ++requestIdRef.current;
		const trimmedInput = submission.input.trim();
		const isLongTask = !!submission.imageData || trimmedInput.length > 100;

		lastSubmissionRef.current = submission;
		setError(null);
		setIsLoading(true);
		startStatusTicker(isLongTask);

		try {
			// 이전 진행 중인 요청이 있다면 취소하여 레이스 컨디션을 방지합니다.
			requestAbortRef.current?.abort();
			const controller = new AbortController();
			requestAbortRef.current = controller;

			const result = await requestUnifiedParse(submission, controller.signal);

			// 만약 이 응답이 오기 전에 다른 새로운 요청이 시작되었다면, 이 값은 버립니다.
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

			// 사용자가 직접 취소한 경우는 에러로 처리하지 않습니다.
			if (e instanceof Error && e.name === "AbortError") {
				return;
			}

			console.error("[NaturalInputBar] 파싱 요청 실패", e);
			setError("요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
		} finally {
			// 오래 걸린 이전 요청이 뒤늦게 끝나도 최신 요청의 로딩 상태를 덮어쓰지 않도록
			// 현재 최신 requestId를 가진 요청만 cleanup 권한을 가진다.
			if (requestAbortRef.current?.signal.aborted || requestId === requestIdRef.current) {
				requestAbortRef.current = null;
			}

			if (requestId === requestIdRef.current) {
				setIsLoading(false);
				stopStatusTicker();
			}
		}
	}, [onParsed, clearImage, resizeTextarea, startStatusTicker, stopStatusTicker]);

	// 이미지 선택 → 유효성 검사 + base64 변환 + 클라이언트 압축
	const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setError("이미지 파일만 첨부할 수 있습니다.");
			return;
		}

		if (file.size > 12 * 1024 * 1024) {
			setError("이미지 크기는 12MB 이하여야 합니다.");
			return;
		}

		try {
			let dataUrl = await readFileAsDataUrl(file);
			let mimeType = file.type;

			// 모델 입력 제한 및 네트워크 최적화를 위해 클라이언트 사이드 압축 수행
			const shouldConvert = !SUPPORTED_IMAGE_MIME.has(file.type) || file.size > 1.5 * 1024 * 1024;
			if (shouldConvert) {
				dataUrl = await compressToJpeg(dataUrl, 1600, 0.82);
				mimeType = "image/jpeg";
			}

			let base64 = dataUrl.split(",")[1] ?? "";

			// 압축 후에도 너무 크면 품질을 더 낮춰 재압축
			if (base64.length > 2_600_000) {
				dataUrl = await compressToJpeg(dataUrl, 1280, 0.72);
				mimeType = "image/jpeg";
				base64 = dataUrl.split(",")[1] ?? "";
			}

			if (!base64) {
				setError("이미지 인코딩에 실패했습니다. 다른 이미지를 시도해 주세요.");
				return;
			}

			setImagePreview(dataUrl);
			setImageData({ base64, mimeType });
			setError(null);
		} catch (err) {
			console.error("[NaturalInputBar] 이미지 처리 실패", err);
			setError("이미지 처리 중 오류가 발생했습니다. JPG/PNG 이미지로 다시 시도해 주세요.");
		}
	};

	// 전송 핸들러 — 텍스트/이미지 중 하나 이상 필요, 로딩 중 중복 차단
	const handleSubmit = useCallback(() => {
		if ((!input.trim() && !imageData) || isLoading) return;
		void executeParse({ input, imageData });
	}, [input, imageData, isLoading, executeParse]);

	// 재시도 — 마지막 submission 재사용
	const handleRetry = useCallback(() => {
		if (isLoading || !lastSubmissionRef.current) return;
		void executeParse(lastSubmissionRef.current);
	}, [isLoading, executeParse]);

	// 취소 — AbortController로 네트워크 요청 차단 + UI 초기화
	const handleCancel = useCallback(() => {
		if (!isLoading) return;
		requestIdRef.current += 1; // 이미 오고 있는 응답을 무시하게 함
		requestAbortRef.current?.abort();
		requestAbortRef.current = null;
		setIsLoading(false);
		stopStatusTicker();
		setError("요청을 취소했어요. 필요하면 다시 시도해 주세요.");
	}, [isLoading, stopStatusTicker]);

	// 엔터 전송 (isComposing 무시 + Shift+Enter 줄바꿈 허용)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.nativeEvent.isComposing) {
			if (e.shiftKey) return; // Shift+Enter는 줄바꿈
			e.preventDefault();
			handleSubmit();
		}
	};

	// 언마운트 시 요청·타이머 정리
	useEffect(() => () => {
		requestAbortRef.current?.abort();
		stopStatusTicker();
	}, [stopStatusTicker]);

	const canRetry = !!error && !!lastSubmissionRef.current && !isLoading;

	return (
		<div className="fixed bottom-[calc(var(--bottom-nav-height)+0.25rem)] left-1/2 z-30 w-full max-w-lg -translate-x-1/2 px-3 md:bottom-4">
			<motion.div
				className="rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur-xl"
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.35, ease: "easeOut" }}
			>
				{/* 로딩 스테이터스 표시부 */}
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
									aria-label="파싱 요청 취소"
									className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
								>
									<X className="h-3 w-3" />
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

				{/* 이미지 미리보기 */}
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
									aria-label="첨부 이미지 제거"
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
					{/* 이미지 첨부 버튼 */}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-11 w-11 shrink-0 text-foreground active:scale-90"
						onClick={() => fileInputRef.current?.click()}
						disabled={isLoading}
						aria-label="이미지 첨부"
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

					{/* 텍스트 입력창 */}
					<div className="relative min-w-0 flex-1">
						<label htmlFor={inputId} className="sr-only">
							거래 또는 자산 입력
						</label>
						<p id={hintId} className="sr-only">
							거래나 자산 내역을 입력하세요. Enter로 전송하고 Shift+Enter로 줄바꿈합니다.
						</p>
						<AnimatedPlaceholder show={!input && !isLoading} />
						<textarea
							id={inputId}
							ref={textareaRef}
							value={input}
							onChange={(e) => {
								const val = e.target.value;
								setInput(val);
								// 세션 스토리지에 임시 저장 (새로고침 복원용)
								sessionStorage.setItem(DRAFT_STORAGE_KEY, val);
								resizeTextarea(e.target);
								if (error) setError(null);
							}}
							onKeyDown={handleKeyDown}
							aria-describedby={hintId}
							className="block h-9 min-h-9 w-full resize-none rounded-md border border-input bg-transparent px-3 py-[7px] text-sm leading-5 shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
							rows={1}
							disabled={isLoading}
						/>
					</div>
					{/* 전송 버튼 */}
					<motion.div className="shrink-0" whileTap={{ scale: 0.9 }}>
						<Button
							size="icon"
							onClick={handleSubmit}
							disabled={(!input.trim() && !imageData) || isLoading}
							className="h-11 w-11"
							aria-label={isLoading ? "입력 분석 중" : "입력 전송"}
						>
							{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						</Button>
					</motion.div>
				</div>

				{/* 에러 메시지 및 재시도 */}
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
									aria-label="같은 요청 다시 시도"
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
