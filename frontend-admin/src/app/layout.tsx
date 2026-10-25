import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ระบบหลังร้าน | ร้านผลไม้เบื้องบน",
  description: "จัดการสินค้าและคำสั่งซื้อของร้านผลไม้เบื้องบน",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
