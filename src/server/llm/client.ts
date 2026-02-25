import OpenAI from "openai";

type LLMProvider = "openai" | "kimi";

interface LLMConfig {
	client: OpenAI;
	model: string;
	temperature: number;
	extra_body?: Record<string, unknown>;
}

const configs: Record<LLMProvider, () => LLMConfig> = {
	openai: () => ({
		client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
		model: "gpt-4o-mini",
		temperature: 0.1,
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
};

let cached: LLMConfig | null = null;

export function getLLMConfig(): LLMConfig {
	if (cached) return cached;

	const provider = (process.env.LLM_PROVIDER || "openai") as LLMProvider;

	if (!configs[provider]) {
		throw new Error(`Unknown LLM provider: ${provider}. Use "openai" or "kimi".`);
	}

	cached = configs[provider]();
	return cached;
}
