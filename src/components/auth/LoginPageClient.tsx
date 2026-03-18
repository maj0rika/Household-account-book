"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { mapAuthClientError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LoginPageClient() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(true);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setErrorMessage(null);

		// Better Auth callback과 클라이언트 replace를 같은 목적지로 맞춰
		// `/` 경유 없이 거래 화면으로 바로 수렴시킨다.
		const { error } = await authClient.signIn.email({
			email,
			password,
			rememberMe,
			callbackURL: "/transactions",
		});

		if (error) {
			setErrorMessage(mapAuthClientError(error, "login"));
			setIsLoading(false);
			return;
		}

		router.replace("/transactions");
	};

	return (
		<main id="main-content" tabIndex={-1} className="flex min-h-dvh items-center justify-center px-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center gap-2 pb-2">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
						<Wallet className="h-6 w-6 text-primary" />
					</div>
					<h1 className="text-xl font-semibold">가계부</h1>
					<p className="text-sm text-muted-foreground">
						AI가 자동 분류하는 스마트 가계부
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<form className="space-y-3" onSubmit={handleSubmit} aria-busy={isLoading}>
						<div className="space-y-1.5">
							<Label htmlFor="email">이메일</Label>
							<Input
								id="email"
								type="email"
								required
								placeholder="name@example.com"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								autoComplete="email"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="password">비밀번호</Label>
							<Input
								id="password"
								type="password"
								required
								placeholder="비밀번호 입력"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								autoComplete="current-password"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="rememberMe"
								checked={rememberMe}
								onCheckedChange={(checked) => setRememberMe(checked === true)}
							/>
							<Label
								htmlFor="rememberMe"
								className="cursor-pointer text-sm font-normal text-muted-foreground"
							>
								자동 로그인
							</Label>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "로그인 중..." : "로그인"}
						</Button>
					</form>

					{errorMessage && (
						<p className="text-center text-sm text-destructive" role="alert" aria-live="assertive">
							{errorMessage}
						</p>
					)}

					<p className="text-center text-sm text-muted-foreground">
						계정이 없나요?{" "}
						<Link
							href="/register"
							className="font-medium text-primary hover:underline"
						>
							회원가입
						</Link>
					</p>

					<p className="text-center text-xs text-muted-foreground">
						<Link href="/terms" className="hover:underline">이용약관</Link>
						{" · "}
						<Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
