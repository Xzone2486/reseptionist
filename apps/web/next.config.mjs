/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@receptionist/shared"]
};

export default nextConfig;

