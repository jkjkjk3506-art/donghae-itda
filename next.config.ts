import type { NextConfig } from "next";
const config: NextConfig = {
  outputFileTracingIncludes: { "/api/seed": ["./data/**/*.json"] },
};
export default config;
