const basePathRaw = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim();
const basePath =
  basePathRaw.length > 0 ? basePathRaw.replace(/\/$/, "") : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  ...(basePath
    ? { basePath, assetPrefix: `${basePath}/` }
    : {}),
};

export default nextConfig;
