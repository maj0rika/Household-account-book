import OpenAI from "openai";

export type LLMProvider = "kimi" | "fireworks";

interface LLMConfig {
	client: OpenAI;
	model: string;
	temperature: number;
	extra_body?: Record<string, unknown>;
}

const configs: Record<LLMProvider, () => LLMConfig> = {
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

// provider별 캐시
const cache = new Map<LLMProvider, LLMConfig>();

export function getLLMConfig(provider?: LLMProvider): LLMConfig {
	const resolved = provider || (process.env.LLM_PROVIDER as LLMProvider) || "kimi";

	if (cache.has(resolved)) return cache.get(resolved)!;

	if (!configs[resolved]) {
		throw new Error(`Unknown LLM provider: ${resolved}. Use "kimi" or "fireworks".`);
	}

	const config = configs[resolved]();
	cache.set(resolved, config);
	return config;
}
