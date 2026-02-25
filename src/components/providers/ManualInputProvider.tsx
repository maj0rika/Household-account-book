"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ManualInputContextValue {
	isOpen: boolean;
	open: () => void;
	close: () => void;
}

const ManualInputContext = createContext<ManualInputContextValue | null>(null);

export function ManualInputProvider({ children }: { children: React.ReactNode }) {
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
