// LLM provider별 클라이언트 설정 — OpenAI SDK로 다중 벤더(MiniMax, Kimi, Fireworks)를 통일 인터페이스로 관리
// getLLMConfig("minimax")    → { client: OpenAI(minimax.io), model:"MiniMax-M2.5", ... }
// getLLMConfig("kimi")       → { client: OpenAI(moonshot.ai), model:"kimi-k2.5", ... }
// getLLMConfig("fireworks")  → { client: OpenAI(fireworks.ai), model:"kimi-k2p5", ... }
// getLLMConfig()             → env LLM_PROVIDER 또는 기본값 "kimi"
import OpenAI from "openai";

export type LLMProvider = "minimax" | "kimi" | "fireworks";

interface LLMConfig {
	client: OpenAI;
	model: string;
	temperature: number;
	max_tokens: number;
	response_format?: { type: "json_object" | "text" } | { type: "json_schema"; json_schema: { name: string; schema: Record<string, unknown> } };
	extra_body?: Record<string, unknown>;
}

// provider별 설정 팩토리 — 호출 시점에 생성 (지연 초기화)
// 핵심: baseURL만 바꿔서 동일한 OpenAI SDK로 Kimi/Fireworks 모두 호출
const configs: Record<LLMProvider, () => LLMConfig> = {
	minimax: () => ({
		client: new OpenAI({
			apiKey: process.env.MINIMAX_API_KEY,
			baseURL: "https://api.minimax.io/v1",
		}),
		model: "MiniMax-M2.5",
		temperature: 1.0, // 공식 권장값 — M2.5는 temp 1.0에서 최적 성능 설계
		max_tokens: 2048,
		response_format: { type: "json_object" },
		extra_body: {
			reasoning_split: false,
		},
	}),
	kimi: () => ({
		client: new OpenAI({
			apiKey: process.env.KIMI_API_KEY,
			baseURL: "https://api.moonshot.ai/v1",
		}),
		model: "kimi-k2.5",
		temperature: 1, // K2.5는 temperature 1 고정
		max_tokens: 2048,
		response_format: { type: "json_object" },
		extra_body: {
			chat_template_kwargs: { thinking: false },
		},
	}),
	fireworks: () => ({
		client: new OpenAI({
			apiKey: process.env.FIREWORKS_API_KEY,
			baseURL: "https://api.fireworks.ai/inference/v1",
		}),
		model: "accounts/fireworks/models/kimi-k2p5",
		temperature: 1,
		max_tokens: 2048,
		response_format: {
			type: "json_schema",
			json_schema: {
				name: "household_parse",
				schema: {
					type: "object",
					properties: {
						intent: { type: "string", enum: ["transaction", "account"] },
						transactions: {
							type: "array",
							items: {
								type: "object",
								properties: {
									date: { type: "string" },
									type: { type: "string", enum: ["expense", "income"] },
									category: { type: "string" },
									description: { type: "string" },
									amount: { type: "number" },
									isRecurring: { type: "boolean" },
									dayOfMonth: { type: ["integer", "null"] },
									suggestedCategory: { type: ["string", "null"] },
								},
							},
						},
						accounts: {
							type: "array",
							items: {
								type: "object",
								properties: {
									name: { type: "string" },
									type: { type: "string", enum: ["asset", "debt"] },
									subType: { type: "string" },
									icon: { type: "string" },
									balance: { type: "number" },
								},
							},
						},
						rejected: { type: "boolean" },
						reason: { type: "string" },
					},
				},
			},
		},
	}),
};

// 싱글턴 캐시 — 같은 provider는 한 번만 생성하고 재사용
// getLLMConfig("kimi") 철회 호출: 생성 + 캐시 → 2회부터: 캐시에서 바로 반환
const cache = new Map<LLMProvider, LLMConfig>();

// provider 결정: 인자 > 환경변수 > "kimi" 기본값
export function getLLMConfig(provider?: LLMProvider): LLMConfig {
	const resolved = provider || (process.env.LLM_PROVIDER as LLMProvider) || "kimi";

	if (cache.has(resolved)) return cache.get(resolved)!;

	if (!configs[resolved]) {
		throw new Error(`Unknown LLM provider: ${resolved}. Use "minimax", "kimi" or "fireworks".`);
	}

	const config = configs[resolved]();
	cache.set(resolved, config);
	return config;
}
