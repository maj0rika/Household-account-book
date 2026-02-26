"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 네트워크 액션 시 200ms 이후에만 로딩 인디케이터를 표시하는 훅.
 * 빠른 응답(<200ms)에서는 로딩 깜빡임을 방지한다.
 *
 * @param delayMs 로딩 표시 지연 시간 (기본 200ms)
 * @returns { isLoading, showSpinner, startLoading, stopLoading }
 */
export function useDeferredLoading(delayMs = 200) {
	const [isLoading, setIsLoading] = useState(false);
	const [showSpinner, setShowSpinner] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const cleanup = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const startLoading = useCallback(() => {
		setIsLoading(true);
		cleanup();
		timerRef.current = setTimeout(() => {
			setShowSpinner(true);
		}, delayMs);
	}, [delayMs, cleanup]);

	const stopLoading = useCallback(() => {
		cleanup();
		setIsLoading(false);
		setShowSpinner(false);
	}, [cleanup]);

	useEffect(() => cleanup, [cleanup]);

	return { isLoading, showSpinner, startLoading, stopLoading };
}
