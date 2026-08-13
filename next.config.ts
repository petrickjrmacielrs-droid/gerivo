import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  // @napi-rs/canvas usa bindings nativos do Node.js.
  // Mantemos o pacote fora do bundle do Next/Turbopack para as rotas de servidor.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
