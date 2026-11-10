import type { NextConfig } from "next";

// Sin cacheComponents: las páginas de reserva y el panel leen datos que cambian
// a cada momento y se marcan con `dynamic = "force-dynamic"`.
const nextConfig: NextConfig = {};

export default nextConfig;
