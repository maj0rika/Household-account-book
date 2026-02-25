import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { getUserCategories } from "@/server/actions/transaction";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const categories = await getUserCategories();

	return (
		<div className="mx-auto max-w-lg space-y-4 px-4 pt-4 pb-28 md:pb-24">
			<h2 className="text-lg font-bold">설정</h2>

			<ProfileSection
				user={{
					name: session?.user?.name ?? "사용자",
					email: session?.user?.email ?? "",
				}}
			/>

			<Separator />

			<CategoryManager categories={categories} />

			<Separator />

			<ThemeToggle />
		</div>
	);
}
