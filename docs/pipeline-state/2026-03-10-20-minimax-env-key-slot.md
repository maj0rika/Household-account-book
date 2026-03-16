## Pipeline State

### 요청 요약
- 실제 환경 파일과 예시 환경 파일에 `MINIMAX_API_KEY` 슬롯을 추가한다;

### 수용 기준
- [x] `.env`에 `MINIMAX_API_KEY=` 항목이 추가된다;
- [x] `.env.example`에 `MINIMAX_API_KEY=` 항목과 설명이 추가된다;
- [x] 문서와 히스토리 인덱스가 이번 설정 변경을 반영한다;

### 활성 Phase
- PM;
- INFRA;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 사용자 인터페이스 변경이 없다;
- BE: 서버 로직과 DB 스키마 변경이 없다;
- FE: 클라이언트 컴포넌트 변경이 없다;
- DEPLOY: 사용자 요청이 없다;

### 승인 이력
- 2026-03-10 / PM 계획 / 승인됨 / MiniMax API 키 슬롯 추가;

### 변경 패킷
- INFRA / `.env`, `.env.example`, `docs/project-identity.md` / MiniMax 키 슬롯과 안내 문구 추가;
- REVIEW / `rg -n "MINIMAX_API_KEY" ...` / PASS;

### 리뷰 이슈
- 열린 이슈 0개;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: env 키 이름, 문서 반영, 히스토리 반영이 모두 정합적이다;

### 다음 액션
- MiniMax provider가 실제 런타임에 연결될 때 라우팅 정책 문서를 별도 갱신한다;
