export type LLMProvider = "minimax" | "kimi" | "fireworks";

export interface RuntimeModel {
	provider: LLMProvider;
	model: string;
	surface: "chat.completions";
	notes: string;
}

export const RUNTIME_MODELS: Record<LLMProvider, RuntimeModel> = {
	kimi: {
		provider: "kimi",
		model: "kimi-k3",
		surface: "chat.completions",
		notes: "Direct Moonshot. K2.5 sunsets 2026-08-31. reasoning_effort=low for extraction.",
	},
	fireworks: {
		provider: "fireworks",
		model: "accounts/fireworks/models/kimi-k3",
		surface: "chat.completions",
		notes: "Hosted K3. Legacy kimi-k2p5 is not used.",
	},
	minimax: {
		provider: "minimax",
		model: "MiniMax-M2.5",
		surface: "chat.completions",
		notes: "M2.5 is still listed. Not a date-driven P0 replacement.",
	},
};

export function listRuntimeModels(): RuntimeModel[] {
	return Object.values(RUNTIME_MODELS);
}
