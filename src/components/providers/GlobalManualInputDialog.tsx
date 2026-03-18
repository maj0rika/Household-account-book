"use client";

import dynamic from "next/dynamic";

import { useManualInput } from "@/components/providers/ManualInputProvider";

const LazyManualInputDialog = dynamic(
	() => import("@/components/transaction/ManualInputDialog").then((module) => module.ManualInputDialog),
	{
		ssr: false,
	},
);

export function GlobalManualInputDialog() {
	const { isOpen, close } = useManualInput();

	if (!isOpen) {
		return null;
	}

	return (
		<LazyManualInputDialog
			open={isOpen}
			// 실제 다이얼로그는 레이아웃 루트에 하나만 두고,
			// 각 화면은 context만 호출해 중복 mount 없이 같은 폼을 공유한다.
			onOpenChange={(open) => { if (!open) close(); }}
		/>
	);
}
