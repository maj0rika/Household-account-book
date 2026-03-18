import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppSplashScreen } from "@/components/common/SplashScreen";

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
	display: "swap",
	weight: "100 900",
});

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.VERCEL_PROJECT_PRODUCTION_URL
			? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
			: "http://localhost:3000",
	),
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
				<a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
				{/* 전역 스플래시는 앱 첫 진입과 라우트 전환 초반의 체감 공백을 메운다. */}
				<AppSplashScreen />
				{children}
			</body>
		</html>
	);
}
