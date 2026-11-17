"use client";
import { useEffect, useRef, useState } from "react";

const COLORS = ["#f2efe6", "#d9d4c7", "#c8d6df", "#a9c2b0", "#e6c9a8", "#9fb3c8", "#7b8a8b", "#ffffff"];

function hexToRgb(h: string) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }

/** ① 탭한 영역 색 바꾸기(브라우저, 즉시)  ② Gemini로 공사 후 모습 만들기 */
export default function Preview({ image, workName }: { image: string; workName: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const orig = useRef<ImageData | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [ai, setAi] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = cv.current!; const s = Math.min(1, 900 / img.width);
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      orig.current = ctx.getImageData(0, 0, c.width, c.height);
    };
    img.src = image;
  }, [image]);

  function tap(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = cv.current!; const r = c.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) * c.width / r.width), y = Math.floor((e.clientY - r.top) * c.height / r.height);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const cur = ctx.getImageData(0, 0, c.width, c.height); const d = cur.data; const W = c.width, H = c.height;
    const i0 = (y * W + x) * 4; const sr = d[i0], sg = d[i0 + 1], sb = d[i0 + 2];
    const [tr, tg, tb] = hexToRgb(color);
    const seen = new Uint8Array(W * H); const stack = [y * W + x]; const tol = 48 * 48 * 3;
    // 원래 밝기(음영)를 살리면서 색만 바꿔 질감 유지
    while (stack.length) {
      const p = stack.pop()!; if (seen[p]) continue; seen[p] = 1;
      const i = p * 4; const dr = d[i] - sr, dg = d[i + 1] - sg, db = d[i + 2] - sb;
      if (dr * dr + dg * dg + db * db > tol) continue;
      const o = orig.current!.data; const lum = (o[i] * .3 + o[i + 1] * .59 + o[i + 2] * .11) / ((sr * .3 + sg * .59 + sb * .11) || 1);
      const k = Math.min(1.25, Math.max(.6, lum));
      d[i] = Math.min(255, tr * k); d[i + 1] = Math.min(255, tg * k); d[i + 2] = Math.min(255, tb * k);
      const px = p % W, py = (p / W) | 0;
      if (px > 0) stack.push(p - 1); if (px < W - 1) stack.push(p + 1); if (py > 0) stack.push(p - W); if (py < H - 1) stack.push(p + W);
    }
    ctx.putImageData(cur, 0, 0);
  }
  function reset() { if (orig.current) cv.current!.getContext("2d")!.putImageData(orig.current, 0, 0); }

  async function genAI() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, instruction: `${workName} 공사를 깔끔하게 마친 모습. 균열·얼룩·곰팡이·누수 자국은 없애고 새로 시공한 것처럼.` }) });
      const j = await r.json();
      if (j.image) setAi(j.image); else setMsg(j.error || "만들지 못했어요");
    } catch { setMsg("네트워크 오류예요. 색 바꾸기 미리보기를 써 주세요."); }
    setBusy(false);
  }

  return (
    <section>
      <h2>🎨 공사 후 모습 미리보기</h2>
      <div className="grid g2">
        <div className="card">
          <h3>① 색 바꿔보기 (바로)</h3>
          <p className="small muted">색을 고르고 사진에서 벽을 눌러 보세요.</p>
          <div className="row" style={{ marginBottom: 10 }}>
            {COLORS.map((c) => <button key={c} aria-label={c} className={`swatch ${c === color ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />)}
            <button className="btn sm ghost" onClick={reset}>원래대로</button>
          </div>
          <div className="canvasbox"><canvas ref={cv} onClick={tap} /></div>
        </div>
        <div className="card">
          <h3>② AI로 공사 후 모습 보기</h3>
          <p className="small muted">AI가 사진을 바탕으로 예시 이미지를 만들어요 (10~30초).</p>
          {!ai && <button className="btn sea" disabled={busy} onClick={genAI}>{busy ? "만드는 중…" : "AI 미리보기 만들기"}</button>}
          {msg && <p className="small" style={{ color: "var(--danger)" }}>{msg}</p>}
          {ai && <div className="canvasbox"><img src={ai} alt="AI 예시 이미지" style={{ width: "100%", display: "block" }} /><span className="label-ai">AI 예시 이미지 · 실제와 다를 수 있어요</span></div>}
        </div>
      </div>
    </section>
  );
}
