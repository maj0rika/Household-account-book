"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

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
		<main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
			<h1 className="text-2xl font-semibold">로그인</h1>
			<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
				<input
					type="email"
					required
					placeholder="이메일"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className="w-full rounded border px-3 py-2"
				/>
				<input
					type="password"
					required
					placeholder="비밀번호"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className="w-full rounded border px-3 py-2"
				/>
				<button
					type="submit"
					disabled={isLoading}
					className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
				>
					{isLoading ? "로그인 중..." : "이메일 로그인"}
				</button>
			</form>
			<button
				type="button"
				onClick={handleGoogleSignIn}
				className="mt-3 w-full rounded border px-3 py-2"
			>
				Google 로그인
			</button>
			{errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
			<p className="mt-4 text-sm text-muted-foreground">
				계정이 없나요? <Link href="/register">회원가입</Link>
			</p>
		</main>
	);
}
