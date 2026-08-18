"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exportUserData } from "@/server/actions/export";

export function DataExportSection() {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const handleExport = () => {
		setError(null);
		startTransition(async () => {
			const result = await exportUserData();
			if (!result.success) {
				setError(result.error);
				return;
			}

			const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `household-export-${result.data.exportedAt.slice(0, 10)}.json`;
			link.click();
			URL.revokeObjectURL(url);
		});
	};

	return (
		<div className="space-y-3">
			<h3 className="text-sm font-semibold">데이터 내보내기</h3>
			<p className="text-xs text-muted-foreground">
				거래, 계좌, 예산, 고정거래를 JSON으로 내려받습니다. 계정 삭제 전에 먼저 내보내세요.
			</p>
			<Button variant="outline" className="w-full" onClick={handleExport} disabled={isPending}>
				<Download className="mr-2 h-4 w-4" />
				{isPending ? "내보내는 중..." : "내 데이터 다운로드"}
			</Button>
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
