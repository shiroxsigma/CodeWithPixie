// mermaid 図（描画済み SVG）を PNG として書き出す。
//
// アプリの状態には依存しない（DOM とブラウザ API だけ）。保存先の決定と API 呼び出しは
// app.js 側の責務で、このモジュールは「SVG → PNG の Blob」と「クリップボードへ載せる」
// までを担う。純粋関数（diagramId / sanitizeName）はテストしやすいよう分けてある。

//: 書き出し倍率。等倍だと mermaid のラベル（11〜16px）が資料に貼ったとき甘くなる。
export const PNG_SCALE = 2;

/**
 * ファイル名に使える形へ均す。日本語は残す（Windows でも問題なく扱える）。
 * ドットは落とす — サーバ側が Path(name).stem を取るので、途中のドット以降が
 * 拡張子とみなされて切り落とされてしまう。
 */
export function sanitizeName(name) {
  return (name || "")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "figure";
}

/**
 * 図の識別子を決める。mdflow 記法の `%% id: 図ID` があればそれを使い、
 * 無ければ文書内の通し番号にする（同じ図を描き直したとき同じ名前に戻るのが要点。
 * 日時で名付けると再出力のたびに別ファイルが増える）。
 */
export function diagramId(src, index) {
  const m = /^\s*%%\s*id\s*:\s*(\S+)/m.exec(src || "");
  return sanitizeName(m ? m[1] : `figure-${index + 1}`);
}

/** SVG の自然サイズ。viewBox を優先し、無ければ実測に落とす。 */
export function svgSize(svgEl) {
  const vb = svgEl.getAttribute("viewBox")?.trim().split(/[\s,]+/);
  if (vb?.length === 4) {
    const w = parseFloat(vb[2]);
    const h = parseFloat(vb[3]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { width: w, height: h };
  }
  const r = svgEl.getBoundingClientRect();
  return { width: Math.max(1, r.width), height: Math.max(1, r.height) };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("SVG を画像として読み込めませんでした。"));
    img.src = url;
  });
}

/**
 * 描画済みの mermaid SVG を PNG の Blob にする。
 *
 * mermaid は SVG に `width="100%"` を付けるので、そのまま <img> に読ませると
 * ブラウザ既定の 300px に潰れる。クローンへ自然サイズを px で書き戻してから渡すこと。
 * スタイルは mermaid が SVG 内の <style> に埋め込んでいるので、外部 CSS が
 * 効かない <img> 経由でも見た目は保たれる。
 *
 * background に色を渡すと下地を塗る（null なら透明）。ダークテーマの図は文字が
 * 淡色なので、透明のまま白地に貼ると読めなくなる。
 */
export async function svgToPngBlob(svgEl, { scale = PNG_SCALE, background = null } = {}) {
  const { width, height } = svgSize(svgEl);
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("style");  // toBox が入れた width/max-width を持ち込まない
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const markup = new XMLSerializer().serializeToString(clone);
  // Blob URL は同一オリジン扱いなので canvas が汚染されない（toBlob が使える）。
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG に変換できませんでした。"))),
        "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Blob を base64（データ URL のヘッダを外した本体）にする。API へ渡す形。 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",", 2)[1] || "");
    fr.onerror = () => reject(new Error("画像データを読めませんでした。"));
    fr.readAsDataURL(blob);
  });
}

/** PNG をクリップボードへ載せる（Slack や資料へそのまま貼れる）。 */
export async function copyPngToClipboard(blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("このブラウザは画像のクリップボードコピーに対応していません。");
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
