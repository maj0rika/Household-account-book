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

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setErrorMessage(null);

		const { error } = await authClient.signUp.email({
			name,
			email,
			password,
			callbackURL: "/",
		});

		if (error) {
			setErrorMessage(error.message ?? "회원가입에 실패했습니다.");
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
					<h1 className="text-xl font-semibold">회원가입</h1>
					<p className="text-sm text-muted-foreground">
						가계부를 시작해보세요
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<form className="space-y-3" onSubmit={handleSubmit}>
						<div className="space-y-1.5">
							<Label htmlFor="name">이름</Label>
							<Input
								id="name"
								type="text"
								required
								placeholder="홍길동"
								value={name}
								onChange={(event) => setName(event.target.value)}
								autoComplete="name"
							/>
						</div>
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
								placeholder="8자 이상"
								minLength={8}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								autoComplete="new-password"
							/>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "가입 중..." : "회원가입"}
						</Button>
					</form>

					{errorMessage && (
						<p className="text-center text-sm text-destructive">{errorMessage}</p>
					)}

					<p className="text-center text-sm text-muted-foreground">
						이미 계정이 있나요?{" "}
						<Link
							href="/login"
							className="font-medium text-primary hover:underline"
						>
							로그인
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
