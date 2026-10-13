import type {NextConfig} from "next";
const config:NextConfig={outputFileTracingExcludes:{"*": ["./.local-data/**/*","./work/**/*","./outputs/**/*"]}};
export default config;
