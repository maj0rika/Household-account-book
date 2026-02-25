import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.household.app",
	appName: "가계부",
	webDir: "public",
	server: {
		// Next.js는 SSR이므로 배포된 서버 URL을 사용
		// 프로덕션: Vercel 배포 URL로 변경
		url: process.env.CAPACITOR_SERVER_URL || "https://localhost:3000",
		cleartext: false,
	},
	plugins: {
		SplashScreen: {
			launchAutoHide: true,
			backgroundColor: "#2da562",
			showSpinner: false,
		},
	},
	ios: {
		scheme: "가계부",
	},
	android: {
		allowMixedContent: false,
	},
};

export default config;
