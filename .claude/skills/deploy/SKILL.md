---
description: "코드 리뷰 → 커밋/푸시 → Vercel 배포 확인 → Capacitor 동기화까지 전체 배포 파이프라인을 실행합니다"
user_invocable: true
---

# 배포 파이프라인 에이전트

코드 변경사항을 **검증 → 커밋 → 배포 → 네이티브 앱 동기화**까지 한 번에 처리합니다.

## 배포 아키텍처

```
[코드 변경]
    ↓
[Phase 1: 검증] tsc + build + 코드 리뷰
    ↓
[Phase 2: 커밋 & 푸시] git add → commit → push origin main
    ↓
[Phase 3: Vercel 배포 확인] 자동 배포 트리거 → 상태 확인
    ↓
[Phase 4: Capacitor 동기화] cap sync (iOS/Android)
    ↓
[배포 완료 보고서]
```

## 인프라 정보

| 항목 | 값 |
|------|------|
| **웹 호스팅** | Vercel (GitHub 자동 배포) |
| **배포 URL** | `https://household-account-book-tawny.vercel.app` |
| **GitHub 리포** | `maj0rika/Household-account-book` |
| **브랜치** | `main` (프로덕션) |
| **네이티브 앱** | Capacitor 8 (iOS/Android) — Vercel URL을 WebView로 로드 |
| **DB** | Supabase PostgreSQL |

## Phase 1: 검증

**목표**: 배포 가능한 상태인지 확인

1. `npx tsc --noEmit` — 타입 에러 0개
2. `npm run build` — 빌드 성공
3. 변경사항 코드 리뷰 (review 스킬 체크리스트 기준)
   - 블로커 발견 시: 자동 수정 → 재검증 (최대 3회)
   - 3회 실패 시 사용자에게 보고

**검증 실패 시 절대 다음 Phase로 진행하지 않음**

---

## Phase 2: 커밋 & 푸시

**목표**: 변경사항을 main 브랜치에 반영

1. `git status`로 변경 파일 확인
2. `git diff`로 변경 내용 확인
3. 변경 파일만 선택적으로 `git add` (절대 `git add .` 사용 금지)
4. 한국어 커밋 메시지 작성 (변경 내용 요약)
5. `git push origin main`

**규칙:**
- `.env`, 시크릿 파일 절대 커밋 금지
- 커밋 메시지에 `Co-Authored-By: Claude` 포함
- 변경사항 없으면 이 Phase 스킵

---

## Phase 3: Vercel 배포 확인

**목표**: Vercel 자동 배포가 정상 트리거되었는지 확인

1. `gh api repos/maj0rika/Household-account-book/deployments --jq '.[0]'`로 최신 배포 상태 확인
2. 배포 상태가 `success`가 아니면:
   - Vercel 대시보드 확인 안내
   - 빌드 로그 에러 분석
3. 배포 URL 접근 확인: `https://household-account-book-tawny.vercel.app`

**배포 실패 시:**
- 에러 원인 분석
- 수정 가능하면 Phase 1부터 재실행
- 환경변수 문제 등 Vercel 대시보드 필요 시 사용자에게 안내

---

## Phase 4: Capacitor 동기화

**목표**: 네이티브 앱에 최신 웹 변경사항 반영

Capacitor는 Vercel 배포 URL을 WebView로 로드하므로, 웹 배포가 곧 앱 업데이트.
단, 네이티브 설정이 변경된 경우 동기화 필요:

1. **네이티브 설정 변경 여부 확인**:
   - `capacitor.config.ts` 변경됨?
   - `ios/` 또는 `android/` 네이티브 파일 변경됨?
   - Capacitor 플러그인 추가/변경됨?

2. **변경 있을 때만** `npx cap sync` 실행:
   - iOS: `npx cap sync ios`
   - Android: `npx cap sync android`

3. **변경 없으면** 이 Phase 스킵 (웹 배포만으로 앱 업데이트 완료)

---

## 배포 완료 보고서

```markdown
## 배포 완료

### 변경 요약
(커밋 메시지)

### 검증 결과
- tsc: ✅/❌
- build: ✅/❌
- 코드 리뷰: ✅ PASS / ❌ FAIL

### 배포 상태
- 커밋: `{hash}` → main
- Vercel: ✅ 배포 완료 / ⏳ 배포 중 / ❌ 실패
- URL: https://household-account-book-tawny.vercel.app

### Capacitor
- 네이티브 동기화: ✅ 완료 / ⏭️ 스킵 (웹만 변경)

### 확인 방법
1. 웹: 배포 URL 접속
2. iOS: Xcode에서 빌드/실행 (`npm run cap:run:ios`)
3. Android: Android Studio에서 빌드/실행 (`npm run cap:run:android`)
```

## 규칙

- Phase 1 검증 실패 시 절대 배포하지 않음
- 환경변수 변경이 필요하면 사용자에게 Vercel 대시보드 안내
- DB 마이그레이션이 포함된 경우 반드시 사용자 확인 후 진행
- Capacitor 동기화는 네이티브 설정 변경 시에만 실행
- 배포 후 최소한의 스모크 테스트 (URL 접근) 수행
