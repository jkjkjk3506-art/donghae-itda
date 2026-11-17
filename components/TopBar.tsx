"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function TopBar() {
  const p = usePathname();
  const [big, setBig] = useState(false);
  useEffect(() => { document.body.classList.toggle("big", big); }, [big]);
  return (
    <header className="top">
      <div className="in">
        <Link href="/" className="brand">동해시 AI <span>잇다</span></Link>
        <nav className="nav">
          <Link href="/" className={p === "/" ? "on" : ""}>시민</Link>
          <Link href="/admin" className={p.startsWith("/admin") ? "on" : ""}>주무관</Link>
          <Link href="/pro" className={p.startsWith("/pro") ? "on" : ""}>시공업체</Link>
          <button onClick={() => setBig(!big)} aria-pressed={big}>{big ? "글자 보통" : "글자 크게"}</button>
        </nav>
      </div>
    </header>
  );
}
