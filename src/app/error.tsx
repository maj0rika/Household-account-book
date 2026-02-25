"use client";

import { useEffect } from "react";

export default function GlobalErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[AppErrorBoundary]", error);
	}, [error]);

	return (
		<div className="flex min-h-dvh items-center justify-center px-4">
			<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
				<h1 className="text-lg font-semibold">일시적인 오류가 발생했어요</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					앱을 다시 시도하면 대부분 해결됩니다. 같은 문제가 반복되면 입력 내용을 알려주세요.
				</p>
				<div className="mt-4 flex items-center justify-center gap-2">
					<button
						type="button"
						onClick={reset}
						className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
					>
						다시 시도
					</button>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="rounded-md border border-border px-3 py-2 text-sm"
					>
						새로고침
					</button>
				</div>
			</div>
		</div>
	);
}
