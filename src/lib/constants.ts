export type DefaultCategory = {
	name: string;
	icon: string;
	type: "expense" | "income";
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
	{ name: "식비", icon: "🍚", type: "expense" },
	{ name: "카페/간식", icon: "☕", type: "expense" },
	{ name: "교통", icon: "🚌", type: "expense" },
	{ name: "주거/관리비", icon: "🏠", type: "expense" },
	{ name: "생활용품", icon: "🛒", type: "expense" },
	{ name: "의류/미용", icon: "👕", type: "expense" },
	{ name: "의료/건강", icon: "🏥", type: "expense" },
	{ name: "통신", icon: "📱", type: "expense" },
	{ name: "여가/취미", icon: "🎮", type: "expense" },
	{ name: "교육", icon: "📚", type: "expense" },
	{ name: "경조사/선물", icon: "🎁", type: "expense" },
	{ name: "기타 지출", icon: "💳", type: "expense" },
	{ name: "급여", icon: "💰", type: "income" },
	{ name: "용돈/부수입", icon: "💵", type: "income" },
	{ name: "투자수익", icon: "📈", type: "income" },
	{ name: "기타 수입", icon: "💳", type: "income" },
];
