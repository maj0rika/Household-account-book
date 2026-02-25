import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
	title: "개인정보처리방침 — 가계부",
};

export default function PrivacyPage() {
	return (
		<main className="mx-auto max-w-2xl px-4 py-12">
			<Link
				href="/"
				className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" />
				돌아가기
			</Link>

			<h1 className="mb-2 text-2xl font-bold">개인정보처리방침</h1>
			<p className="mb-8 text-sm text-muted-foreground">시행일: 2025년 2월 25일</p>

			<div className="space-y-8 text-sm leading-relaxed text-foreground/90">
				<Section title="1. 개인정보의 수집 항목 및 수집 방법">
					<p>본 서비스는 회원가입 및 서비스 이용을 위해 아래 정보를 수집합니다.</p>
					<ul className="mt-2 list-disc space-y-1 pl-5">
						<li>필수 항목: 이메일 주소, 비밀번호(암호화 저장)</li>
						<li>Google 로그인 시: 이메일 주소, 이름, 프로필 이미지</li>
						<li>서비스 이용 과정에서 생성되는 정보: 거래 내역(수입/지출), 카테고리, 자산 정보, 예산 설정</li>
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
						회원 탈퇴 시 개인정보는 즉시 삭제됩니다.
						단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
					</p>
				</Section>

				<Section title="4. 개인정보의 제3자 제공">
					<p>
						본 서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
						단, 다음의 경우 예외로 합니다.
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
						<li>OpenAI / Moonshot AI — 거래 내역 자동 분류 (입력 텍스트만 전송, 개인 식별 정보 미포함)</li>
						<li>Google OAuth — 소셜 로그인 인증</li>
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
						<li>비밀번호 암호화 저장 (bcrypt)</li>
						<li>HTTPS 통신 암호화</li>
						<li>데이터베이스 접근 제어 (Row Level Security)</li>
						<li>인증 토큰 기반 세션 관리</li>
					</ul>
				</Section>

				<Section title="8. 연락처">
					<p>
						개인정보 관련 문의사항은 아래로 연락해 주세요.
					</p>
					<p className="mt-2 font-medium">이메일: neu5563@naver.com</p>
				</Section>
			</div>

			<p className="mt-12 text-xs text-muted-foreground">
				본 방침은 2025년 2월 25일부터 적용됩니다.
			</p>
		</main>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section>
			<h2 className="mb-3 text-base font-semibold">{title}</h2>
			{children}
		</section>
	);
}
