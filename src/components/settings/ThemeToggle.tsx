"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		setDark(document.documentElement.classList.contains("dark"));
	}, []);

	const toggle = () => {
		const next = !dark;
		setDark(next);
		document.documentElement.classList.toggle("dark", next);
		localStorage.setItem("theme", next ? "dark" : "light");
	};

	return (
		<div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
			<div className="flex items-center gap-2 text-sm font-medium">
				{dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
				다크모드
			</div>
			<Button size="sm" variant="outline" onClick={toggle}>
				{dark ? "끄기" : "켜기"}
			</Button>
		</div>
	);
}
