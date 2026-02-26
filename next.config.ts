import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "10mb",
		},
	},

	// 패키지 import 최적화 — tree-shaking 강화
	optimizePackageImports: [
		"lucide-react",
		"recharts",
		"motion",
		"@radix-ui/react-icons",
	],

	// 서버 번들에서 제외 — Node.js 네이티브로 처리
	serverExternalPackages: ["pg"],

	async headers() {
		return [
			{
				source: "/sw.js",
				headers: [
					{ key: "Cache-Control", value: "no-cache" },
					{ key: "Service-Worker-Allowed", value: "/" },
				],
			},
			{
				source: "/manifest.json",
				headers: [
					{ key: "Cache-Control", value: "no-cache" },
				],
			},
			// 정적 에셋 immutable 캐시 (해시 기반 파일명이라 안전)
			{
				source: "/_next/static/(.*)",
				headers: [
					{ key: "Cache-Control", value: "public, max-age=31536000, immutable" },
				],
			},
			// 폰트 파일 장기 캐시
			{
				source: "/(.*)\\.woff2",
				headers: [
					{ key: "Cache-Control", value: "public, max-age=31536000, immutable" },
				],
			},
		];
	},
};

export default nextConfig;
