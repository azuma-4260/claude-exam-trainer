import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev 限定の検証支援: LAN 上の実機(スマホ)から dev サーバーの /_next アセットを
  // 取得できるようにする(Next 16 は localhost 以外のオリジンを既定でブロックする)。
  // allowedDevOrigins は dev サーバー専用設定のため production には影響しない
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGIN ? [process.env.DEV_ALLOWED_ORIGIN] : undefined,
};

export default nextConfig;
