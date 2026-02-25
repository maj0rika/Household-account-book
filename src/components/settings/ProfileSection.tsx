"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface ProfileSectionProps {
	user: {
		name: string;
		email: string;
	};
}

export function ProfileSection({ user }: ProfileSectionProps) {
	const router = useRouter();

	const handleLogout = async () => {
		await authClient.signOut();
		router.push("/login");
	};

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-semibold">프로필</h3>
			<div className="rounded-xl border border-border bg-card p-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
						{user.name.charAt(0)}
					</div>
					<div>
						<p className="text-sm font-medium">{user.name}</p>
						<p className="text-xs text-muted-foreground">{user.email}</p>
					</div>
				</div>
			</div>

			<Button variant="outline" className="w-full" onClick={handleLogout}>
				<LogOut className="mr-2 h-4 w-4" />
				로그아웃
			</Button>
		</div>
	);
}
