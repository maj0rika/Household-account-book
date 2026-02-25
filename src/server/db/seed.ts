import "dotenv/config";

import { eq } from "drizzle-orm";

import { DEFAULT_CATEGORIES } from "@/lib/constants";

import { db } from "./index";
import { categories, authUsers } from "./schema";

const DEMO_USER_EMAIL = "seed@household.local";

const seed = async (): Promise<void> => {
	const now = new Date();

	await db.insert(authUsers).values({
		id: "seed-user-id",
		email: DEMO_USER_EMAIL,
		name: "Seed User",
		emailVerified: false,
		createdAt: now,
		updatedAt: now,
	}).onConflictDoNothing({
		target: authUsers.email,
	});

	const existingUser = await db
		.select({ id: authUsers.id })
		.from(authUsers)
		.where(eq(authUsers.email, DEMO_USER_EMAIL))
		.limit(1);

	const user = existingUser[0];

	if (!user) {
		throw new Error("Failed to resolve seed user");
	}

	await db.insert(categories).values(
		DEFAULT_CATEGORIES.map((category, index) => ({
			userId: user.id,
			name: category.name,
			icon: category.icon,
			type: category.type,
			sortOrder: index + 1,
			isDefault: true,
		})),
	).onConflictDoNothing();
};

seed()
	.then(() => {
		process.stdout.write("Seed completed\n");
		process.exit(0);
	})
	.catch((error: unknown) => {
		process.stderr.write(`Seed failed: ${String(error)}\n`);
		process.exit(1);
	});
