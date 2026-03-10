interface SettlementTransferHint {
	direction: "receive" | "send";
	sourceService: "kakao" | "toss" | "unknown";
	amount: number;
	counterpartyName?: string;
}

interface SettlementTransferHintOptions {
	hasOpenSettlements: boolean;
}

const EXPLICIT_SETTLEMENT_PATTERNS = [
	/정산/i,
	/n\s*\/\s*1/i,
	/1\s*\/\s*n/i,
	/더치페이/i,
	/내\s*몫/i,
	/보낼\s*금액/i,
	/받을\s*금액/i,
];

const SEND_KEYWORDS = [
	"송금 완료",
	"이체 완료",
	"보내기 완료",
	"송금했어요",
	"송금했습니다",
	"보냈어요",
	"보냈습니다",
];

function hasExplicitSettlementKeyword(input: string): boolean {
	return EXPLICIT_SETTLEMENT_PATTERNS.some((pattern) => pattern.test(input));
}

function detectSourceService(input: string): "kakao" | "toss" | "unknown" {
	if (
		input.includes("카카오페이")
		|| input.includes("카카오 정산")
		|| input.includes("카카오톡 정산")
		|| input.includes("카톡 정산")
	) {
		return "kakao";
	}

	if (input.includes("토스")) {
		return "toss";
	}

	return "unknown";
}

function extractAmount(input: string): number | null {
	const match = input.match(/(\d[\d,]*)\s*원/);
	if (!match) return null;

	const amount = Number(match[1].replaceAll(",", ""));
	if (!Number.isFinite(amount) || amount <= 0) return null;

	return amount;
}

function cleanCounterpartyName(value: string | undefined): string | undefined {
	if (!value) return undefined;

	const cleaned = value
		.replace(/\s+/g, " ")
		.replace(/님$/, "")
		.trim();

	if (!cleaned || cleaned.length < 2) return undefined;
	return cleaned;
}

function extractReceiveCounterparty(input: string): string | undefined {
	const patterns = [
		/([가-힣A-Za-z0-9]{2,20})님이\s*[\d,]+\s*원.*?(보냈어요|입금했어요|송금했어요|보냈습니다|입금했습니다|송금했습니다)/,
		/([가-힣A-Za-z0-9]{2,20})\s*[\d,]+\s*원.*?(입금|보냄)/,
	];

	for (const pattern of patterns) {
		const match = input.match(pattern);
		if (match) {
			return cleanCounterpartyName(match[1]);
		}
	}

	return undefined;
}

function extractSendCounterparty(input: string): string | undefined {
	const patterns = [
		/받는\s*분[:\s]*([가-힣A-Za-z0-9]{2,20})/,
		/([가-힣A-Za-z0-9]{2,20})(?:님)?(?:에게|한테)\s*[\d,]+\s*원.*?(송금|이체|보냈)/,
	];

	for (const pattern of patterns) {
		const match = input.match(pattern);
		if (match) {
			return cleanCounterpartyName(match[1]);
		}
	}

	return undefined;
}

function detectDirection(input: string): "receive" | "send" | null {
	if (
		/([가-힣A-Za-z0-9]{2,20})님이\s*[\d,]+\s*원.*?(보냈어요|입금했어요|송금했어요|보냈습니다|입금했습니다|송금했습니다)/.test(input)
	) {
		return "receive";
	}

	if (SEND_KEYWORDS.some((keyword) => input.includes(keyword))) {
		return "send";
	}

	return null;
}

export function detectSettlementTransferHint(
	input: string,
	options: SettlementTransferHintOptions,
): SettlementTransferHint | null {
	const normalized = input.replace(/\s+/g, " ").trim();
	if (!normalized) return null;

	const amount = extractAmount(normalized);
	if (!amount) return null;

	const explicitSettlement = hasExplicitSettlementKeyword(normalized);
	const sourceService = detectSourceService(normalized);
	const receiveCounterpartyName = extractReceiveCounterparty(normalized);
	const sendCounterpartyName = extractSendCounterparty(normalized);

	let direction = detectDirection(normalized);
	if (!direction && explicitSettlement) {
		if (/입금|받았|받음/.test(normalized)) {
			direction = "receive";
		}
		if (/송금|이체|보냈/.test(normalized)) {
			direction = "send";
		}
	}

	if (!direction) {
		return null;
	}

	if (!explicitSettlement && !options.hasOpenSettlements) {
		return null;
	}

	const counterpartyName = direction === "receive"
		? receiveCounterpartyName
		: sendCounterpartyName;

	if (!explicitSettlement && sourceService === "unknown" && !counterpartyName) {
		return null;
	}

	return {
		direction,
		sourceService,
		amount,
		counterpartyName,
	};
}

export function preprocessSettlementTransferMessage(
	input: string,
	options: SettlementTransferHintOptions,
): string {
	const normalized = input.trim();
	if (!normalized) return normalized;

	const hint = detectSettlementTransferHint(normalized, options);
	if (!hint) return normalized;

	const hintLines = [
		"[정산 이력 힌트]",
		"- settlementTransfers 우선 검토",
		`- direction: ${hint.direction}`,
		`- sourceService: ${hint.sourceService}`,
		`- amount: ${hint.amount}`,
	];

	if (hint.counterpartyName) {
		hintLines.push(`- counterpartyName: ${hint.counterpartyName}`);
	}

	return `${normalized}\n\n${hintLines.join("\n")}`;
}
