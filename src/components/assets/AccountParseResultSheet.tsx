"use client";

import { memo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ChevronDown, ChevronUp, RefreshCw, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
	DrawerFooter,
} from "@/components/ui/drawer";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { upsertParsedAccountsBatch } from "@/server/actions/account";
import type { ParsedAccount } from "@/server/llm/types";
import type { Account } from "@/types";

const ASSET_SUB_TYPES = [
	{ value: "bank", label: "은행 계좌", icon: "🏦" },
	{ value: "cash", label: "현금", icon: "💵" },
	{ value: "savings", label: "적금/예금", icon: "🏧" },
	{ value: "investment", label: "투자", icon: "📈" },
	{ value: "other", label: "기타", icon: "📦" },
] as const;

const DEBT_SUB_TYPES = [
	{ value: "credit_card", label: "신용카드", icon: "💳" },
	{ value: "loan", label: "대출", icon: "🏠" },
	{ value: "other", label: "기타", icon: "📦" },
] as const;

// 기존 계정 매칭 결과
interface MatchedItem {
	parsed: ParsedAccount;
	initialParsed: ParsedAccount;
	matchedAccount: Account | null; // null = 신규 생성
	action: "create" | "update"; // 기본값: 매칭되면 update, 아니면 create
}

interface DraftMatchedItem {
	clientKey: string;
	value: MatchedItem;
}

let matchedDraftSequence = 0;

function createMatchedDraft(item: MatchedItem): DraftMatchedItem {
	return {
		clientKey: `matched-draft-${matchedDraftSequence++}`,
		value: item,
	};
}

function createMatchedDrafts(items: MatchedItem[]): DraftMatchedItem[] {
	return items.map(createMatchedDraft);
}

/**
 * [유틸리티: findExactMatch]
 * 편집 후 재매칭에서는 이름 + 유형 + 세부 유형이 모두 같을 때만 기존 계정으로 간주합니다.
 */
function findExactMatch(parsed: ParsedAccount, existing: Account[]): Account | null {
	const normalizedName = parsed.name.trim();

	return existing.find(
		(a) => a.name.trim() === normalizedName && a.type === parsed.type && a.subType === parsed.subType,
	) ?? null;
}

/**
 * [유틸리티: findInitialMatch]
 * 초기 자동 매칭은 세부 유형이 다소 흔들려도 기존 계정 업데이트로 이어지도록
 * 이름 + 유형까지 허용합니다.
 */
function findInitialMatch(parsed: ParsedAccount, existing: Account[]): Account | null {
	const exactMatch = findExactMatch(parsed, existing);

	if (exactMatch) {
		return exactMatch;
	}

	const normalizedName = parsed.name.trim();

	return existing.find(
		(a) => a.name.trim() === normalizedName && a.type === parsed.type,
	) ?? null;
}

function isMatchIdentityChanged(previousParsed: ParsedAccount, nextParsed: ParsedAccount): boolean {
	return previousParsed.name.trim() !== nextParsed.name.trim()
		|| previousParsed.type !== nextParsed.type
		|| previousParsed.subType !== nextParsed.subType;
}

function isSameMatchIdentity(a: ParsedAccount, b: ParsedAccount): boolean {
	return a.name.trim() === b.name.trim()
		&& a.type === b.type
		&& a.subType === b.subType;
}

function resolveMatchedItem(
	parsed: ParsedAccount,
	existingAccounts: Account[],
	previousItem?: MatchedItem,
): MatchedItem {
	if (!previousItem) {
		const matchedAccount = findInitialMatch(parsed, existingAccounts);

		return {
			parsed,
			initialParsed: parsed,
			matchedAccount,
			action: matchedAccount ? "update" : "create",
		};
	}

	const { initialParsed } = previousItem;
	const identityChanged = isMatchIdentityChanged(previousItem.parsed, parsed);

	// 금액 수정처럼 매칭 키가 바뀌지 않은 편집은 기존 매칭 상태를 유지합니다.
	if (!identityChanged) {
		return {
			parsed,
			initialParsed,
			matchedAccount: previousItem.matchedAccount,
			action: previousItem.action,
		};
	}

	const matchedAccount = findExactMatch(parsed, existingAccounts);

	if (matchedAccount) {
		return {
			parsed,
			initialParsed,
			matchedAccount,
			action: "update",
		};
	}

	const restoredInitialMatch = isSameMatchIdentity(initialParsed, parsed)
		? findInitialMatch(initialParsed, existingAccounts)
		: null;

	if (restoredInitialMatch) {
		return {
			parsed,
			initialParsed,
			matchedAccount: restoredInitialMatch,
			action: "update",
		};
	}

	return {
		parsed,
		initialParsed,
		matchedAccount: null,
		action: "create",
	};
}

// 개별 자산/부채 항목 편집 카드 (신규/업데이트 전환, 아코디언 상세 편집)
const EditableAccountItem = memo(function EditableAccountItem({
	itemId,
	item,
	index,
	onParsedChange,
	onToggleAction,
	onRemove,
}: {
	itemId: string;
	item: MatchedItem;
	index: number;
	onParsedChange: (itemId: string, parsed: ParsedAccount) => void;
	onToggleAction: (itemId: string) => void;
	onRemove: (itemId: string) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const { parsed, matchedAccount, action } = item;
	const subTypes = parsed.type === "asset" ? ASSET_SUB_TYPES : DEBT_SUB_TYPES;
	const nameFieldId = `parsed-account-name-${index}`;
	const balanceFieldId = `parsed-account-balance-${index}`;

	return (
		<div className="border-b border-border last:border-b-0">
			{/* 요약 행: 아이콘, 이름, 금액 및 상태(신규/업데이트) 표시 */}
			<div className="flex items-center gap-2 py-2.5">
				<button
					type="button"
					aria-expanded={expanded}
					aria-label={`${parsed.name} 상세 편집 ${expanded ? "접기" : "펼치기"}`}
					className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={() => setExpanded((prev) => !prev)}
				>
					<span className="shrink-0 p-0.5 text-muted-foreground">
						{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
					</span>
					<span className="text-lg">{parsed.icon}</span>
					<Badge
						variant={parsed.type === "asset" ? "default" : "secondary"}
						className="shrink-0 text-xs"
					>
						{parsed.type === "asset" ? "자산" : "부채"}
					</Badge>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">{parsed.name}</p>
					</div>
					<span className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${
						parsed.type === "debt" ? "text-expense" : "text-foreground"
					}`}>
						{formatCurrency(parsed.balance)}
					</span>
				</button>

				{/* 신규/업데이트 토글 — 아코디언과 분리된 독립 액션 */}
				{matchedAccount ? (
					<button
						type="button"
						aria-label={action === "update"
							? `${parsed.name} 저장 방식을 신규로 변경`
							: `${parsed.name} 저장 방식을 업데이트로 변경`}
						className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={() => onToggleAction(itemId)}
					>
						<Badge
							variant={action === "update" ? "outline" : "default"}
							className="pointer-events-none gap-1 text-xs"
						>
							{action === "update" ? (
								<><RefreshCw className="h-2.5 w-2.5" />업데이트</>
							) : (
								<><PlusCircle className="h-2.5 w-2.5" />신규</>
							)}
						</Badge>
					</button>
				) : (
					<Badge variant="outline" className="shrink-0 gap-1 text-xs">
						<PlusCircle className="h-2.5 w-2.5" />신규
					</Badge>
				)}

				<Button
					variant="ghost"
					size="icon"
					aria-label={`${parsed.name} 항목 삭제`}
					className="h-7 w-7 shrink-0"
					onClick={() => onRemove(itemId)}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			{/* 업데이트 모드 시 기존 잔액 → 변경 잔액 비교 표시 */}
			{matchedAccount && action === "update" && (
				<div className="mx-1 mb-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
					<span className="text-xs text-muted-foreground">
						기존 잔액 <strong className="text-foreground">{formatCurrency(matchedAccount.balance)}</strong>
						→ <strong className="text-foreground">{formatCurrency(parsed.balance)}</strong>으로 변경
					</span>
				</div>
			)}

			{/* 상세 편집 패널 (motion 펼쳐짐 애니메이션) */}
			<AnimatePresence>
				{expanded && (
					<motion.div
						className="space-y-3 pb-3 pl-6 pr-2"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						{/* 이름 수정 */}
						<div className="space-y-1">
							<Label htmlFor={nameFieldId} className="text-xs">이름</Label>
							<Input
								id={nameFieldId}
								value={parsed.name}
								onChange={(e) => onParsedChange(itemId, { ...parsed, name: e.target.value })}
								className="h-8 text-sm"
							/>
						</div>

						{/* 유형(자산/부채) 및 아이콘 자동 매칭 */}
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-xs">유형</Label>
								<Select
									value={parsed.type}
									onValueChange={(value) =>
										onParsedChange(itemId, {
											...parsed,
											type: value as "asset" | "debt",
											subType: value === "asset" ? "bank" : "credit_card",
											icon: value === "asset" ? "🏦" : "💳",
										})
									}
								>
									<SelectTrigger className="h-8 text-sm" aria-label="유형">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="asset">자산</SelectItem>
										<SelectItem value="debt">부채</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">세부 유형</Label>
								<Select
									value={parsed.subType}
									onValueChange={(value) =>
										onParsedChange(itemId, { ...parsed, subType: value as ParsedAccount["subType"] })
									}
								>
									<SelectTrigger className="h-8 text-sm" aria-label="세부 유형">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{subTypes.map((st) => (
											<SelectItem key={st.value} value={st.value}>
												{st.icon} {st.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* 잔액 입력 (통화 포맷팅 포함) */}
						<div className="space-y-1">
							<Label htmlFor={balanceFieldId} className="text-xs">
								{parsed.type === "debt" ? "부채 금액 (원)" : "잔액 (원)"}
							</Label>
							<Input
								id={balanceFieldId}
								type="text"
								inputMode="numeric"
								value={formatCurrencyInput(String(parsed.balance))}
								onChange={(e) =>
									onParsedChange(itemId, {
										...parsed,
										balance: Number(parseCurrencyInput(e.target.value)) || 0,
									})
								}
								className="h-8 text-sm"
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

interface AccountParseResultSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: ParsedAccount[];
	existingAccounts: Account[];
	splitMeta?: {
		transactionCount: number;
		accountCount: number;
	} | null;
}

// AI 분석 자산/부채 정보를 확인·저장하는 시트 (바톤 터치 + 조건부 라우팅)
export function AccountParseResultSheet({
	open,
	onOpenChange,
	items: initialItems,
	existingAccounts,
	splitMeta,
}: AccountParseResultSheetProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);
	const [draftMatchedItems, setDraftMatchedItems] = useState<DraftMatchedItem[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// [라이프사이클: 초기 분석 결과와 프로젝트 계정 목록 매칭]
	// 컴포넌트가 열리거나 데이터가 들어오면, AI가 분석한 각 항목을 기존 계정과 대조합니다.
	// 매칭되는 계정이 있으면 '업데이트(수정)', 없으면 '신규(생성)' 액션을 기본값으로 설정합니다.
	useEffect(() => {
		const matched = initialItems.map((parsed) => resolveMatchedItem(parsed, existingAccounts));
		setDraftMatchedItems(createMatchedDrafts(matched));
		setErrorMessage(null);
	}, [initialItems, existingAccounts]);

	const handleParsedChange = (itemId: string, parsed: ParsedAccount) => {
		setDraftMatchedItems((prev) =>
			prev.map((draft) => {
				if (draft.clientKey !== itemId) return draft;
				return {
					...draft,
					value: resolveMatchedItem(parsed, existingAccounts, draft.value),
				};
			}),
		);
	};

	const handleActionToggle = (itemId: string) => {
		setDraftMatchedItems((prev) =>
			prev.map((draft) => {
				if (draft.clientKey !== itemId || !draft.value.matchedAccount) return draft;
				return {
					...draft,
					value: {
						...draft.value,
						action: draft.value.action === "update" ? "create" : "update",
					},
				};
			}),
		);
	};

	const handleRemove = (itemId: string) => {
		setDraftMatchedItems((prev) => {
			const next = prev.filter((draft) => draft.clientKey !== itemId);
			if (next.length === 0) {
				// 즉시 닫으면 리액트 상태 업데이트 중 충돌이 날 수 있어 마이크로태스크로 미룹니다.
				queueMicrotask(() => onOpenChange(false));
			}
			return next;
		});
	};

	const matchedItems = draftMatchedItems.map((draft) => draft.value);

	// 자산/부채 DB 일괄 저장 (create vs update 분기 + 트랜잭션 처리)
	const handleSave = () => {
		if (draftMatchedItems.length === 0) return;
		setErrorMessage(null);

		startTransition(async () => {
			startLoading(); // 지연된 로딩 스피너 시작
			try {
				// 서버 액션: 각 항목의 액션 타입에 따라 매핑하여 전달
				const result = await upsertParsedAccountsBatch(
					matchedItems.map((item) => {
						// 기존 계정이 있고 '업데이트' 액션인 경우 accountId를 포함하여 전달합니다.
						if (item.action === "update" && item.matchedAccount) {
							return {
								action: "update" as const,
								accountId: item.matchedAccount.id,
								name: item.parsed.name,
								type: item.parsed.type,
								subType: item.parsed.subType,
								icon: item.parsed.icon,
								balance: item.parsed.balance,
							};
						}
						// 신규 생성인 경우 (accountId 제외)
						return {
							action: "create" as const,
							name: item.parsed.name,
							type: item.parsed.type,
							subType: item.parsed.subType,
							icon: item.parsed.icon,
							balance: item.parsed.balance,
						};
					}),
				);

				if (result.success) {
					onOpenChange(false); // 시트 닫기

					// 혼합 입력 완료 시 거래 목록으로, 자산만 시 자산 대시보드로 이동
					if (splitMeta) {
						router.push("/transactions?saved=mixed");
						return;
					}

					router.push("/assets?saved=account");
					return;
				}

				setErrorMessage(result.error);
			} catch (error) {
				console.error("[AccountParseResultSheet] 자산/부채 저장 실패", error);
				setErrorMessage("자산/부채 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
			} finally {
				stopLoading();
			}
		});
	};

	const createCount = matchedItems.filter((i) => i.action === "create").length;
	const updateCount = matchedItems.filter((i) => i.action === "update").length;

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>자산/부채 파싱 결과</DrawerTitle>
					<DrawerDescription>
						{matchedItems.length}건을 인식했습니다. 항목을 눌러 수정할 수 있습니다.
					</DrawerDescription>
					{/* 혼합 입력 흐름 안내 */}
					{splitMeta && (
						<p className="text-xs text-muted-foreground">
							이전 입력은 거래 {splitMeta.transactionCount}건과 자산/부채 {splitMeta.accountCount}건으로 분리되었고,
							 현재 자산/부채 등록 단계입니다.
						</p>
					)}
				</DrawerHeader>

				<div className="max-h-[50vh] overflow-y-auto px-4">
					{draftMatchedItems.map((draft, index) => (
						<EditableAccountItem
							key={draft.clientKey}
							itemId={draft.clientKey}
							item={draft.value}
							index={index}
							onParsedChange={handleParsedChange}
							onToggleAction={handleActionToggle}
							onRemove={handleRemove}
						/>
					))}
				</div>

				<DrawerFooter>
					{/* 요약 정보 영역: 신규/업데이트 건수 표시 */}
					{(createCount > 0 || updateCount > 0) && (
						<div className="mb-2 flex gap-3 text-sm">
							{createCount > 0 && (
								<span className="text-muted-foreground">
									신규 <span className="font-semibold text-foreground">{createCount}건</span>
								</span>
							)}
							{updateCount > 0 && (
								<span className="text-muted-foreground">
									업데이트 <span className="font-semibold text-foreground">{updateCount}건</span>
								</span>
							)}
						</div>
					)}
					{errorMessage && (
						<p className="mb-1 whitespace-pre-wrap text-xs text-destructive">{errorMessage}</p>
					)}
					<Button onClick={handleSave} disabled={matchedItems.length === 0 || isPending}>
						{showSpinner ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								저장 중...
							</>
						) : (
							`${matchedItems.length}건 저장`
						)}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
