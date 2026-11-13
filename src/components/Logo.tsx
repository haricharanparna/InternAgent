// Briefcase with an upward arrow: "your career, going up".
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#2563EB" />
      <path d="M15 13.5v-1.75A1.75 1.75 0 0 1 16.75 10h6.5A1.75 1.75 0 0 1 25 11.75v1.75" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="9" y="13.5" width="22" height="16" rx="3.5" stroke="#fff" strokeWidth="2.2" />
      <path d="M16 24.5l4-4 4 4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20.8v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="transition-transform duration-300 group-hover:-rotate-6"><LogoMark size={32} /></span>
      <span className="font-serif text-[1.45rem] font-semibold tracking-tight text-slate-900">InternAgent</span>
    </span>
  );
}
