# 디자인 시스템 가이드라인

> **프로젝트**: AI 자동 분류 가계부 앱
> **최종 수정일**: 2026-02-25

---

## 1. 디자인 원칙

| 원칙 | 설명 |
|------|------|
| **신뢰감** | 돈을 다루는 앱이므로 안정적이고 깔끔한 느낌 |
| **미니멀** | 불필요한 장식 배제, 정보 중심 레이아웃 |
| **일관성** | 모든 페이지에서 동일한 컴포넌트/컬러/간격 사용 |
| **모바일 퍼스트** | 모바일 기준 설계 후 데스크톱 확장 |

---

## 2. 컬러 시스템

### 브랜드 컬러 — 에메랄드 그린

가계부 앱의 핵심 연상: **돈, 성장, 안정**

| 용도 | Light Mode | Dark Mode | CSS 변수 |
|------|-----------|-----------|----------|
| Primary | `oklch(0.55 0.17 155)` | `oklch(0.70 0.18 155)` | `--primary` |
| Background | `oklch(0.985 0.002 155)` | `oklch(0.145 0.015 155)` | `--background` |
| Card | `oklch(1 0 0)` 순백 | `oklch(0.20 0.02 155)` | `--card` |
| Border | `oklch(0.90 0.02 155)` | `oklch(1 0 0 / 10%)` | `--border` |

### 시맨틱 컬러

| 용도 | Light | Dark | CSS 변수 |
|------|-------|------|----------|
| 수입(Income) | `oklch(0.55 0.17 155)` 그린 | `oklch(0.70 0.18 155)` | `--income` |
| 지출(Expense) | `oklch(0.577 0.245 27.325)` 레드 | `oklch(0.704 0.191 22.216)` | `--expense` |
| 위험/삭제 | = expense | = expense | `--destructive` |

### 차트 팔레트 (그린 모노톤)

```
chart-1: oklch(0.55 0.17 155)  — primary green
chart-2: oklch(0.65 0.20 165)  — teal
chart-3: oklch(0.45 0.12 145)  — dark green
chart-4: oklch(0.75 0.15 135)  — lime
chart-5: oklch(0.60 0.10 175)  — cyan-green
```

---

## 3. 타이포그래피

| 항목 | 값 |
|------|-----|
| 기본 폰트 | Geist Sans (Google Fonts) |
| 모노 폰트 | Geist Mono |
| 페이지 제목 | `text-lg font-semibold` |
| 섹션 제목 | `text-sm font-semibold` |
| 본문 | `text-sm` |
| 보조 텍스트 | `text-xs text-muted-foreground` |
| 금액 (큰) | `text-sm font-semibold` |
| 금액 (작은) | `text-[10px] font-medium` |

---

## 4. 간격 & 레이아웃

| 항목 | 값 |
|------|-----|
| 페이지 패딩 | `px-4` |
| 카드 패딩 | `p-3` ~ `p-4` |
| 섹션 간격 | `Separator` + `my-2` |
| 모서리 반경 | `--radius: 0.625rem` (10px) |
| 바텀 탭바 높이 | `h-14` |
| 하단 여백 (모바일) | `pb-36` |

---

## 5. 컴포넌트 패턴

### Card
```tsx
<Card>
  <CardContent className="p-3">
    {/* 내용 */}
  </CardContent>
</Card>
```

### 수입/지출 표시
```tsx
// 수입 금액
<span className="text-income">+350만원</span>

// 지출 금액
<span className="text-expense">-12,000원</span>

// 잔액 (조건부)
<span className={balance >= 0 ? "text-income" : "text-expense"}>
  {formatCurrency(balance)}
</span>
```

### 로딩 스피너
```tsx
<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
```

### 빈 상태
```tsx
<div className="py-8 text-center text-sm text-muted-foreground">
  데이터가 없습니다
</div>
```

---

## 6. 인증 페이지

- 중앙 정렬 `Card` 레이아웃
- 상단: 앱 아이콘 (Wallet) + 앱 이름 + 한 줄 설명
- `shadcn/ui` Input, Label, Button 컴포넌트 사용
- Google 로그인 버튼: `variant="outline"` + Google 로고 SVG

---

## 7. 네비게이션

### 모바일 (BottomTabBar)
- 4개 탭: 홈, 분석, 입력, 설정
- `backdrop-blur-lg` 글래스모피즘
- 활성 탭: `text-primary font-medium`

### 데스크톱 (Sidebar)
- 4개 항목: 거래내역, 통계, 예산, 설정
- 상단: 앱 아이콘 + 이름
- 활성 항목: `bg-accent text-accent-foreground font-medium`

---

## 8. 다크모드

- `document.documentElement.classList.toggle("dark")` + localStorage
- 모든 CSS 변수가 `.dark` 클래스에서 재정의됨
- 다크모드에서 primary가 더 밝아짐 (0.55 → 0.70)
- 보더는 투명도 기반 (`oklch(1 0 0 / 10%)`)
