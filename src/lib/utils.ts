// 공용 `cn()` 유틸이다.
// shadcn/ui 프리미티브와 도메인 컴포넌트가 Tailwind 클래스 충돌 없이 className을 합칠 때 사용한다.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	// shadcn/ui 프리미티브와 도메인 컴포넌트가 가장 자주 부르는 공용 진입점이다.
	// `px-2 px-4` 같은 Tailwind 충돌을 마지막 값 기준으로 정리해 예상 가능한 스타일을 유지한다.
	return twMerge(clsx(inputs));
}
