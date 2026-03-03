---
date: 2026-03-03
type: config
---

# Android 패키지 이름 변경 (com.household.app → com.maj0rika.household)

## 변경 내용

- Google Play에서 `com.household.app` 패키지가 이미 사용 중이라 변경 필요
- `com.maj0rika.household`로 패키지 이름 변경
- Java 디렉토리 구조 이동 (com/household/app → com/maj0rika/household)
- AAB 릴리스 빌드 재생성

## 변경된 파일

- capacitor.config.ts (appId)
- android/app/build.gradle (namespace, applicationId)
- android/app/src/main/res/values/strings.xml (package_name, custom_url_scheme)
- android/app/src/main/java/com/maj0rika/household/MainActivity.java (패키지 이동)

## 결정 사항

- GitHub 유저네임 기반 `com.maj0rika.household`로 고유성 확보
