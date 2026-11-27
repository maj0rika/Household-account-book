# 모바일 릴리즈 및 암호화 키 보안 런북

> **적용 범위**: Capacitor 모바일 래퍼(`ios/`, `android/`), 서버 암호화(`src/server/lib/crypto.ts`), 보안 해시(`src/server/security/policy.ts`)

## 1. 모바일 번들 식별자 및 Android R8/ProGuard

- **앱 식별자 통일**: `capacitor.config.ts`(`appId`), `android/app/build.gradle`(`namespace`, `applicationId`), `ios/App/App.xcodeproj/project.pbxproj`(`PRODUCT_BUNDLE_IDENTIFIER`, Debug/Release 모두)에서 `com.maj0rika.household`를 단일 식별자로 사용한다.
- **Android Release 축소/난독화**: `android/app/build.gradle`의 `buildTypes.release`에 `minifyEnabled true`, `shrinkResources true`를 활성화하고, `android/app/proguard-rules.pro`에 다음 보존 규칙을 유지한다.
  - `com.maj0rika.household.**` (`MainActivity` 등 앱 진입 클래스)
  - `com.getcapacitor.**`, `com.capacitorjs.**`, `androidx.core.splashscreen.**` (Capacitor 8 런타임, 리플렉션 어노테이션, SplashScreen)
  - `@android.webkit.JavascriptInterface` 메서드 및 `android.webkit.**`
  - `-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod,JavascriptInterface`

## 2. Android 릴리즈 키스토어 회전 및 Play App Signing 체크리스트

### 저장소 및 시크릿 경계

- `android/app/build.gradle`은 `release` 태스크 실행 시 루트에 `android/keystore.properties`가 없으면 `GradleException`을 던져 fail-closed로 동작한다.
- 루트 `.gitignore`는 `*.jks`, `*.keystore`, `android/keystore.properties`, `android/app/keystore.properties`를 추적에서 제외한다.
- `android/keystore.properties.example`은 필드 형식 안내용 템플릿(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`)이며, 실제 키스토어 파일과 비밀번호는 저장소 외부(로컬 보안 금고 또는 CI 시크릿 볼트)에만 보관·주입한다.
- Git 이력, 빌드 로그, 문서, 메신저에 키스토어 비밀번호·별칭 비밀값·바이너리가 절대 노출되지 않도록 유지한다.

### 키스토어 회전 체크리스트 (유출 의심 또는 정기 교체 시)

1. **Play App Signing 확인**: Google Play Console에서 Play App Signing이 활성화되어 앱 서명 키는 Google이 관리하고, 로컬/CI 키는 업로드 키(upload key)로만 동작하는지 확인한다.
2. **새 업로드 키 생성 (저장소 외부)**: 안전한 오프라인/CI 환경에서 `PKCS12` 형식의 새 키스토어를 생성하고 기존과 다른 `storePassword`, `keyAlias`, `keyPassword`를 설정한다.
3. **인증서 추출 및 Play Console 요청**: 새 업로드 키의 공개 인증서(`.pem`)를 추출해 Google Play Console에 업로드 키 재설정(reset upload key)을 요청한다.
4. **적용 대기 및 시크릿 갱신**: Google Play 측 승인 및 적용 완료를 확인한 뒤, CI/로컬 비추적 `android/keystore.properties`에 새 키 경로와 자격 증명을 반영한다.
5. **서명·릴리즈 검증**: 새 키로 서명된 release AAB/APK를 생성하고 `apksigner verify`(또는 `jarsigner -verify`)와 실행 스모크 테스트를 통과시킨다.
6. **구 키 폐기**: 기존 키스토어를 안전하게 폐기하고 구 시크릿을 CI 볼트에서 제거한다.

## 3. `ENCRYPTION_KEY` 런타임 계약 (`src/server/lib/crypto.ts`)

### 암호화 스펙 및 fail-closed 검증

- **알고리즘/포맷**: AES-256-GCM (`IV_LENGTH = 12`바이트, `AUTH_TAG_LENGTH = 16`바이트). 암호문은 `v1:<base64(iv || authTag || ciphertext)>` 형식을 가진다.
- **키 검증 (`getKey`)**:
  - `process.env.ENCRYPTION_KEY`가 비어 있거나 미설정이면 즉시 예외를 던진다(`ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.`).
  - `Buffer.from(hex, "hex")` 결과가 정확히 `32`바이트(64자 hex)가 아니면 예외를 던진다. (잘못된 길이나 비-hex 문자로 인해 32바이트 미만으로 디코딩되는 경우 포함)
  - 인증 태그가 변조되거나 다른 키로 복호화를 시도하면 `decipher.final()`에서 예외가 발생한다.
- **하위 호환 동작**:
  - `decryptNullable`, `decryptString`, `decryptNumber`는 `v1:` 프리픽스가 없는 기존 평문만 그대로 반환하며, `v1:` 프리픽스가 있는 값은 예외 없이 복호화되어야 통과한다.
- **암호화 대상 필드**:
  - `accounts.name`, `accounts.balance` (`src/server/actions/account.ts`, `src/server/lib/account-ledger.ts`, `src/server/services/parse-core.ts`, `src/server/actions/export.ts`)
  - `transactions.original_input`, `transactions.memo` (`src/server/actions/transaction.ts`, `src/server/actions/recurring.ts`, `src/server/actions/export.ts`)

### 보안 해시 키 동작 (`src/server/security/policy.ts`)

- `getSecuritySecret()`은 `process.env.BETTER_AUTH_SECRET ?? process.env.ENCRYPTION_KEY` 순으로 HMAC 비밀키를 조회하며, 둘 다 없으면 예외를 던진다(fail-closed).
- `hashSecurityValue(value, namespace)`는 `HMAC-SHA256(secret, "v1:<namespace>:" + value)`를 계산해 `<namespace>:v1:<hex>`를 반환한다.
- 이 해시는 세션 IP/UA 비식별화(`minimizeSessionIpAddress`, `minimizeSessionUserAgent`)와 `security_rate_limits` / `security_events`의 `key_hash`에 사용된다.
- 운영 환경에서는 `BETTER_AUTH_SECRET`과 `ENCRYPTION_KEY`를 항상 별도 독립 값으로 설정해, `ENCRYPTION_KEY` 회전이 보안 해시 버킷이나 세션 지문과 섞이지 않도록 분리한다.

## 4. `ENCRYPTION_KEY` 회전 런북

현재 `src/server/lib/crypto.ts`는 단일 활성 키(`v1:` + `process.env.ENCRYPTION_KEY`)만 지원하므로, 기존 키를 바로 교체하면 저장된 `v1:` 암호문 복호화가 모두 실패한다. 무중단 회전이 필요하면 먼저 다중 키 버전(`v2:` / 이전 키 fallback 복호화) 지원을 배포해야 하며, 단일 키 구조에서는 아래 점검 창 절차로 회전한다.

1. **사전 확인**: 운영 환경에 `BETTER_AUTH_SECRET`이 `ENCRYPTION_KEY`와 별도로 설정돼 있는지 확인한다.
2. **점검 창 진입 및 백업**: 쓰기 요청을 중지(maintenance mode)하고 회전 직전 DB 스냅샷을 확보한다.
3. **신규 키 생성 (저장소 외부)**: `openssl rand -hex 32` 등으로 32바이트(64자 hex) 신규 키를 생성해 시크릿 볼트에만 저장한다.
4. **재암호화 마이그레이션 실행**:
   - `accounts`(`id`, `name`, `balance`)와 `transactions`(`id`, `original_input`, `memo`) 중 `v1:`로 시작하는 모든 행을 기존 키로 복호화한 뒤 신규 키로 재암호화해 트랜잭션 단위로 갱신한다.
   - 재암호화 완료 후 전체 대상 행을 신규 키로 다시 복호화 검증(에러 0건)한다.
5. **런타임 시크릿 교체 및 배포**: 배포 플랫폼(Vercel 등)의 `ENCRYPTION_KEY`를 신규 키로 교체하고 재배포한다.
6. **사후 검증 및 폐기**: 자산 목록 조회, 거래 메모 조회, JSON 내보내기(`exportUserData`)가 정상 복호화되는지 확인한 뒤 점검 모드를 해제하고 구 키를 폐기한다.
