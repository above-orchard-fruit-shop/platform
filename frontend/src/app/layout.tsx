import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Providers from "@/components/Providers";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ร้านผลไม้เบื้องบน | ผลไม้สดสั่งออนไลน์",
    template: "%s | ร้านผลไม้เบื้องบน",
  },
  description:
    "ร้านผลไม้เบื้องบน ผลไม้สดคัดเกรด ดูสินค้าและราคาได้ตลอด 24 ชั่วโมง สั่งซื้อออนไลน์ส่งถึงบ้าน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <SiteHeader />
            <main className="site-main">{children}</main>
            <SiteFooter />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
