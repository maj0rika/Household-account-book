"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { deleteUserAccount } from "@/server/actions/settings";

interface DeleteAccountDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);

	// Dialog 닫힐 때 상태 초기화 (삭제 진행 중에는 닫기 차단)
	const handleOpenChange = (nextOpen: boolean) => {
		// 삭제 요청 중에 닫히면 비밀번호 입력 상태와 서버 처리 상태가 어긋날 수 있어
		// pending 동안에는 사용자가 다이얼로그를 닫지 못하게 막는다.
		if (!nextOpen && isPending) return;
		if (!nextOpen) {
			setPassword("");
			setError("");
		}
		onOpenChange(nextOpen);
	};

	const handleDelete = () => {
		startTransition(async () => {
			startLoading();
			try {
				const result = await deleteUserAccount(password);

				if (!result.success) {
					setError(result.error);
					return;
				}

				// DB 삭제와 브라우저 세션 정리는 분리돼 있으므로
				// 서버 성공 후 클라이언트 세션도 명시적으로 정리하고 로그인 화면으로 보낸다.
				// 세션 정리 후 로그인 페이지로 이동
				await authClient.signOut();
				router.push("/login");
			} catch {
				setError("계정 삭제 중 오류가 발생했습니다.");
			} finally {
				stopLoading();
			}
		});
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>계정을 삭제하시겠습니까?</AlertDialogTitle>
					<AlertDialogDescription>
						모든 데이터(거래내역, 카테고리, 예산, 자산)가 영구 삭제됩니다.
						이 작업은 되돌릴 수 없습니다.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-2">
					<Label htmlFor="delete-password">비밀번호</Label>
					<Input
						id="delete-password"
						type="password"
						placeholder="비밀번호를 입력하세요"
						value={password}
						onChange={(e) => {
							setPassword(e.target.value);
							setError("");
						}}
						disabled={isPending}
					/>
					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
					<Button
						variant="destructive"
						disabled={!password || isPending}
						onClick={handleDelete}
					>
						{showSpinner && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						삭제
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
