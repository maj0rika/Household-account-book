import { getAccounts, getAccountSummary } from "@/server/actions/account";
import { NetWorthCard } from "@/components/assets/NetWorthCard";
import { AccountList } from "@/components/assets/AccountList";
import { PostActionBanner } from "@/components/common/PostActionBanner";
import { Separator } from "@/components/ui/separator";

interface Props {
	searchParams: Promise<{ saved?: string; focus?: string }>;
}

export default async function AssetsPage({ searchParams }: Props) {
	const params = await searchParams;

	const [accounts, summary] = await Promise.all([
		getAccounts(),
		getAccountSummary(),
	]);

	const savedMessage = params.saved === "account"
		? "자산/부채 저장이 완료됐어요. 자산 목록으로 이동했어요."
		: null;

	const focusTarget = params.focus === "accounts" ? "assets-account-list" : undefined;

	return (
		<div className="pb-28 md:pb-24">
			<PostActionBanner message={savedMessage} targetId={focusTarget} />
			<NetWorthCard summary={summary} />
			<Separator className="my-2" />
			<div id="assets-account-list">
				<AccountList accounts={accounts} />
			</div>
		</div>
	);
}
