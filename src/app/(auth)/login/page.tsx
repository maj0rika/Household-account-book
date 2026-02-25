"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const isGoogleAuthEnabled =
	process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setErrorMessage(null);

		const { error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: "/",
		});

		if (error) {
			setErrorMessage(error.message ?? "로그인에 실패했습니다.");
			setIsLoading(false);
			return;
		}

		router.push("/");
		router.refresh();
	};

	const handleGoogleSignIn = async () => {
		setErrorMessage(null);
		await authClient.signIn.social({
			provider: "google",
			callbackURL: "/",
		});
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
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "로그인 중..." : "로그인"}
						</Button>
					</form>

					{isGoogleAuthEnabled && (
						<>
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-card px-2 text-muted-foreground">또는</span>
								</div>
							</div>

							<Button
								type="button"
								variant="outline"
								className="w-full"
								onClick={handleGoogleSignIn}
							>
								<svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
									<path
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
										fill="#4285F4"
									/>
									<path
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										fill="#34A853"
									/>
									<path
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										fill="#FBBC05"
									/>
									<path
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										fill="#EA4335"
									/>
								</svg>
								Google 계정으로 로그인
							</Button>
						</>
					)}

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
				</CardContent>
			</Card>
		</main>
	);
}
