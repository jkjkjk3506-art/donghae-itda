import "./globals.css";
import type { Metadata } from "next";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "동해시 AI 잇다",
  description: "사진 한 장으로 우리 집 수리에 맞는 지원사업과 동해시 업체를 이어 드려요",
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
