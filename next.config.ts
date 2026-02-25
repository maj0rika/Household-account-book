import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "10mb",
		},
	},
	async headers() {
		return [
			{
				source: "/sw.js",
				headers: [
					{ key: "Cache-Control", value: "no-cache" },
					{ key: "Service-Worker-Allowed", value: "/" },
				],
			},
			{
				source: "/manifest.json",
				headers: [
					{ key: "Cache-Control", value: "no-cache" },
				],
			},
		];
	},
};

export default nextConfig;
