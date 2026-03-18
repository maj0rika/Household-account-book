import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppSplashScreen } from "@/components/common/SplashScreen";
import { getRequestSiteBaseURL } from "@/lib/site-url";

// 루트 레이아웃은 모든 페이지가 공유하는 전역 메타데이터와 폰트, 초기 UI 껍데기를 담당한다.
// 특히 metadataBase는 배포 URL 하나로 고정하면 preview, 로컬 포트, 프록시 환경에서 틀어질 수 있어
// 요청 헤더를 읽는 `generateMetadata()` 안에서 매 요청마다 계산한다.
const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
	display: "swap",
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
	display: "swap",
});

const pretendard = localFont({
	src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
	variable: "--font-pretendard",
	display: "optional",
	preload: false,
	weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
	// 모듈 상수 `metadata`로 두면 서버 시작 시점의 fallback URL이 굳어질 수 있다.
	// 함수형 메타데이터로 바꿔 실제 요청 origin을 기준으로 Open Graph, Twitter image, canonical 상대경로를 해석한다.
	const requestHeaders = await headers();
	const metadataBase = new URL(getRequestSiteBaseURL(requestHeaders));

	return {
		metadataBase,
		title: "가계부 — AI 자동 분류 가계부",
		description: "자연어로 입력하면 AI가 자동 분류하는 스마트 가계부",
		manifest: "/manifest.json",
		verification: {
			google: "6oyxHvAc_wnE7jBVHAIP7OwI8KdU2MgaWibbaipragY",
		},
		icons: {
			icon: "/favicon.ico",
			apple: "/icons/apple-touch-icon.png",
		},
		appleWebApp: {
			capable: true,
			statusBarStyle: "black-translucent",
			title: "가계부",
		},
		openGraph: {
			type: "website",
			title: "가계부 — AI 자동 분류 가계부",
			description: "자연어로 입력하면 AI가 자동 분류하는 스마트 가계부",
			images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "가계부 앱 아이콘" }],
			locale: "ko_KR",
		},
		twitter: {
			card: "summary",
			title: "가계부 — AI 자동 분류 가계부",
			description: "자연어로 입력하면 AI가 자동 분류하는 스마트 가계부",
			images: ["/icons/icon-512.png"],
		},
	};
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#2da562" },
		{ media: "(prefers-color-scheme: dark)", color: "#0f2418" },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ko" suppressHydrationWarning>
			<body
				className={`${pretendard.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{/* skip link는 모바일 하단 탭과 긴 대시보드 구조를 건너뛰고
					메인 landmark로 바로 진입해야 하는 키보드 사용자에게 가장 먼저 제공한다. */}
				<a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
				{/* 전역 스플래시는 앱 첫 진입과 라우트 전환 초반의 체감 공백을 메운다. */}
				<AppSplashScreen />
				{children}
			</body>
		</html>
	);
}
