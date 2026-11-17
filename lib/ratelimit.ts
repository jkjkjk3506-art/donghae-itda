/** 서버 인스턴스 메모리 기준 간단 제한 (API 비용 폭주 방지용, 완벽하지 않음) */
const hits = new Map<string, number[]>();
export function allow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}
export function ipOf(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
