"use client";

// 파일 역할:
// - 설정 화면에서 쓰이는 도메인 UI 파일이다.
// 사용 위치:
// - `src/app/(dashboard)/settings/page.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 상위 페이지/섹션 컴포넌트가 데이터를 내려주면, 이 파일이 상태와 이벤트를 정리해 하위 UI 프리미티브에 전달한다;
import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { addCategory, deleteCategory } from "@/server/actions/settings";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import type { Category } from "@/types";

const ICONS = ["🍚", "☕", "🚗", "🏠", "🎮", "👕", "💊", "📚", "🎁", "💼", "💰", "📱", "✂️", "🎬", "🏋️", "📦"];

interface CategoryManagerProps {
	categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);

	const [type, setType] = useState<"expense" | "income">("expense");
	const [name, setName] = useState("");
	const [icon, setIcon] = useState("📦");

	const expenseCategories = categories.filter((c) => c.type === "expense");
	const incomeCategories = categories.filter((c) => c.type === "income");

	const handleAdd = () => {
		if (!name.trim()) return;

		startTransition(async () => {
			startLoading();
			try {
				const result = await addCategory({ name: name.trim(), icon, type });
				if (result.success) {
					setOpen(false);
					setName("");
					setIcon("📦");
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
				await deleteCategory(id);
			} finally {
				stopLoading();
			}
		});
	};

	const renderList = (items: Category[], label: string) => (
		<div>
			<h4 className="mb-2 text-xs font-semibold text-muted-foreground">{label}</h4>
			<div className="space-y-1">
				{items.map((c) => (
					<div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
						<div className="flex items-center gap-2 text-sm">
							<span>{c.icon}</span>
							<span>{c.name}</span>
							{c.isDefault && (
								<Badge variant="outline" className="text-[10px] px-1 py-0">기본</Badge>
							)}
						</div>
						{!c.isDefault && (
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={() => handleDelete(c.id)}
								disabled={isPending}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
				))}
			</div>
		</div>
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">카테고리 관리</h3>
				<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					추가
				</Button>
			</div>

			{renderList(expenseCategories, "지출")}
			{renderList(incomeCategories, "수입")}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>카테고리 추가</DialogTitle>
						<DialogDescription>지출 또는 수입 카테고리를 새로 등록합니다.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>유형</Label>
							<div className="mt-1 flex gap-2">
								<Button
									size="sm"
									variant={type === "expense" ? "default" : "outline"}
									onClick={() => setType("expense")}
								>
									지출
								</Button>
								<Button
									size="sm"
									variant={type === "income" ? "default" : "outline"}
									onClick={() => setType("income")}
								>
									수입
								</Button>
							</div>
						</div>
						<div>
							<Label>아이콘</Label>
							<div className="mt-1 flex flex-wrap gap-1.5">
								{ICONS.map((ic) => (
									<button
										key={ic}
										type="button"
										onClick={() => setIcon(ic)}
										className={`rounded-md p-1.5 text-lg transition-colors ${
											icon === ic ? "bg-accent ring-2 ring-primary" : "hover:bg-accent/50"
										}`}
									>
										{ic}
									</button>
								))}
							</div>
						</div>
						<div>
							<Label>이름</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="카테고리명"
								className="mt-1"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
						<Button onClick={handleAdd} disabled={isPending || !name.trim()}>
							{showSpinner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							추가
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
