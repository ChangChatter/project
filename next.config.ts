import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repo's own CLAUDE.md is the canonical, human-maintained agent
  // instructions file (see CLAUDE.md's "Fully Completely" sprint
  // lifecycle). Next.js's auto-generated agent-rules block would
  // otherwise append itself to that file on every `next dev` run.
  agentRules: false,
};

export default nextConfig;
