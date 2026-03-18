import Link from "next/link";

export default function NotFound() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-labelledby="not-found-title">
			<h1 id="not-found-title" className="text-4xl font-bold">404</h1>
			<p className="text-muted-foreground">페이지를 찾을 수 없습니다.</p>
			<Link
				href="/transactions"
				className="text-sm text-primary underline underline-offset-4"
			>
				홈으로 돌아가기
			</Link>
		</main>
	);
}
