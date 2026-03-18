// 파일 역할:
// - 메타데이터, JSON-LD, 인증 관련 절대 URL 기준을 한곳에서 계산하는 유틸 파일이다;
// 사용 위치:
// - 서버 레이아웃과 로그인 페이지가 SSR 시점의 origin을 계산할 때 사용한다;
// 흐름:
// - 우선 요청 헤더에서 실제 접근 origin을 복원하고, 그것이 불가능한 환경에서만 배포 URL이나 localhost fallback을 사용한다;
const normalizeSiteURL = (value: string): string | null => {
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
};

// 환경변수는 로컬 개발, preview, 배포 환경마다 형식이 조금씩 다를 수 있어
// 그대로 쓰지 않고 반드시 origin 형태로 정규화한 뒤만 반환한다.
const getEnvSiteBaseURL = (): string | null => {
	if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
		return normalizeSiteURL(process.env.NEXT_PUBLIC_BETTER_AUTH_URL);
	}

	if (process.env.BETTER_AUTH_URL) {
		return normalizeSiteURL(process.env.BETTER_AUTH_URL);
	}

	if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
		return normalizeSiteURL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
	}

	return null;
};

export const getRequestSiteBaseURL = (requestHeaders: Headers): string => {
	// 프록시나 CDN 뒤에서는 브라우저가 본 host/proto와 Node 런타임이 본 값이 다를 수 있다.
	// 그래서 SSR 메타데이터는 `x-forwarded-*`를 우선 보고, 없을 때만 일반 `host`로 내려온 값을 사용한다.
	const forwardedHost = requestHeaders.get("x-forwarded-host");
	const forwardedProto = requestHeaders.get("x-forwarded-proto");
	const host = forwardedHost ?? requestHeaders.get("host");

	if (!host) {
		// 빌드나 테스트처럼 요청 헤더가 아예 없는 상황은 실제 요청 문맥이 없으므로
		// 환경변수 기반 배포 URL이나 마지막 localhost fallback으로만 계산한다.
		return getEnvSiteBaseURL() ?? "http://localhost:3000";
	}

	// 개발용 localhost/127.x는 기본적으로 http를 쓰고,
	// 그 외 host는 reverse proxy나 플랫폼 기본값을 감안해 https를 기본값으로 잡는다.
	const protocol = forwardedProto
		?? (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");

	return `${protocol}://${host}`;
};

export const getSiteBaseURL = (): string => {
	// 요청 헤더 문맥이 없는 오래된 호출부를 위한 fallback이다.
	// 신규 SSR 메타데이터 경로에서는 `getRequestSiteBaseURL()`을 우선 사용한다.
	return getEnvSiteBaseURL() ?? "http://localhost:3000";
};
