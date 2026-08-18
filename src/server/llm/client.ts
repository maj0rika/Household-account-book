// LLM provider별 클라이언트 설정 — OpenAI SDK로 다중 벤더를 통일 인터페이스로 관리
// 런타임은 한 요청에 한 provider만 호출한다. 모델 ID는 models.ts와 같아야 한다.
import OpenAI from "openai";

import { RUNTIME_MODELS, type LLMProvider } from "./models";

export type { LLMProvider };

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
		model: RUNTIME_MODELS.minimax.model,
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
		model: RUNTIME_MODELS.kimi.model,
		temperature: 1,
		extra_body: {
			reasoning_effort: "low",
		},
	}),
	fireworks: () => ({
		client: new OpenAI({
			apiKey: process.env.FIREWORKS_API_KEY,
			baseURL: "https://api.fireworks.ai/inference/v1",
		}),
		model: RUNTIME_MODELS.fireworks.model,
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
