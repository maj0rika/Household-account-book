"use client";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="ko">
			<body>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
					<h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
						예기치 않은 오류가 발생했습니다
					</h2>
					<p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.875rem" }}>
						{error.digest ? `오류 코드: ${error.digest}` : "잠시 후 다시 시도해 주세요."}
					</p>
					<button
						onClick={reset}
						style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid #ccc", cursor: "pointer", fontSize: "0.875rem" }}
					>
						다시 시도
					</button>
				</div>
			</body>
		</html>
	);
}
