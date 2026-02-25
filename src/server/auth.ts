import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { categories } from "@/server/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.authUsers,
			session: schema.authSessions,
			account: schema.authAccounts,
			verification: schema.authVerifications,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		},
	},
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await db.insert(categories).values(
						DEFAULT_CATEGORIES.map((cat, index) => ({
							userId: user.id,
							name: cat.name,
							icon: cat.icon,
							type: cat.type,
							sortOrder: index + 1,
							isDefault: true,
						})),
					).onConflictDoNothing();
				},
			},
		},
	},
});
