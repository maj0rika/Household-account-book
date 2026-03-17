// 파일 역할:
// - 네이티브 앱 래퍼가 웹 앱에 접속하는 방식을 설정하는 파일이다.
// 사용 위치:
// - iOS/Android 래퍼 앱이 웹뷰와 스플래시 설정을 읽을 때 사용된다;
// 흐름:
// - Capacitor 런타임이 앱 부팅 시 이 설정을 읽고, 어떤 배포 URL을 웹뷰에 띄울지와 스플래시 동작을 결정한다;
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.maj0rika.household",
	appName: "가계부",
	webDir: "public",
	server: {
		// Next.js는 SSR이므로 배포된 서버 URL을 사용
		// 프로덕션: Vercel 배포 URL로 변경
		// 즉, 네이티브 앱은 정적 번들을 싣는 대신 실제 배포 서버를 WebView로 연다.
		url: "https://household-account-book-tawny.vercel.app",
		cleartext: false,
	},
	plugins: {
		SplashScreen: {
			// 스플래시는 앱 쪽에서 제어하고, 웹 앱이 준비되면 직접 숨긴다.
			launchAutoHide: false,
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
