import { getServerSession } from "@/server/auth";
import { getUserCategories } from "@/server/actions/transaction";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
	// 설정 화면은 프로필 세션 정보와 카테고리 관리 데이터를 함께 보여주므로
	// 서버에서 각각 읽어 한 페이지 안에서 조합한다.
	const session = await getServerSession();

	const categories = await getUserCategories();

	return (
		<div className="mx-auto max-w-lg space-y-4 px-4 pt-4 pb-28 md:pb-24">
			<h2 className="text-lg font-bold">설정</h2>

			<ProfileSection
				user={{
					// 세션 복구 직후 이름이 비어 있을 수 있어 UI 기본값을 둔다.
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
