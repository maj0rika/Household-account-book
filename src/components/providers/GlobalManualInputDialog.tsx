"use client";

import { ManualInputDialog } from "@/components/transaction/ManualInputDialog";
import { useManualInput } from "@/components/providers/ManualInputProvider";

export function GlobalManualInputDialog() {
	const { isOpen, close } = useManualInput();

	return (
		<ManualInputDialog
			open={isOpen}
			// 실제 다이얼로그는 레이아웃 루트에 하나만 두고,
			// 각 화면은 context만 호출해 중복 mount 없이 같은 폼을 공유한다.
			onOpenChange={(open) => { if (!open) close(); }}
		/>
	);
}
