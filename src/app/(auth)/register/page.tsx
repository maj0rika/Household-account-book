"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

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
		<main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
			<h1 className="text-2xl font-semibold">회원가입</h1>
			<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
				<input
					type="text"
					required
					placeholder="이름"
					value={name}
					onChange={(event) => setName(event.target.value)}
					className="w-full rounded border px-3 py-2"
				/>
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
					{isLoading ? "가입 중..." : "이메일 회원가입"}
				</button>
			</form>
			{errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
			<p className="mt-4 text-sm text-muted-foreground">
				이미 계정이 있나요? <Link href="/login">로그인</Link>
			</p>
		</main>
	);
}
