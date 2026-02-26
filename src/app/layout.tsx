import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

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
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
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
				{children}
			</body>
		</html>
	);
}
