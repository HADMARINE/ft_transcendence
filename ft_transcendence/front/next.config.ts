import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
			{
				source: "/backend/:path*",
				destination: "http://localhost:61001/:path*",
			},
			{
				source: "/socket.io/:path*",
				destination: "http://localhost:61001/socket.io/:path*",
			},
		];
	},
};

export default nextConfig;
