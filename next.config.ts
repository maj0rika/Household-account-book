// 파일 역할:
// - Next.js 전역 동작과 캐시 정책을 설정하는 파일이다.
// 사용 위치:
// - Next.js 서버 시작, 빌드, 정적 자산 응답 단계에서 전역 설정으로 사용된다;
// 흐름:
// - Next.js가 앱을 기동/빌드할 때 이 설정을 읽고, 서버 액션 크기 제한과 정적 자산 캐시 헤더를 전역 규칙으로 적용한다;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			// 자연어 입력, 이미지 base64, 멀티 거래 파싱 요청이 커질 수 있어 기본 제한보다 넉넉하게 잡는다.
			bodySizeLimit: "10mb",
		},
		// 패키지 import 최적화 — tree-shaking 강화
		optimizePackageImports: [
			"lucide-react",
			"recharts",
			"motion",
			"@radix-ui/react-icons",
		],
	},

	// 서버 번들에서 제외 — Node.js 네이티브로 처리
	serverExternalPackages: ["pg"],

	async headers() {
		// 서비스워커/manifest는 빠른 반영이 중요해 no-cache,
		// 해시 기반 정적 자산은 immutable로 길게 캐시해 성능을 챙긴다.
		const headers = [
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
		];

		if (process.env.NODE_ENV === "production") {
			headers.push(
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
			);
		}

		return headers;
	},
};

export default nextConfig;
