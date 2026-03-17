import { getAccounts, getAccountSummary } from "@/server/actions/account";
import { NetWorthCard } from "@/components/assets/NetWorthCard";
import { AccountList } from "@/components/assets/AccountList";
import { Separator } from "@/components/ui/separator";

export default async function AssetsPage() {
	// 순자산 카드와 계정 목록이 같은 시점의 계정 스냅샷을 보도록
	// 요약과 목록 데이터를 함께 읽어 한 번에 렌더링한다.
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
