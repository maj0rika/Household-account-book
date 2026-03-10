import { redirect } from "next/navigation";

import { getServerSession } from "@/server/auth";

export default async function HomePage() {
	const session = await getServerSession();

	// 루트 경로는 랜딩 페이지를 두지 않고 세션 상태에 따라 즉시 작업 화면으로 보낸다.
	// 첫 진입 분기를 한 곳에 모아두면 로그인/로그아웃 이후의 기본 진입점이 흔들리지 않는다.
	if (session?.user) {
		redirect("/transactions");
	} else {
		redirect("/login");
	}
}
