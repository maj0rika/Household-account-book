"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		authClient.getSession().then(({ data }) => {
			if (data?.session) {
				router.replace("/transactions");
			} else {
				setChecked(true);
			}
		});
	}, [router]);

	if (!checked) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	return <>{children}</>;
}
