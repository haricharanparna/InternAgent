import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { builtResumeParas, crc32, docxBlob } from "../src/lib/docx.ts";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("docx is a valid zip with the three required parts and escaped text", async () => {
  const blob = docxBlob(builtResumeParas({
    name: "Maya <Patel>", contact: ["maya@example.com"], summary: "Statistics & data.", tips: [],
    education: [{ school: "Ohio State", degree: "BS Statistics", date: "Expected May 2028", details: ["GPA: 3.8"] }],
    experiences: [{ kind: "project", title: "Survey Analysis", organization: "Class project", location: "", dates: "2025", bullets: ["Cleaned survey data in R"] }],
    skills: [{ label: "Tools", items: ["R", "Excel"] }],
  }));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  const text = new TextDecoder().decode(bytes);
  for (const part of ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]) assert.ok(text.includes(part), part);
  assert.ok(text.includes("Maya &lt;Patel&gt;") && text.includes("Statistics &amp; data."));
  // End-of-central-directory record says 3 files.
  const eocd = bytes.length - 22;
  assert.equal(new DataView(bytes.buffer).getUint32(eocd, true), 0x06054b50);
  assert.equal(new DataView(bytes.buffer).getUint16(eocd + 10, true), 3);
  if (process.env.DOCX_OUT) writeFileSync(join(mkdtempSync(join(tmpdir(), "docx-")), "resume.docx"), bytes);
});
