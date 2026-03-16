---
date: 2026-03-16
type: feature
---

# SEO 최적화 — robots.txt 및 Open Graph 메타데이터 추가

## 변경 내용

- `public/robots.txt` 생성: 인증 필요 경로(`/dashboard`, `/settings`, `/api/`) 크롤링 차단, 공개 페이지(`/`, `/terms`, `/privacy`)만 허용
- `src/app/layout.tsx` 메타데이터 확장:
  - `metadataBase` 추가 (Vercel 배포 URL 자동 감지, 로컬 fallback)
  - Open Graph 메타 (`og:type`, `og:title`, `og:description`, `og:image`, `og:locale`)
  - Twitter Card 메타 (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:images`)
  - 기존 512x512 아이콘을 OG 이미지로 재활용

## 변경된 파일

- public/robots.txt (신규)
- src/app/layout.tsx

## 결정 사항

- 인증 기반 앱이므로 최소한의 SEO만 적용 (robots.txt + OG 메타)
- `sitemap.xml`은 공개 페이지 3개뿐이라 생략 (필요 시 추후 추가)
- JSON-LD, canonical URL 등은 ROI가 낮아 생략
- OG 이미지는 전용 이미지 제작 대신 기존 PWA 아이콘(512x512) 재활용
- `VERCEL_PROJECT_PRODUCTION_URL` 환경변수로 metadataBase 자동 해석
