import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const PAGE_TITLE = "개인정보처리방침 — 가계부";
const PAGE_DESCRIPTION = "가계부 서비스의 개인정보 수집 항목, 이용 목적, 보유 기간, 위탁 처리, 이용자 권리를 안내합니다.";
const EFFECTIVE_DATE = "2026-03-16";

export const metadata: Metadata = {
	title: PAGE_TITLE,
	description: PAGE_DESCRIPTION,
	alternates: {
		canonical: "/privacy",
	},
	openGraph: {
		title: PAGE_TITLE,
		description: PAGE_DESCRIPTION,
		url: "/privacy",
		type: "article",
		locale: "ko_KR",
	},
	twitter: {
		card: "summary",
		title: PAGE_TITLE,
		description: PAGE_DESCRIPTION,
	},
};

export default function PrivacyPage() {
	return (
		<main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-12">
			<article aria-labelledby="privacy-title" className="space-y-8">
				<header className="space-y-4">
					<Link
						href="/"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						<ArrowLeft className="h-4 w-4" />
						돌아가기
					</Link>

					<div className="space-y-2">
						<h1 id="privacy-title" className="text-2xl font-bold">개인정보처리방침</h1>
						<p className="text-sm text-muted-foreground">
							시행일: <time dateTime={EFFECTIVE_DATE}>2026년 3월 16일</time>
						</p>
					</div>
				</header>

				<div className="space-y-8 text-sm leading-relaxed text-foreground/90">
					<Section title="1. 개인정보의 수집 항목 및 수집 방법">
						<p>본 서비스는 회원가입 및 서비스 이용을 위해 아래 정보를 수집합니다.</p>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							<li>필수 항목: 이메일 주소, 비밀번호(해시 저장)</li>
							<li>
								서비스 이용 과정에서 생성되는 정보: 거래 내역(수입/지출), 카테고리, 자산
								정보, 예산 설정
							</li>
							<li>보안 보호를 위한 최소 접속 정보: 해시된 IP 주소, 해시된 User-Agent</li>
						</ul>
					</Section>

					<Section title="2. 개인정보의 수집 및 이용 목적">
						<ul className="list-disc space-y-1 pl-5">
							<li>회원 식별 및 인증</li>
							<li>가계부 서비스 제공 (거래 기록, 통계, 예산 관리)</li>
							<li>AI 기반 거래 자동 분류 기능 제공</li>
							<li>서비스 개선 및 오류 수정</li>
						</ul>
					</Section>

					<Section title="3. 개인정보의 보유 및 이용 기간">
						<p>
							회원 탈퇴 시 개인정보는 즉시 삭제됩니다. 단, 관련 법령에 따라 보존이 필요한
							경우 해당 기간 동안 보관합니다.
						</p>
					</Section>

					<Section title="4. 개인정보의 제3자 제공">
						<p>
							본 서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단,
							다음의 경우 예외로 합니다.
						</p>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							<li>이용자가 사전에 동의한 경우</li>
							<li>법령에 의해 요구되는 경우</li>
						</ul>
					</Section>

					<Section title="5. 개인정보의 처리 위탁">
						<p>본 서비스는 아래 외부 서비스를 이용하여 데이터를 처리합니다.</p>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							<li>Supabase (데이터베이스 호스팅) — 거래 데이터 저장</li>
							<li>Vercel (웹 호스팅) — 서비스 배포 및 운영</li>
							<li>
								Moonshot AI(Kimi), Fireworks AI, MiniMax — 거래/이미지 입력 자동 분류
								(서비스 제공에 필요한 입력 텍스트와 이미지 데이터 처리)
							</li>
						</ul>
					</Section>

					<Section title="6. 이용자의 권리">
						<p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							<li>개인정보 열람, 수정, 삭제 요청</li>
							<li>회원 탈퇴 요청</li>
							<li>개인정보 처리 정지 요청</li>
						</ul>
						<p className="mt-2">
							위 요청은 서비스 내 설정 페이지 또는 아래 연락처를 통해 가능합니다.
						</p>
					</Section>

					<Section title="7. 개인정보의 안전성 확보 조치">
						<ul className="list-disc space-y-1 pl-5">
							<li>비밀번호 해시 저장</li>
							<li>HTTPS 통신 암호화</li>
							<li>데이터베이스 접근 제어 (Row Level Security)</li>
							<li>인증 토큰 기반 세션 관리</li>
						</ul>
					</Section>

					<Section title="8. 연락처">
						<p>개인정보 관련 문의사항은 아래로 연락해 주세요.</p>
						<p className="mt-2 font-medium">이메일: neu5563@naver.com</p>
					</Section>
				</div>

				<footer>
					<p className="text-xs text-muted-foreground">
						본 방침은 <time dateTime={EFFECTIVE_DATE}>2026년 3월 16일</time>부터 적용됩니다.
					</p>
				</footer>
			</article>
		</main>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	const headingId = title.replace(/[^\w가-힣]+/g, "-").replace(/^-+|-+$/g, "");

	return (
		<section aria-labelledby={headingId}>
			<h2 id={headingId} className="mb-3 text-base font-semibold">{title}</h2>
			{children}
		</section>
	);
}
