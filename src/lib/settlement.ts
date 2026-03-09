interface SettlementSourceLike {
	sourceType?: "text" | "image" | "manual" | null;
	sourceService?: "kakao" | "toss" | "unknown" | null;
}

export function getSettlementSourceLabel(source: SettlementSourceLike): string | null {
	if (source.sourceService === "kakao") return "카카오 정산";
	if (source.sourceService === "toss") return "토스 정산";
	if (source.sourceType === "image") return "이미지 정산";
	if (source.sourceType === "manual") return "수동 정산";
	return null;
}
