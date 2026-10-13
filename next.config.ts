import type {NextConfig} from "next";
const config:NextConfig={
  // Google clients load package metadata and protocol files at runtime; retain their native Node package layouts.
  serverExternalPackages:["@google-cloud/storage","@google-cloud/firestore","google-auth-library"],
  // Vercel's launcher also requires the framework boundary files before it can load a route.
  outputFileTracingIncludes:{"/*":["./node_modules/next/dist/lib/framework/**/*"]},
  outputFileTracingExcludes:{"/*": ["./.local-data/**/*","./work/**/*","./outputs/**/*"]},
};
export default config;
