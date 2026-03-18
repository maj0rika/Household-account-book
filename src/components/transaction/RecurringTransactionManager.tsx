"use client";

// 파일 역할:
// - 거래 화면에서 재사용되는 도메인 UI 파일이다.
// 사용 위치:
// - 직접 import 경로가 드러나지 않는 진입점이거나, 프레임워크/테스트 러너가 런타임에 호출한다;
// 흐름:
// - 상위 페이지/섹션 컴포넌트가 데이터를 내려주면, 이 파일이 상태와 이벤트를 정리해 하위 UI 프리미티브에 전달한다;
import { useState, useTransition, useEffect } from "react";
import { Check, Trash2, Loader2, Plus, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getCurrentMonth, formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import {
	getRecurringTransactions,
	createRecurringTransaction,
	deleteRecurringTransaction,
	applyRecurringTransactions,
	checkRecurringApplied,
} from "@/server/actions/recurring";
import { getUserCategories } from "@/server/actions/transaction";
import type { Category } from "@/types";

interface RecurringItem {
	id: string;
	type: "income" | "expense";
	description: string;
	amount: number;
	dayOfMonth: number;
	categoryId: string | null;
	isActive: boolean;
}

export function RecurringTransactionManager() {
	const [items, setItems] = useState<RecurringItem[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);
	const [allApplied, setAllApplied] = useState(false);
	const [applyMessage, setApplyMessage] = useState<string | null>(null);
	const [collapsed, setCollapsed] = useState(true);

	// 폼 상태
	const [type, setType] = useState<"expense" | "income">("expense");
	const [categoryId, setCategoryId] = useState("");
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [dayOfMonth, setDayOfMonth] = useState("1");
	const recurringListId = "recurring-transaction-list";
	const typeGroupLabelId = "recurring-transaction-type-label";
	const categorySelectId = "recurring-transaction-category";
	const descriptionInputId = "recurring-transaction-description";
	const amountInputId = "recurring-transaction-amount";
	const dayInputId = "recurring-transaction-day";

	const loadData = () => {
		// 규칙 목록, 카테고리 메타데이터, 이번 달 적용 여부를 함께 초기화하고
		// 항목 유무에 따라 기본 펼침 상태도 조정한다.
		getRecurringTransactions().then((data) => {
			const list = data as RecurringItem[];
			setItems(list);
			// 고정 거래가 없으면 펼쳐서 추가 유도, 있으면 접힌 채 유지
			if (list.length === 0) setCollapsed(false);
		});
		getUserCategories().then((data) => setCategories(data as Category[]));
		checkRecurringApplied(getCurrentMonth()).then(({ total, applied }) => {
			setAllApplied(total > 0 && total === applied);
		});
	};

	useEffect(() => {
		loadData();
	}, []);

	const filteredCategories = categories.filter((c) => c.type === type);

	const handleCreate = () => {
		if (!description.trim() || !amount) return;
		startTransition(async () => {
			startLoading();
			try {
				const result = await createRecurringTransaction({
					type,
					categoryId: categoryId || null,
					description: description.trim(),
					amount: Number(amount),
					dayOfMonth: Number(dayOfMonth),
				});
				if (result.success) {
					setDialogOpen(false);
					setDescription("");
					setAmount("");
					setCategoryId("");
					setDayOfMonth("1");
					loadData();
				}
			} finally {
				stopLoading();
			}
		});
	};

	const handleDelete = (id: string) => {
		startTransition(async () => {
			startLoading();
			try {
				await deleteRecurringTransaction(id);
				loadData();
			} finally {
				stopLoading();
			}
		});
	};

	const handleApply = () => {
		startTransition(async () => {
			startLoading();
			try {
				const result = await applyRecurringTransactions(getCurrentMonth());
				if (result.success) {
					if (result.count === 0 && result.alreadyApplied > 0) {
						setApplyMessage("이번 달 고정 거래가 이미 모두 적용되어 있습니다.");
						setAllApplied(true);
					} else if (result.count > 0) {
						setApplyMessage(`${result.count}건이 새로 적용되었습니다.`);
						setAllApplied(result.alreadyApplied + result.count === items.length);
					}
					setTimeout(() => setApplyMessage(null), 3000);
				}
			} finally {
				stopLoading();
			}
		});
	};

	return (
		<div className="px-4 py-2">
			<div className="mb-3 flex items-center justify-between">
				<button
					type="button"
					onClick={() => setCollapsed((prev) => !prev)}
					aria-expanded={!collapsed}
					aria-controls={recurringListId}
					className="flex items-center gap-1.5 text-sm font-semibold"
				>
					고정 수입/지출
					{collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
				</button>
				<div className="flex gap-1">
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-xs"
						onClick={handleApply}
						disabled={isPending || items.length === 0 || allApplied}
					>
						{allApplied ? (
							<>
								<Check className="mr-1 h-3 w-3" />
								적용 완료
							</>
						) : (
							<>
								<RefreshCw className="mr-1 h-3 w-3" />
								이번 달 적용
							</>
						)}
					</Button>
					<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)}>
						<Plus className="mr-1 h-3 w-3" />
						추가
					</Button>
				</div>
			</div>

			{!collapsed && (
				<>
					{applyMessage && (
						<p className="mb-2 text-center text-xs text-muted-foreground" role="status" aria-live="polite">
							{applyMessage}
						</p>
					)}

					<div id={recurringListId}>
						{items.length === 0 ? (
							<p className="py-3 text-center text-xs text-muted-foreground">
							등록된 고정 거래가 없습니다
							</p>
						) : (
							<div className="space-y-1.5">
								{items.map((item) => (
									<div key={item.id} className="flex items-center gap-2 text-sm">
										<Badge variant={item.type === "income" ? "default" : "secondary"} className="shrink-0 text-[10px]">
											{item.type === "income" ? "수입" : "지출"}
										</Badge>
										<span className="flex-1 truncate">{item.description}</span>
										<span className="shrink-0 text-xs text-muted-foreground">매월 {item.dayOfMonth}일</span>
										<span className="shrink-0 font-medium">{formatCurrency(item.amount)}</span>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 shrink-0"
											onClick={() => handleDelete(item.id)}
											disabled={isPending}
											aria-label={`${item.description} 삭제`}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>고정 거래 추가</DialogTitle>
						<DialogDescription>매월 반복되는 수입이나 지출을 등록합니다.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="grid gap-2">
							<span id={typeGroupLabelId} className="text-sm font-medium">유형</span>
							<div role="group" aria-labelledby={typeGroupLabelId} className="flex gap-2">
								<Button type="button" variant={type === "expense" ? "default" : "outline"} size="sm" onClick={() => { setType("expense"); setCategoryId(""); }} aria-pressed={type === "expense"}>
									지출
								</Button>
								<Button type="button" variant={type === "income" ? "default" : "outline"} size="sm" onClick={() => { setType("income"); setCategoryId(""); }} aria-pressed={type === "income"}>
									수입
								</Button>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={dayInputId}>매월 날짜</Label>
							<Input id={dayInputId} type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
						</div>
						<div className="grid gap-2">
							<Label htmlFor={categorySelectId}>카테고리</Label>
							<select
								id={categorySelectId}
								value={categoryId}
								onChange={(e) => setCategoryId(e.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							>
								<option value="">선택 없음</option>
								{filteredCategories.map((cat) => (
									<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
								))}
							</select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={descriptionInputId}>설명</Label>
							<Input id={descriptionInputId} placeholder="월급, 관리비, 넷플릭스 등" value={description} onChange={(e) => setDescription(e.target.value)} />
						</div>
						<div className="grid gap-2">
							<Label htmlFor={amountInputId}>금액 (원)</Label>
							<Input
								id={amountInputId}
								type="text"
								inputMode="numeric"
								placeholder="1,500,000"
								value={formatCurrencyInput(amount)}
								onChange={(e) => setAmount(parseCurrencyInput(e.target.value))}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
						<Button onClick={handleCreate} disabled={!description.trim() || !amount || Number(amount) <= 0 || isPending}>
							{showSpinner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							저장
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
