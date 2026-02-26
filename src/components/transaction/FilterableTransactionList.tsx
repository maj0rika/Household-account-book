"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TransactionList } from "@/components/transaction/TransactionList";
import type { Transaction, Category, Account } from "@/types";

interface Filters {
	query: string;
	type: "income" | "expense" | null;
	categoryIds: string[];
}

const INITIAL_FILTERS: Filters = {
	query: "",
	type: null,
	categoryIds: [],
};

function applyFilters(transactions: Transaction[], filters: Filters): Transaction[] {
	let result = transactions;

	if (filters.query) {
		const q = filters.query.toLowerCase();
		result = result.filter((t) => t.description.toLowerCase().includes(q));
	}
	if (filters.type) {
		result = result.filter((t) => t.type === filters.type);
	}
	if (filters.categoryIds.length > 0) {
		const idSet = new Set(filters.categoryIds);
		result = result.filter((t) => t.categoryId !== null && idSet.has(t.categoryId));
	}

	return result;
}

// --- FilterBar (내부 컴포넌트) ---

function FilterBar({
	categories,
	filters,
	onFiltersChange,
}: {
	categories: Category[];
	filters: Filters;
	onFiltersChange: (filters: Filters) => void;
}) {
	const [localQuery, setLocalQuery] = useState(filters.query);
	const [filtersOpen, setFiltersOpen] = useState(false);

	const hasActiveFilters = !!filters.query || !!filters.type || filters.categoryIds.length > 0;

	const handleSearch = useCallback(() => {
		onFiltersChange({ ...filters, query: localQuery });
	}, [filters, localQuery, onFiltersChange]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSearch();
	};

	const handleClearQuery = () => {
		setLocalQuery("");
		onFiltersChange({ ...filters, query: "" });
	};

	const handleTypeToggle = (type: "income" | "expense") => {
		const newType = filters.type === type ? null : type;
		// 유형 변경 시 해당 유형에 속하지 않는 카테고리 자동 해제
		const newCategoryIds = newType
			? filters.categoryIds.filter(
					(id) => categories.find((c) => c.id === id)?.type === newType,
				)
			: filters.categoryIds;
		onFiltersChange({ ...filters, type: newType, categoryIds: newCategoryIds });
	};

	const handleCategoryToggle = (categoryId: string) => {
		const next = filters.categoryIds.includes(categoryId)
			? filters.categoryIds.filter((id) => id !== categoryId)
			: [...filters.categoryIds, categoryId];
		onFiltersChange({ ...filters, categoryIds: next });
	};

	const handleReset = () => {
		setLocalQuery("");
		onFiltersChange(INITIAL_FILTERS);
	};

	const displayCategories =
		filters.type === "income"
			? categories.filter((c) => c.type === "income")
			: filters.type === "expense"
				? categories.filter((c) => c.type === "expense")
				: categories;

	return (
		<div className="px-4 py-2">
			{/* 검색바 */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={localQuery}
						onChange={(e) => setLocalQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="거래 내역 검색..."
						className="h-9 pl-8 pr-8 text-sm"
					/>
					{localQuery && (
						<button
							type="button"
							onClick={handleClearQuery}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
				<Button
					variant={filtersOpen ? "secondary" : "outline"}
					size="icon"
					className="h-9 w-9 shrink-0"
					onClick={() => setFiltersOpen(!filtersOpen)}
				>
					<SlidersHorizontal className="h-3.5 w-3.5" />
				</Button>
			</div>

			{/* 활성 필터 칩 */}
			{hasActiveFilters && (
				<div className="mt-2 flex flex-wrap items-center gap-1.5">
					{filters.query && (
						<Badge variant="secondary" className="gap-1 text-xs">
							&quot;{filters.query}&quot;
							<button
								type="button"
								onClick={handleClearQuery}
								className="p-1 -mr-1 rounded-full hover:bg-muted"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					)}
					{filters.type && (
						<Badge variant="secondary" className="gap-1 text-xs">
							{filters.type === "income" ? "수입" : "지출"}
							<button
								type="button"
								onClick={() => onFiltersChange({ ...filters, type: null })}
								className="p-1 -mr-1 rounded-full hover:bg-muted"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					)}
					{filters.categoryIds.map((catId) => {
						const cat = categories.find((c) => c.id === catId);
						return (
							<Badge key={catId} variant="secondary" className="gap-1 text-xs">
								{cat ? `${cat.icon} ${cat.name}` : "카테고리"}
								<button
									type="button"
									onClick={() =>
										onFiltersChange({
											...filters,
											categoryIds: filters.categoryIds.filter(
												(id) => id !== catId,
											),
										})
									}
									className="p-1 -mr-1 rounded-full hover:bg-muted"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						);
					})}
					<button
						type="button"
						onClick={handleReset}
						className="text-xs text-muted-foreground hover:text-foreground"
					>
						초기화
					</button>
				</div>
			)}

			{/* 필터 패널 */}
			<AnimatePresence>
				{filtersOpen && (
					<motion.div
						className="mt-3 space-y-3 overflow-hidden"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						{/* 유형 필터 */}
						<div>
							<p className="mb-1.5 text-xs font-medium text-muted-foreground">유형</p>
							<div className="flex gap-1.5">
								<Button
									size="sm"
									variant={filters.type === "expense" ? "default" : "outline"}
									className="h-7 text-xs"
									onClick={() => handleTypeToggle("expense")}
								>
									지출
								</Button>
								<Button
									size="sm"
									variant={filters.type === "income" ? "default" : "outline"}
									className="h-7 text-xs"
									onClick={() => handleTypeToggle("income")}
								>
									수입
								</Button>
							</div>
						</div>

						{/* 카테고리 필터 */}
						<div>
							<p className="mb-1.5 text-xs font-medium text-muted-foreground">
								카테고리
							</p>
							<div className="flex flex-wrap gap-1.5">
								{displayCategories.map((cat) => (
									<Button
										key={cat.id}
										size="sm"
										variant={
											filters.categoryIds.includes(cat.id)
												? "default"
												: "outline"
										}
										className="h-7 gap-1 text-xs"
										onClick={() => handleCategoryToggle(cat.id)}
									>
										<span>{cat.icon}</span>
										{cat.name}
									</Button>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// --- 메인 컨테이너 ---

export function FilterableTransactionList({
	transactions,
	categories,
	accounts = [],
}: {
	transactions: Transaction[];
	categories: Category[];
	accounts?: Account[];
}) {
	const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

	const filteredTransactions = useMemo(
		() => applyFilters(transactions, filters),
		[transactions, filters],
	);

	const hasActiveFilters = !!filters.query || !!filters.type || filters.categoryIds.length > 0;

	return (
		<>
			<FilterBar categories={categories} filters={filters} onFiltersChange={setFilters} />
			{hasActiveFilters && (
				<div className="px-4 py-1.5 text-xs text-muted-foreground">
					검색 결과 {filteredTransactions.length}건
					{filteredTransactions.length > 0 && (
						<>
							{" · "}총{" "}
							{filteredTransactions
								.reduce(
									(sum, t) => sum + (t.type === "expense" ? -t.amount : t.amount),
									0,
								)
								.toLocaleString()}
							원
						</>
					)}
				</div>
			)}
			<TransactionList transactions={filteredTransactions} categories={categories} accounts={accounts} />
		</>
	);
}
