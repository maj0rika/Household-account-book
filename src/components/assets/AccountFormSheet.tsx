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
}

export function AccountFormSheet({ open, onOpenChange, mode, account, defaultType }: AccountFormSheetProps) {
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
		setType(newType);
		setSubType(newType === "asset" ? "bank" : "credit_card");
		setIcon(newType === "asset" ? "🏦" : "💳");
	};

	const handleSubmit = () => {
		if (!name.trim()) return;

		startTransition(async () => {
			startLoading();
			try {
				if (mode === "create") {
					const result = await createAccount({
						name: name.trim(),
						type,
						subType,
						icon,
						balance: Number(balance) || 0,
					});
					if (result.success) {
						onOpenChange(false);
					}
				} else if (account) {
					const result = await updateAccount(account.id, {
						name: name.trim(),
						icon,
						balance: Number(balance) || 0,
						subType,
					});
					if (result.success) {
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
