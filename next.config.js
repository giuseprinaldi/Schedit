/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from trying to bundle native/binary files from libsql
      config.externals = config.externals || [];
      config.externals.push({
        "@libsql/client": "commonjs @libsql/client",
        "@prisma/adapter-libsql": "commonjs @prisma/adapter-libsql",
      });
    }
    // Ignore .md and LICENSE files inside node_modules
    config.module.rules.push({
      test: /\.(md|LICENSE)$/,
      use: "null-loader",
    });
    return config;
  },
};

module.exports = nextConfig;
