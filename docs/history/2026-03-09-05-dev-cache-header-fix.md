---
date: 2026-03-09
type: config
---

# 개발 환경 정적 캐시 헤더 수정

## 변경 내용

- `next.config.ts`에서 `optimizePackageImports`를 현재 Next.js 설정 스키마에 맞게 `experimental` 아래로 이동했다.
- 개발 환경에서는 `/_next/static/*`와 `woff2` 파일에 `immutable` 캐시 헤더를 주지 않도록 분기 처리했다.
- 프로덕션 환경에서만 정적 에셋과 폰트의 장기 캐시를 유지하도록 조정했다.

## 변경된 파일

- next.config.ts
- docs/history/2026-03-09-05-dev-cache-header-fix.md
- docs/implementation-plan.md

## 결정 사항

- 개발 서버의 Turbopack 청크는 자주 바뀌므로 브라우저가 `immutable`로 캐시하면 HMR 모듈 불일치가 발생할 수 있다.
- 장기 캐시는 배포 산출물에만 적용하고, 개발 환경은 항상 최신 청크를 다시 받도록 두는 편이 안전하다.

## 다음 할 일

- 개발 환경에서 청크 캐시 관련 런타임 에러가 재발하지 않는지 입력바/대시보드 화면 전환 중심으로 확인한다.
