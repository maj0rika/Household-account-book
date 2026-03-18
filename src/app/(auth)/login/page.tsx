import { headers } from "next/headers";
import Script from "next/script";
import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { getRequestSiteBaseURL } from "@/lib/site-url";

export default async function LoginPage() {
	// 로그인 페이지의 JSON-LD도 레이아웃 메타데이터와 같은 origin 규칙을 써야
	// 크롤러가 보는 WebSite/SoftwareApplication URL이 `metadataBase`와 어긋나지 않는다.
	const requestHeaders = await headers();
	const baseUrl = getRequestSiteBaseURL(requestHeaders);
	const structuredData = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				name: "가계부",
				url: baseUrl,
				description: "자연어와 이미지 입력을 AI가 자동 분류하는 스마트 가계부 서비스",
				inLanguage: "ko-KR",
			},
			{
				"@type": "SoftwareApplication",
				name: "가계부",
				applicationCategory: "FinanceApplication",
				operatingSystem: "Web, iOS, Android",
				url: `${baseUrl}/login`,
				description: "자연어와 이미지 입력을 AI가 자동 분류해 거래 기록을 줄여주는 AI 가계부",
				featureList: [
					"자연어 거래 입력",
					"이미지 기반 거래 파싱",
					"AI 자동 분류",
					"예산 및 통계 관리",
					"자산/부채 관리",
				],
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "KRW",
				},
			},
		],
	};

	return (
		<>
			<Script
				id="login-structured-data"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{/* 구조화 데이터는 클라이언트 hydration 이후가 아니라 최초 HTML에 같이 들어가야
					검색 엔진이 로그인 화면을 수집할 때 origin과 서비스 설명을 바로 읽을 수 있다. */}
				{JSON.stringify(structuredData)}
			</Script>
			<LoginPageClient />
		</>
	);
}
