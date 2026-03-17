import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getServerSession } from "@/server/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { RoutePrefetcher } from "@/components/layout/RoutePrefetcher";
import { ManualInputProvider } from "@/components/providers/ManualInputProvider";
import { GlobalManualInputDialog } from "@/components/providers/GlobalManualInputDialog";
import { UnifiedInputSection } from "@/components/transaction/UnifiedInputSection";
import { getUserCategories } from "@/server/actions/transaction";
import { getAccounts } from "@/server/actions/account";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerSession();

	// middleware는 빠른 1차 차단이고, 레이아웃에서는 서버 기준으로 다시 세션을 확인한다.
	// 쿠키만 있는 만료 세션까지 여기서 걸러야 보호 페이지가 깜빡이며 렌더되지 않는다.
	if (!session?.user) {
		redirect("/login");
	}

	return (
		<ManualInputProvider>
			{/* 공통 네비게이션과 전역 입력 UI를 레이아웃에 올려
				하위 탭이 바뀌어도 입력 흐름 상태를 유지한다. */}
			<RoutePrefetcher />
			<div className="flex h-dvh flex-col md:flex-row">
				<Sidebar />
				<main className="flex-1 overflow-y-auto pb-36 md:pb-8">{children}</main>
				<BottomTabBar />
			</div>
			<GlobalManualInputDialog />
			<Suspense fallback={null}>
				<UnifiedInputSectionLoader />
			</Suspense>
		</ManualInputProvider>
	);
}

async function UnifiedInputSectionLoader() {
	// 전역 입력 시트 초기값은 첫 HTML보다 늦게 도착해도 되므로
	// 별도 Suspense 경계로 분리해 대시보드 TTFB를 막지 않는다.
	const [initialCategories, initialAccounts] = await Promise.all([
		getUserCategories(),
		getAccounts(),
	]);

	return (
		<UnifiedInputSection
			initialCategories={initialCategories}
			initialAccounts={initialAccounts}
		/>
	);
}
