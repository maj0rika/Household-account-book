// 성능 계측 유틸 — performance.mark/measure 기반
// 개발 환경에서만 콘솔 출력, 프로덕션에서는 마크만 기록 (브라우저 DevTools에서 확인 가능)

const IS_DEV = process.env.NODE_ENV === "development";

// 고유 ID 생성 (동시 측정 충돌 방지)
let seq = 0;
const nextId = () => ++seq;

/**
 * 성능 마크 시작. 반환된 함수를 호출하면 측정 완료 + 로그 출력.
 *
 * @example
 * const end = perfStart("tab-switch");
 * // ... 작업 ...
 * end(); // [perf] tab-switch: 142ms
 */
export function perfStart(label: string): () => number {
	const id = nextId();
	const startMark = `${label}-start-${id}`;

	if (typeof performance === "undefined") return () => 0;

	performance.mark(startMark);

	return () => {
		const endMark = `${label}-end-${id}`;
		const measureName = `${label}-${id}`;

		performance.mark(endMark);

		try {
			const entry = performance.measure(measureName, startMark, endMark);
			const ms = Math.round(entry.duration);

			if (IS_DEV) {
				console.log(`[perf] ${label}: ${ms}ms`);
			}

			// 측정 완료 후 마크 정리
			performance.clearMarks(startMark);
			performance.clearMarks(endMark);
			performance.clearMeasures(measureName);

			return ms;
		} catch {
			return 0;
		}
	};
}

/**
 * 비동기 액션의 실행 시간을 측정하는 래퍼.
 *
 * @example
 * const result = await perfAction("save-tx", () => saveTx(data));
 */
export async function perfAction<T>(label: string, fn: () => Promise<T>): Promise<T> {
	const end = perfStart(`action:${label}`);
	try {
		return await fn();
	} finally {
		end();
	}
}
