import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../../"),
  webpack: (config) => {
    // Allow importing TS sources using ".js" specifiers (NodeNext-style)
    // when the actual files are ".ts"/".tsx" in the workspace.
    config.resolve.extensionAlias ??= {};
    config.resolve.extensionAlias[".js"] = [".ts", ".tsx", ".js"];
    return config;
  },
};

export default nextConfig;
