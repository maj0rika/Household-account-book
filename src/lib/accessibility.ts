// 접근성 경고를 막기 위해 시트/다이얼로그가 열리기 전에 남아 있는 포커스를 정리한다;
export const blurActiveElement = (): void => {
	if (typeof document === "undefined") {
		return;
	}

	const activeElement = document.activeElement;
	if (!activeElement || !("blur" in activeElement) || typeof activeElement.blur !== "function") {
		return;
	}

	activeElement.blur();
};
