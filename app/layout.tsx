import "./globals.css";
import type { Metadata } from "next";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "동해시 AI 잇다",
  description: "사진 한 장 올리면 동해시 확인 업체들이 집수리 견적을 보내드려요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
