import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { categories } from "@/server/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

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
	socialProviders:
		googleClientId && googleClientSecret
			? {
					google: {
						clientId: googleClientId,
						clientSecret: googleClientSecret,
					},
			  }
			: {},
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
