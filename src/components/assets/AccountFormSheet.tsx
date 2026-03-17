"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createAccount, updateAccount } from "@/server/actions/account";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
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

const ICON_OPTIONS = ["🏦", "💵", "🏧", "📈", "💳", "🏠", "💰", "🪙", "🎓", "🚗", "📦"];

interface AccountFormSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	account?: Account;
	defaultType?: "asset" | "debt";
	onCreated?: (account: Account) => void;
	onUpdated?: (account: Account) => void;
}

export function AccountFormSheet({
	open,
	onOpenChange,
	mode,
	account,
	defaultType,
	onCreated,
	onUpdated,
}: AccountFormSheetProps) {
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);

	const [name, setName] = useState(account?.name ?? "");
	const [type, setType] = useState<"asset" | "debt">(account?.type ?? defaultType ?? "asset");
	const [subType, setSubType] = useState(account?.subType ?? (defaultType === "debt" ? "credit_card" : "bank"));
	const [icon, setIcon] = useState(account?.icon ?? "🏦");
	const [balance, setBalance] = useState(String(account?.balance ?? 0));

	const subTypes = type === "asset" ? ASSET_SUB_TYPES : DEBT_SUB_TYPES;
	const nameFieldId = "account-form-name";
	const balanceFieldId = "account-form-balance";

	const handleTypeChange = (newType: "asset" | "debt") => {
		// 유형이 바뀌면 이전 유형에 묶여 있던 세부 유형/아이콘이 남지 않도록
		// 기본 조합을 함께 리셋한다.
		setType(newType);
		setSubType(newType === "asset" ? "bank" : "credit_card");
		setIcon(newType === "asset" ? "🏦" : "💳");
	};

	const handleSubmit = () => {
		if (!name.trim()) return;

		startTransition(async () => {
			startLoading();
			try {
				const nextBalance = Number(balance) || 0;
				if (mode === "create") {
					const result = await createAccount({
						name: name.trim(),
						type,
						subType,
						icon,
						balance: nextBalance,
					});
					if (result.success) {
						// 서버 revalidation이 최종 정합성을 맞추더라도
						// 생성 직후 목록 체감을 위해 로컬 콜백으로 먼저 반영한다.
						// 낙관적 업데이트용 임시 객체 — 서버 revalidation 후 실제 데이터로 교체됨
						onCreated?.({
							id: result.id,
							userId: "",
							name: name.trim(),
							type,
							subType,
							icon,
							balance: nextBalance,
							sortOrder: 0,
							isActive: true,
							createdAt: new Date(),
							updatedAt: new Date(),
						});
						onOpenChange(false);
					}
				} else if (account) {
					const result = await updateAccount(account.id, {
						name: name.trim(),
						icon,
						balance: nextBalance,
						subType,
					});
					if (result.success) {
						// 수정도 같은 이유로 로컬 snapshot을 먼저 갱신해
						// 시트가 닫히는 순간 목록이 바로 바뀌도록 맞춘다.
						onUpdated?.({
							...account,
							name: name.trim(),
							icon,
							subType,
							balance: nextBalance,
							updatedAt: new Date(),
						});
						onOpenChange(false);
					}
				}
			} finally {
				stopLoading();
			}
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>
						{mode === "create" ? (type === "asset" ? "자산 추가" : "부채 추가") : "계정 수정"}
					</DrawerTitle>
					<DrawerDescription>
						계정 이름, 세부 유형, 아이콘과 현재 금액을 입력하거나 수정합니다.
					</DrawerDescription>
				</DrawerHeader>

				<div className="space-y-4 px-4">
					{/* 이름 */}
					<div className="space-y-1.5">
						<Label htmlFor={nameFieldId} className="text-xs">이름</Label>
						<Input
							id={nameFieldId}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="카카오뱅크, 신한카드 등"
							className="h-9"
						/>
					</div>

					{/* 유형 + 세부 유형 */}
					<div className="grid grid-cols-2 gap-3">
						{mode === "create" && (
							<div className="space-y-1.5">
								<Label className="text-xs">유형</Label>
								<Select value={type} onValueChange={(v) => handleTypeChange(v as "asset" | "debt")}>
									<SelectTrigger className="h-9" aria-label="유형">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="asset">자산</SelectItem>
										<SelectItem value="debt">부채</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
						<div className={`space-y-1.5 ${mode === "edit" ? "col-span-2" : ""}`}>
							<Label className="text-xs">세부 유형</Label>
							<Select value={subType} onValueChange={setSubType}>
								<SelectTrigger className="h-9" aria-label="세부 유형">
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

					{/* 잔액 */}
					<div className="space-y-1.5">
						<Label htmlFor={balanceFieldId} className="text-xs">
							{type === "debt" ? "부채 금액 (원)" : "잔액 (원)"}
						</Label>
						<Input
							id={balanceFieldId}
							type="number"
							value={balance}
							onChange={(e) => setBalance(e.target.value)}
							placeholder="0"
							className="h-9"
						/>
					</div>

					{/* 아이콘 선택 */}
					<div className="space-y-1.5">
						<Label className="text-xs">아이콘</Label>
						<div className="flex flex-wrap gap-1.5">
							{ICON_OPTIONS.map((ic) => (
								<button
									key={ic}
									type="button"
									onClick={() => setIcon(ic)}
									className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors ${
										icon === ic
											? "border-primary bg-primary/10"
											: "border-border hover:bg-accent"
									}`}
								>
									{ic}
								</button>
							))}
						</div>
					</div>
				</div>

				<DrawerFooter>
					<Button className="w-full" onClick={handleSubmit} disabled={isPending || !name.trim()}>
						{showSpinner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
						{mode === "create" ? "추가" : "수정 완료"}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
