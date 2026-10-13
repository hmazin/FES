import type {NextConfig} from "next";
const config:NextConfig={
  // Google clients load package metadata and protocol files at runtime; retain their native Node package layouts.
  serverExternalPackages:["@google-cloud/storage","@google-cloud/firestore","google-auth-library"],
  outputFileTracingExcludes:{"*": ["./.local-data/**/*","./work/**/*","./outputs/**/*"]},
};
export default config;
