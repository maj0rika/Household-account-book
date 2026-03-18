"use client";

// 파일 역할:
// - 자산/부채 화면에서 쓰이는 도메인 UI 파일이다.
// 사용 위치:
// - `src/app/(dashboard)/assets/page.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 상위 페이지/섹션 컴포넌트가 데이터를 내려주면, 이 파일이 상태와 이벤트를 정리해 하위 UI 프리미티브에 전달한다;
import { useState, useTransition, useEffect, useCallback, memo } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { deleteAccount } from "@/server/actions/account";
import { AccountFormSheet } from "@/components/assets/AccountFormSheet";
import type { Account } from "@/types";

const AccountItem = memo(function AccountItem({
	account,
	onEdit,
	onDelete,
	disabled,
}: {
	account: Account;
	onEdit: (account: Account) => void;
	onDelete: (id: string) => void;
	disabled?: boolean;
}) {
	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}
			className="flex items-center justify-between px-4 py-3"
		>
			<div className="flex items-center gap-3">
				<span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-lg">
					{account.icon}
				</span>
				<div>
					<p className="text-sm font-medium">{account.name}</p>
					<p className="text-xs text-muted-foreground">{getSubTypeLabel(account.subType)}</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span
					className={`text-sm font-semibold tabular-nums ${
						account.type === "debt" ? "text-expense" : "text-foreground"
					}`}
				>
					{account.type === "debt" ? "-" : ""}
					{formatCurrency(Math.abs(account.balance))}
				</span>
				<div className="flex gap-0.5">
					<Button
						variant="ghost"
						size="icon-sm"
						className="h-7 w-7 text-muted-foreground"
						onClick={() => onEdit(account)}
						aria-label={`${account.name} 수정`}
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="h-7 w-7 text-muted-foreground hover:text-destructive"
						onClick={() => onDelete(account.id)}
						disabled={disabled}
						aria-label={`${account.name} 삭제`}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		</motion.div>
	);
});

function getSubTypeLabel(subType: string): string {
	const labels: Record<string, string> = {
		bank: "은행 계좌",
		cash: "현금",
		savings: "적금/예금",
		investment: "투자",
		credit_card: "신용카드",
		loan: "대출",
		other: "기타",
	};
	return labels[subType] ?? subType;
}

export function AccountList({ accounts }: { accounts: Account[] }) {
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);
	const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts);
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);
	const [addingType, setAddingType] = useState<"asset" | "debt" | null>(null);

	useEffect(() => {
		// 삭제/수정 직후에는 로컬 상태로 즉시 반응하되,
		// 서버 revalidation 결과가 오면 props를 다시 진실 공급원으로 삼아 덮어쓴다.
		setLocalAccounts(accounts);
	}, [accounts]);

	const assets = localAccounts.filter((a) => a.type === "asset");
	const debts = localAccounts.filter((a) => a.type === "debt");

	const handleDelete = useCallback((id: string) => {
		startTransition(async () => {
			startLoading();
			try {
				const result = await deleteAccount(id);
				if (result.success) {
					// soft delete가 서버에서 성공한 뒤에만 로컬 목록에서 제거하고,
					// 최종 정합성은 이후 revalidation 결과로 다시 맞춘다.
					setLocalAccounts((prev) => prev.filter((account) => account.id !== id));
					setEditingAccount((prev) => (prev?.id === id ? null : prev));
				}
			} finally {
				stopLoading();
			}
		});
	}, [startLoading, stopLoading]);

	const handleUpdated = useCallback((updatedAccount: Account) => {
		setLocalAccounts((prev) => prev.map((account) => (account.id === updatedAccount.id ? updatedAccount : account)));
		setEditingAccount(updatedAccount);
	}, []);

	const handleCreated = useCallback((createdAccount: Account) => {
		setLocalAccounts((prev) => {
			const nextSortOrder = prev.filter((account) => account.type === createdAccount.type).length;
			return [...prev, { ...createdAccount, sortOrder: nextSortOrder }];
		});
	}, []);

	return (
		<>
			{/* 자산 섹션 */}
			<div className="mt-4">
				<div className="flex items-center justify-between px-4 py-2">
					<h3 className="text-sm font-semibold text-muted-foreground">
						자산 ({assets.length})
					</h3>
					<div className="flex items-center gap-2">
						{showSpinner && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1 text-xs text-primary"
							onClick={() => setAddingType("asset")}
						>
							<Plus className="h-3.5 w-3.5" />
							추가
						</Button>
					</div>
				</div>
				<AnimatePresence mode="popLayout">
					{assets.length === 0 ? (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="px-4 py-6 text-center text-xs text-muted-foreground"
						>
							등록된 자산이 없습니다
						</motion.p>
					) : (
						assets.map((account) => (
							<AccountItem
								key={account.id}
								account={account}
								onEdit={setEditingAccount}
								onDelete={handleDelete}
								disabled={isPending}
							/>
						))
					)}
				</AnimatePresence>
			</div>

			{/* 부채 섹션 */}
			<div className="mt-2 border-t border-border pt-2">
				<div className="flex items-center justify-between px-4 py-2">
					<h3 className="text-sm font-semibold text-muted-foreground">
						부채 ({debts.length})
					</h3>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 gap-1 text-xs text-primary"
						onClick={() => setAddingType("debt")}
					>
						<Plus className="h-3.5 w-3.5" />
						추가
					</Button>
				</div>
				<AnimatePresence mode="popLayout">
					{debts.length === 0 ? (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="px-4 py-6 text-center text-xs text-muted-foreground"
						>
							등록된 부채가 없습니다
						</motion.p>
					) : (
						debts.map((account) => (
							<AccountItem
								key={account.id}
								account={account}
								onEdit={setEditingAccount}
								onDelete={handleDelete}
								disabled={isPending}
							/>
						))
					)}
				</AnimatePresence>
			</div>

			{/* 수정 시트 */}
			{editingAccount && (
				<AccountFormSheet
					open={!!editingAccount}
					onOpenChange={(open) => { if (!open) setEditingAccount(null); }}
					mode="edit"
					account={editingAccount}
					onUpdated={handleUpdated}
				/>
			)}

			{/* 추가 시트 */}
			{addingType && (
				<AccountFormSheet
					open={!!addingType}
					onOpenChange={(open) => { if (!open) setAddingType(null); }}
					mode="create"
					defaultType={addingType}
					onCreated={handleCreated}
				/>
			)}
		</>
	);
}
