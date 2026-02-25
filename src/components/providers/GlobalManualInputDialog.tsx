"use client";

import { ManualInputDialog } from "@/components/transaction/ManualInputDialog";
import { useManualInput } from "@/components/providers/ManualInputProvider";

export function GlobalManualInputDialog() {
	const { isOpen, close } = useManualInput();

	return (
		<ManualInputDialog
			open={isOpen}
			onOpenChange={(open) => { if (!open) close(); }}
		/>
	);
}
