import { getAccounts, getAccountSummary } from "@/server/actions/account";
import { NetWorthCard } from "@/components/assets/NetWorthCard";
import { AccountList } from "@/components/assets/AccountList";
import { Separator } from "@/components/ui/separator";

export default async function AssetsPage() {
	const [accounts, summary] = await Promise.all([
		getAccounts(),
		getAccountSummary(),
	]);

	return (
		<div className="pb-28 md:pb-24">
			<NetWorthCard summary={summary} />
			<Separator className="my-2" />
			<AccountList accounts={accounts} />
		</div>
	);
}
