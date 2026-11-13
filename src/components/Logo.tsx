// Briefcase with an upward arrow: "your career, going up".
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ia-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ia-g)" />
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
      <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"><LogoMark /></span>
      <span className="text-xl font-extrabold tracking-tight text-slate-900">
        Intern<span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Agent</span>
      </span>
    </span>
  );
}
