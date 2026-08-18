"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordSection() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [pending, setPending] = useState(false);

	const handleSubmit = async () => {
		setError(null);
		setDone(false);
		if (newPassword.length < 8) {
			setError("새 비밀번호는 8자 이상이어야 합니다.");
			return;
		}
		setPending(true);
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true,
		});
		setPending(false);
		if (result.error) {
			setError(result.error.message ?? "비밀번호 변경에 실패했습니다.");
			return;
		}
		setCurrentPassword("");
		setNewPassword("");
		setDone(true);
	};

	return (
		<div className="space-y-3">
			<h3 className="text-sm font-semibold">비밀번호 변경</h3>
			<p className="text-xs text-muted-foreground">
				로그인된 상태에서만 변경할 수 있습니다. 이메일 재설정 메일은 보내지 않습니다.
			</p>
			<div className="grid gap-2">
				<Label htmlFor="current-password">현재 비밀번호</Label>
				<Input
					id="current-password"
					type="password"
					value={currentPassword}
					onChange={(event) => setCurrentPassword(event.target.value)}
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="new-password">새 비밀번호</Label>
				<Input
					id="new-password"
					type="password"
					value={newPassword}
					onChange={(event) => setNewPassword(event.target.value)}
				/>
			</div>
			<Button className="w-full" onClick={handleSubmit} disabled={pending || !currentPassword || !newPassword}>
				{pending ? "변경 중..." : "비밀번호 변경"}
			</Button>
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
			{done ? <p className="text-xs text-muted-foreground">비밀번호를 변경했습니다.</p> : null}
		</div>
	);
}
