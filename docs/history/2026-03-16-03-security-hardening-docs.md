---
date: 2026-03-16
type: docs
---

# Auth/Parse 보안 하드닝 결과 문서화

## 변경 내용

- Auth/Parse 공개 입력 보안 하드닝 결과를 별도 보안 문서로 정리했다;
- README와 프로젝트 셋업 문서에 보안 관련 링크와 운영 주의사항을 추가했다;
- 코드 품질 가이드에 보안 입력 검증과 민감 메타데이터 저장 최소화 원칙을 반영했다;

## 변경된 파일

- `docs/security-hardening.md`;
- `README.md`;
- `docs/project-identity.md`;
- `docs/code-quality.md`;
- `docs/implementation-plan.md`;

## 결정 사항

- 구현 히스토리만으로는 운영자가 현재 보안 정책을 빠르게 파악하기 어려워 별도 요약 문서를 둔다;
- README에는 개요와 링크만 두고, 상세 정책·한도·마이그레이션 요구사항은 전용 문서에 모은다;
- 개발 규칙에는 “무엇을 구현했는가”보다 “앞으로도 지켜야 하는 보안 원칙”을 남긴다;

## 다음 할 일

- 배포 전에 운영 환경에서 새 rate limit 한도와 이벤트 로그가 적절한지 확인한다;
