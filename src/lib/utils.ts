// 파일 역할:
// - 클라이언트와 서버가 함께 쓰는 공용 유틸 파일이다.
// 사용 위치:
// - `src/components/dashboard/CalendarView.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/components/layout/BottomTabBar.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/components/layout/Sidebar.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 각 컴포넌트가 조건부 class 조각을 넘기면, 이 파일이 `clsx`로 1차 합치고 `tailwind-merge`로 충돌 클래스를 정리해 최종 className 문자열을 돌려준다;
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	// shadcn/ui 프리미티브와 도메인 컴포넌트가 가장 자주 부르는 공용 진입점이다.
	// `px-2 px-4` 같은 Tailwind 충돌을 마지막 값 기준으로 정리해 예상 가능한 스타일을 유지한다.
	return twMerge(clsx(inputs));
}
