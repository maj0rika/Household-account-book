"use client";

// 파일 역할:
// - App Router 페이지 엔트리 파일이다.
// 사용 위치:
// - App Router가 `/login` 경로를 렌더링할 때 직접 사용한다;
// 흐름:
// - 라우트 진입점에서 필요한 데이터 조회와 화면 조합을 맡고, 세부 상호작용은 하위 컴포넌트로 위임한다;
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

export default function LoginPage() {
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

		const { error } = await authClient.signIn.email({
			email,
			password,
			rememberMe,
			callbackURL: "/",
		});

		if (error) {
			setErrorMessage(mapAuthClientError(error, "login"));
			setIsLoading(false);
			return;
		}

		router.push("/");
		router.refresh();
	};

	return (
		<main className="flex min-h-dvh items-center justify-center px-4">
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
					<form className="space-y-3" onSubmit={handleSubmit}>
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
								className="text-sm font-normal text-muted-foreground cursor-pointer"
							>
								자동 로그인
							</Label>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "로그인 중..." : "로그인"}
						</Button>
					</form>

					{errorMessage && (
						<p className="text-center text-sm text-destructive">{errorMessage}</p>
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

					<p className="text-center text-xs text-muted-foreground/60">
						<Link href="/terms" className="hover:underline">이용약관</Link>
						{" · "}
						<Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
