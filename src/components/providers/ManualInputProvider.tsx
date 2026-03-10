"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ManualInputContextValue {
	isOpen: boolean;
	open: () => void;
	close: () => void;
}

const ManualInputContext = createContext<ManualInputContextValue | null>(null);

export function ManualInputProvider({ children }: { children: React.ReactNode }) {
	// 수동 입력 다이얼로그 열림 상태를 전역으로 올려
	// 어느 탭/컴포넌트에서도 같은 진입점을 재사용할 수 있게 한다.
	const [isOpen, setIsOpen] = useState(false);
	const open = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => setIsOpen(false), []);

	return (
		<ManualInputContext.Provider value={{ isOpen, open, close }}>
			{children}
		</ManualInputContext.Provider>
	);
}

export function useManualInput(): ManualInputContextValue {
	const ctx = useContext(ManualInputContext);
	if (!ctx) {
		throw new Error("useManualInput must be used within ManualInputProvider");
	}
	return ctx;
}
