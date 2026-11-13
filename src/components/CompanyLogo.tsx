"use client";

import { useState } from "react";
import { LogoMark } from "./Logo";

// Hiring platforms whose domain says nothing about the company itself.
const ATS = /greenhouse\.io|lever\.co|ashbyhq\.com|icims\.com|smartrecruiters\.com|jobvite\.com|workable\.com|bamboohr\.com|simplify\.jobs|oraclecloud\.com|taleo\.net|successfactors|ultipro|adp\.com|paylocity|rippling|dayforce|eightfold\.ai|avature\.net|phenompeople|recruitee|pinpointhq|breezy\.hr|jazzhr|teamtailor|gem\.com|wellfound|linkedin\.com|indeed\.com|handshake/i;

function nameDomain(company: string) {
  const name = company
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|group|holdings|technologies|labs?)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
  return name ? `${name}.com` : "";
}

// Best guesses at a company's own website, used only to fetch its icon.
export function companyDomains(company: string, url: string) {
  const guesses: string[] = [];
  try {
    const host = new URL(url).hostname.toLowerCase();
    // nvidia.wd5.myworkdayjobs.com → nvidia.com
    if (host.includes("myworkdayjobs.com")) guesses.push(`${host.split(".")[0]}.com`);
    else if (!ATS.test(host)) {
      const parts = host.replace(/^(www|careers|jobs|job-boards|boards|apply|recruiting)\./, "").split(".");
      const tail = parts.slice(-2).join(".");
      guesses.push(/^(co|com|org|ac)\.[a-z]{2}$/.test(tail) ? parts.slice(-3).join(".") : tail);
    }
  } catch {}
  guesses.push(nameDomain(company));
  return [...new Set(guesses.filter(Boolean))];
}

export default function CompanyLogo({ company, url, size = 44 }: { company: string; url: string; size?: number }) {
  const domains = companyDomains(company, url);
  const [attempt, setAttempt] = useState(0);
  const domain = domains[attempt];
  const next = () => setAttempt((a) => a + 1);

  if (!domain) {
    return (
      <span className="shrink-0 opacity-90" title={company}>
        <LogoMark size={size} />
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={domain}
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
        alt={`${company} logo`}
        loading="lazy"
        className="h-full w-full object-contain"
        // Unknown domains get a tiny generic globe; treat that as "no logo" and try the next guess.
        onLoad={(e) => e.currentTarget.naturalWidth <= 16 && next()}
        onError={next}
      />
    </span>
  );
}
