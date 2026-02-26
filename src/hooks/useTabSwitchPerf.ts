"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { perfStart } from "@/lib/perf";

/**
 * 탭 전환(클릭~pathname 변경) 시간을 측정한다.
 * 클릭 시 startMeasure()를 호출하면, pathname 변경 감지 시 자동 종료.
 */
export function useTabSwitchPerf() {
	const endRef = useRef<(() => number) | null>(null);
	const pathname = usePathname();

	// pathname이 변경되면 측정 종료
	useEffect(() => {
		if (endRef.current) {
			endRef.current();
			endRef.current = null;
		}
	}, [pathname]);

	const startMeasure = useCallback(() => {
		// 이전 측정이 미완료면 정리
		if (endRef.current) {
			endRef.current();
		}
		endRef.current = perfStart("tab-switch");
	}, []);

	return { startMeasure };
}
