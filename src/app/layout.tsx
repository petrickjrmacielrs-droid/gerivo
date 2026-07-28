import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerivo",
  description: "Seu negócio. Seu sistema.",
  icons: { icon: "/gerivo-mark.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
