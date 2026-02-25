import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ManualInputProvider } from "@/components/providers/ManualInputProvider";
import { GlobalManualInputDialog } from "@/components/providers/GlobalManualInputDialog";
import { UnifiedInputSection } from "@/components/transaction/UnifiedInputSection";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<ManualInputProvider>
			<div className="flex h-dvh flex-col md:flex-row">
				<Sidebar />
				<main className="flex-1 overflow-y-auto pb-36 md:pb-8">{children}</main>
				<BottomTabBar />
			</div>
			<GlobalManualInputDialog />
			<UnifiedInputSection />
		</ManualInputProvider>
	);
}
