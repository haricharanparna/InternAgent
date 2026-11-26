import type { BuiltResume, Profile, TailoredResume } from "./types";

// Word (.docx) export with no library: a .docx is a zip of a few XML files.
// We write an uncompressed ("stored") zip by hand, which every Word, Google
// Docs and LibreOffice version opens.

const enc = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true); local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true); local.setUint32(22, f.data.length, true); local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, f.data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, f.data.length, true); cen.setUint32(24, f.data.length, true);
    cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cenSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) { out.set(p, at); at += p.length; }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Run = { text: string; bold?: boolean; size?: number; color?: string };
type Para = { runs: Run[]; align?: "center"; bullet?: boolean; spaceBefore?: number; rule?: boolean };

function para(p: Para) {
  const props = [
    p.align ? `<w:jc w:val="${p.align}"/>` : "",
    `<w:spacing w:before="${p.spaceBefore ?? 0}" w:after="60"/>`,
    p.bullet ? `<w:ind w:left="360" w:hanging="220"/>` : "",
    p.rule ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>` : "",
  ].join("");
  const runs = (p.bullet ? [{ text: "•\t" }, ...p.runs] : p.runs)
    .map((r) => `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${r.bold ? "<w:b/>" : ""}<w:sz w:val="${r.size ?? 21}"/>${r.color ? `<w:color w:val="${r.color}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`)
    .join("");
  return `<w:p><w:pPr>${props}</w:pPr>${runs}</w:p>`;
}

export function docxBlob(paras: Para[]): Blob {
  const body = paras.map(para).join("");
  const files = [
    { name: "[Content_Types].xml", xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="900" w:right="1000" w:bottom="900" w:left="1000" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>` },
  ];
  const zip = zipStore(files.map((f) => ({ name: f.name, data: enc.encode(f.xml) })));
  return new Blob([zip.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

const heading = (t: string): Para => ({ runs: [{ text: t.toUpperCase(), bold: true, size: 22, color: "1F3A68" }], spaceBefore: 160, rule: true });

export function builtResumeParas(r: BuiltResume): Para[] {
  const out: Para[] = [
    { runs: [{ text: r.name || "Your Name", bold: true, size: 36 }], align: "center" },
    { runs: [{ text: r.contact.join("  ·  "), size: 19, color: "444444" }], align: "center" },
  ];
  if (r.summary) out.push(heading("Summary"), { runs: [{ text: r.summary }] });
  if (r.education.length) {
    out.push(heading("Education"));
    for (const e of r.education) {
      out.push({ runs: [{ text: e.school, bold: true }, { text: e.degree ? `, ${e.degree}` : "" }, { text: e.date ? `  ·  ${e.date}` : "", color: "555555" }] });
      for (const d of e.details) out.push({ runs: [{ text: d }], bullet: true });
    }
  }
  if (r.experiences.length) {
    out.push(heading("Experience"));
    for (const x of r.experiences) {
      out.push({ runs: [{ text: x.title, bold: true }, { text: x.organization ? `, ${x.organization}` : "" }, { text: [x.location, x.dates].filter(Boolean).length ? `  ·  ${[x.location, x.dates].filter(Boolean).join(" · ")}` : "", color: "555555" }], spaceBefore: 80 });
      for (const b of x.bullets) out.push({ runs: [{ text: b }], bullet: true });
    }
  }
  if (r.skills.length) {
    out.push(heading("Skills"));
    for (const s of r.skills) out.push({ runs: [{ text: `${s.label}: `, bold: true }, { text: s.items.join(", ") }] });
  }
  return out;
}

export function tailoredResumeParas(p: Profile, r: TailoredResume): Para[] {
  const out: Para[] = [
    { runs: [{ text: p.name || "Your Name", bold: true, size: 36 }], align: "center" },
    { runs: [{ text: [p.email, [p.major, p.school].filter(Boolean).join(", "), p.graduationYear && `Class of ${p.graduationYear}`].filter(Boolean).join("  ·  "), size: 19, color: "444444" }], align: "center" },
  ];
  if (r.summary) out.push(heading("Summary"), { runs: [{ text: r.summary }] });
  if (r.experiences.length) {
    out.push(heading("Experience"));
    for (const x of r.experiences) {
      out.push({ runs: [{ text: x.title, bold: true }, { text: x.organization ? `, ${x.organization}` : "" }], spaceBefore: 80 });
      for (const b of x.bullets) out.push({ runs: [{ text: b.tailored }], bullet: true });
    }
  }
  if (r.skills.length) out.push(heading("Skills"), { runs: [{ text: r.skills.join(", ") }] });
  return out;
}

export function downloadDocx(paras: Para[], filename: string) {
  const url = URL.createObjectURL(docxBlob(paras));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
