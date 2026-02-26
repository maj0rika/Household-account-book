"use client";

import { useEffect, useRef } from "react";
import { perfStart } from "@/lib/perf";

/**
 * 컴포넌트 마운트→첫 paint 근사 시간을 측정한다.
 * useEffect는 paint 직후에 실행되므로 마운트~paint 근사치로 사용.
 *
 * @param label 측정 라벨 (예: "transactions-page")
 */
export function useRenderPerf(label: string): void {
	const endRef = useRef<(() => number) | null>(null);

	// 마운트 시 시작 마크 (렌더 함수 내에서 동기적으로 호출)
	if (endRef.current === null) {
		endRef.current = perfStart(`render:${label}`);
	}

	useEffect(() => {
		// paint 직후 측정 완료
		if (endRef.current) {
			endRef.current();
			endRef.current = null;
		}
	}, []);
}
