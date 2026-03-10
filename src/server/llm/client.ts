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
		temperature: 1,
		extra_body: {
			reasoning_split: true,
		},
	}),
	kimi: () => ({
		client: new OpenAI({
			apiKey: process.env.KIMI_API_KEY,
			baseURL: "https://api.moonshot.ai/v1",
		}),
		model: "kimi-k2.5",
		temperature: 1, // K2.5는 temperature 1 고정
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
