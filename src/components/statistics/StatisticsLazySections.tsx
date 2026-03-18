import { CategoryRankingList } from "@/components/statistics/CategoryRankingList";
import type { CategoryRanking } from "@/server/actions/statistics";

// 파일 역할:
// - 통계 화면의 "늦게 읽혀도 되는 하단 랭킹 섹션" 경계만 분리하는 얇은 wrapper다;
// 사용 위치:
// - `/statistics` 페이지의 서버 섹션이 데이터를 모은 뒤 이 컴포넌트를 호출한다;
// 흐름:
// - 섹션 단위 layout과 `content-visibility` 힌트만 맡고, 실제 카드 렌더링은 `CategoryRankingList`에 위임한다;
interface StatisticsRankingSectionProps {
	ranking: CategoryRanking[];
	selectedCategoryId: string | null;
	clearCategoryHref: string;
}

export function StatisticsRankingSection({
	ranking,
	selectedCategoryId,
	clearCategoryHref,
}: StatisticsRankingSectionProps) {
	// 랭킹 리스트는 더 이상 로컬 상태가 없어서 서버에서 바로 그려
	// 통계 상세 하단 카드의 불필요한 하이드레이션을 줄인다.
	return (
		// 이 영역은 화면 상단보다 늦게 보이는 경우가 많아
		// 브라우저가 필요 시점 전까지 레이아웃/페인트 비용을 미룰 수 있게 힌트를 준다.
		<div className="px-4 py-2" style={{ contentVisibility: "auto", containIntrinsicBlockSize: "360px" }}>
			<CategoryRankingList
				data={ranking}
				selectedCategoryId={selectedCategoryId}
				clearCategoryHref={clearCategoryHref}
			/>
		</div>
	);
}
