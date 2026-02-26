import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
	title: "서비스 이용약관 — 가계부",
};

export default function TermsPage() {
	return (
		<main className="mx-auto max-w-2xl px-4 py-12">
			<Link
				href="/"
				className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" />
				돌아가기
			</Link>

			<h1 className="mb-2 text-2xl font-bold">서비스 이용약관</h1>
			<p className="mb-8 text-sm text-muted-foreground">시행일: 2025년 2월 25일</p>

			<div className="space-y-8 text-sm leading-relaxed text-foreground/90">
				<Section title="제1조 (목적)">
					<p>
						이 약관은 가계부 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차,
						이용자와 운영자의 권리·의무·책임 사항을 규정함을 목적으로 합니다.
					</p>
				</Section>

				<Section title="제2조 (정의)">
					<ul className="list-disc space-y-1 pl-5">
						<li>
							&quot;서비스&quot;란 운영자가 제공하는 웹 및 모바일 기반 가계부 관리
							서비스를 말합니다.
						</li>
						<li>
							&quot;이용자&quot;란 이 약관에 동의하고 서비스를 이용하는 자를 말합니다.
						</li>
						<li>
							&quot;콘텐츠&quot;란 이용자가 서비스에 입력한 거래 내역, 자산 정보, 예산
							설정 등의 데이터를 말합니다.
						</li>
					</ul>
				</Section>

				<Section title="제3조 (약관의 효력 및 변경)">
					<ul className="list-disc space-y-1 pl-5">
						<li>
							이 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써
							효력이 발생합니다.
						</li>
						<li>
							운영자는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내
							공지 후 적용됩니다.
						</li>
						<li>
							이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할
							수 있습니다.
						</li>
					</ul>
				</Section>

				<Section title="제4조 (회원가입 및 계정)">
					<ul className="list-disc space-y-1 pl-5">
						<li>
							이용자는 이메일/비밀번호 또는 Google 계정을 통해 회원가입할 수 있습니다.
						</li>
						<li>
							이용자는 정확한 정보를 제공해야 하며, 타인의 정보를 도용해서는 안
							됩니다.
						</li>
						<li>
							계정 정보의 관리 책임은 이용자에게 있으며, 이를 제3자에게 양도하거나
							대여할 수 없습니다.
						</li>
					</ul>
				</Section>

				<Section title="제5조 (서비스의 제공)">
					<p>운영자는 다음의 서비스를 제공합니다.</p>
					<ul className="mt-2 list-disc space-y-1 pl-5">
						<li>수입/지출 거래 기록 및 관리</li>
						<li>자산 및 부채 관리</li>
						<li>카테고리별 예산 설정 및 추적</li>
						<li>통계 및 분석 기능</li>
						<li>AI 기반 거래 자동 분류</li>
						<li>정기 거래 관리</li>
					</ul>
				</Section>

				<Section title="제6조 (서비스의 변경 및 중단)">
					<ul className="list-disc space-y-1 pl-5">
						<li>운영자는 서비스의 내용을 변경하거나 기능을 추가·삭제할 수 있습니다.</li>
						<li>
							서버 점검, 장비 교체, 기술적 장애 등의 사유로 서비스가 일시 중단될 수
							있습니다.
						</li>
						<li>
							운영자는 사전 공지 후 서비스를 종료할 수 있으며, 이 경우 이용자 데이터의
							백업 기간을 제공합니다.
						</li>
					</ul>
				</Section>

				<Section title="제7조 (이용자의 의무)">
					<p>이용자는 다음 행위를 해서는 안 됩니다.</p>
					<ul className="mt-2 list-disc space-y-1 pl-5">
						<li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
						<li>서비스의 정상적인 운영을 방해하는 행위</li>
						<li>서비스를 이용한 불법 행위</li>
						<li>서비스의 취약점을 악용하거나 비정상적인 방법으로 접근하는 행위</li>
						<li>서비스를 상업적 목적으로 무단 이용하는 행위</li>
					</ul>
				</Section>

				<Section title="제8조 (콘텐츠의 권리 및 관리)">
					<ul className="list-disc space-y-1 pl-5">
						<li>이용자가 입력한 콘텐츠의 소유권은 이용자에게 있습니다.</li>
						<li>
							운영자는 서비스 제공 목적으로만 콘텐츠를 이용하며, 이를 제3자에게
							제공하지 않습니다.
						</li>
						<li>
							이용자가 회원 탈퇴 시 콘텐츠는 즉시 삭제되며, 삭제된 데이터는 복구할 수
							없습니다.
						</li>
					</ul>
				</Section>

				<Section title="제9조 (AI 기능 관련)">
					<ul className="list-disc space-y-1 pl-5">
						<li>AI 기반 거래 분류는 참고용이며, 정확성을 보장하지 않습니다.</li>
						<li>
							AI 처리를 위해 입력 텍스트가 외부 AI 서비스(Moonshot AI, Fireworks AI)로
							전송될 수 있습니다.
						</li>
						<li>
							전송되는 데이터에는 개인 식별 정보가 포함되지 않으며, 거래 관련 텍스트만
							전달됩니다.
						</li>
					</ul>
				</Section>

				<Section title="제10조 (면책 조항)">
					<ul className="list-disc space-y-1 pl-5">
						<li>
							운영자는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해
							책임을 지지 않습니다.
						</li>
						<li>
							이용자의 귀책 사유로 인한 데이터 손실에 대해 운영자는 책임을 지지
							않습니다.
						</li>
						<li>
							서비스에 기록된 재무 정보는 참고용이며, 이를 근거로 한 재무 결정에 대해
							운영자는 책임을 지지 않습니다.
						</li>
					</ul>
				</Section>

				<Section title="제11조 (회원 탈퇴 및 자격 상실)">
					<ul className="list-disc space-y-1 pl-5">
						<li>이용자는 언제든지 설정 페이지를 통해 탈퇴를 요청할 수 있습니다.</li>
						<li>
							운영자는 이용자가 제7조의 의무를 위반한 경우 사전 통보 후 이용을
							제한하거나 자격을 상실시킬 수 있습니다.
						</li>
					</ul>
				</Section>

				<Section title="제12조 (개인정보 보호)">
					<p>
						이용자의 개인정보 보호에 관한 사항은{" "}
						<Link
							href="/privacy"
							className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
						>
							개인정보처리방침
						</Link>
						에 따릅니다.
					</p>
				</Section>

				<Section title="제13조 (분쟁 해결)">
					<ul className="list-disc space-y-1 pl-5">
						<li>
							서비스 이용과 관련하여 분쟁이 발생한 경우 운영자와 이용자는 상호
							협의하여 해결합니다.
						</li>
						<li>
							협의가 이루어지지 않을 경우 대한민국 법령에 따르며, 관할 법원은 운영자의
							소재지 관할 법원으로 합니다.
						</li>
					</ul>
				</Section>

				<Section title="제14조 (연락처)">
					<p>서비스 이용 관련 문의사항은 아래로 연락해 주세요.</p>
					<p className="mt-2 font-medium">이메일: neu5563@naver.com</p>
				</Section>
			</div>

			<p className="mt-12 text-xs text-muted-foreground">
				본 약관은 2025년 2월 25일부터 적용됩니다.
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
