"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function MyRequests() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem("itda_requests") || "[]")); } catch {} }, []);
  if (!list.length) return null;
  return (
    <div className="myreq">
      <b>내가 보낸 견적 요청</b>
      {list.slice(0, 3).map((t, i) => <Link key={t} href={`/r/${t}`}>{i === 0 ? "가장 최근 요청 보기 →" : `${i + 1}번째 전 요청 →`}</Link>)}
    </div>
  );
}
