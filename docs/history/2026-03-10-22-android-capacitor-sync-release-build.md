---
date: 2026-03-10
type: config
---

# Android Capacitor sync 및 릴리스 빌드 최신화

## 변경 내용

- `npx cap sync android`를 실행해 Android 네이티브 프로젝트에 Capacitor 플러그인 구성을 최신 상태로 반영했다;
- `@capacitor/splash-screen` 플러그인 모듈이 Android Gradle 설정에 연결되도록 생성 파일을 갱신했다;
- Android Studio 번들 JBR 21을 `JAVA_HOME`으로 사용해 `./gradlew bundleRelease`를 실행하고 최신 AAB를 재생성했다;

## 변경된 파일

- android/app/capacitor.build.gradle
- android/capacitor.settings.gradle
- docs/history/2026-03-10-22-android-capacitor-sync-release-build.md
- docs/implementation-plan.md
- docs/pipeline-state/2026-03-10-22-android-latest-build.md

## 결정 사항

- 시스템 Java Runtime이 없는 환경이므로 Android Studio 번들 JBR를 사용해 로컬 Android 빌드를 수행했다;
- 이번 요청은 웹 기능 수정이 아니라 Android 최신 빌드 갱신이 목적이므로 push/deploy는 수행하지 않았다;

## 다음 할 일

- 스토어 배포가 필요하면 생성된 `app-release.aab`를 기준으로 서명/업로드 절차를 이어간다;
- 실제 반영 웹 버전이 중요하면 Vercel 최신 배포 상태를 별도로 확인한다;
