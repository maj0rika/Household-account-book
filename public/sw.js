// 최소 서비스 워커 — PWA 설치 트리거용
// 오프라인 캐싱은 향후 필요 시 추가

const CACHE_NAME = "household-v1";

self.addEventListener("install", (event) => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
	// 네트워크 우선 — 오프라인 캐싱 없이 통과
	event.respondWith(fetch(event.request));
});
