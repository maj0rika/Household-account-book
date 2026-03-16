function hasStatus(value: unknown): value is { status?: number } {
	return typeof value === "object" && value !== null && "status" in value;
}

function hasMessage(value: unknown): value is { message?: string } {
	return typeof value === "object" && value !== null && "message" in value;
}

export function mapAuthClientError(
	error: unknown,
	mode: "login" | "register",
): string {
	const message = hasMessage(error) && typeof error.message === "string"
		? error.message.toLowerCase()
		: "";
	const status = hasStatus(error) && typeof error.status === "number"
		? error.status
		: null;

	if (status === 429 || message.includes("too many requests")) {
		return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
	}

	if (mode === "login") {
		return "이메일 또는 비밀번호를 확인해 주세요.";
	}

	return "회원가입을 완료하지 못했습니다. 입력값을 확인하고 다시 시도해 주세요.";
}
