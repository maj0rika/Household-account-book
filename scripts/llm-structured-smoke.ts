import "dotenv/config";

import { getLLMConfig } from "../src/server/llm/client";
import { LLM_PARSE_RESPONSE_FORMAT, parseLlmContent } from "../src/server/llm/parse-schema";

const provider = (process.env.LLM_PROVIDER ?? "kimi") as "kimi" | "fireworks" | "minimax";
const keyByProvider = {
	kimi: process.env.KIMI_API_KEY,
	fireworks: process.env.FIREWORKS_API_KEY,
	minimax: process.env.MINIMAX_API_KEY,
};

if (!keyByProvider[provider]) {
	throw new Error(`LLM structured smoke requires ${provider.toUpperCase()}_API_KEY`);
}

async function main(): Promise<void> {
	const { client, model, temperature, extra_body } = getLLMConfig(provider);
	const response = await client.chat.completions.create({
		model,
		messages: [
			{
				role: "system",
				content: "Return household-parse-v1 JSON only.",
			},
			{
				role: "user",
				content: "CU 3500원",
			},
		],
		temperature,
		response_format: LLM_PARSE_RESPONSE_FORMAT,
		...extra_body,
	});

	const content = response.choices[0]?.message?.content;
	if (!content) {
		throw new Error("LLM 응답이 비어 있습니다.");
	}

	const parsed = parseLlmContent(content);
	if (parsed.transactions.length === 0 && parsed.accounts.length === 0) {
		throw new Error("파싱 결과가 비어 있습니다.");
	}

	process.stdout.write(`structured-output smoke passed: ${provider} ${model}\n`);
}

main().catch((error: unknown) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
});
