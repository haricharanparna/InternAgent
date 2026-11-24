import type { Job, Profile } from "./types";

// Free resume-vs-posting keyword match, like the "ATS match" score in resume
// tools: which hard skills the posting names, and which of them your resume shows.
// Plain code, no AI. Each entry is [display name, ...other spellings].

const SKILLS: string[][] = [
  // Languages
  ["Python"], ["Java"], ["JavaScript", "js", "ecmascript"], ["TypeScript", "ts"], ["C++", "cpp"], ["C#", "csharp", "c sharp"],
  ["C", "c language"], ["Go", "golang"], ["Rust"], ["Ruby"], ["PHP"], ["Swift"], ["Kotlin"], ["Scala"], ["R", "r programming", "rstudio"],
  ["MATLAB"], ["SQL", "mysql", "postgresql", "postgres", "sqlite", "t-sql"], ["HTML"], ["CSS"], ["Bash", "shell scripting"],
  ["Verilog"], ["VHDL"], ["Assembly"], ["Julia"], ["SAS"], ["Stata"], ["Solidity"],
  // Web, mobile, frameworks
  ["React", "react.js", "reactjs"], ["Next.js", "nextjs"], ["Angular"], ["Vue", "vue.js"], ["Node.js", "node", "nodejs"],
  ["Express"], ["Django"], ["Flask"], ["FastAPI"], ["Spring", "spring boot"], [".NET", "dotnet", "asp.net"], ["Rails", "ruby on rails"],
  ["GraphQL"], ["REST APIs", "rest api", "restful"], ["iOS"], ["Android"], ["React Native"], ["Flutter"], ["Tailwind"],
  // Data, ML
  ["pandas"], ["NumPy"], ["scikit-learn", "sklearn"], ["TensorFlow"], ["PyTorch"], ["Keras"], ["Spark", "pyspark", "apache spark"],
  ["Hadoop"], ["Airflow"], ["dbt"], ["Snowflake"], ["BigQuery"], ["Databricks"], ["Kafka"], ["Tableau"], ["Power BI", "powerbi"],
  ["Looker"], ["Excel", "microsoft excel", "spreadsheets"], ["Google Sheets"], ["Jupyter"], ["machine learning", "ml"],
  ["deep learning"], ["NLP", "natural language processing"], ["computer vision"], ["LLMs", "llm", "large language models", "generative ai"],
  ["statistics", "statistical analysis"], ["data analysis", "data analytics", "data analyst", "analyzed data", "analyzing data", "survey analysis"], ["data visualization"], ["A/B testing", "ab testing", "experimentation"],
  ["ETL"], ["data modeling"],
  // Cloud, infra, tools
  ["AWS", "amazon web services"], ["Azure"], ["GCP", "google cloud"], ["Docker"], ["Kubernetes", "k8s"], ["Terraform"], ["Linux", "unix"],
  ["Git", "github", "gitlab"], ["CI/CD", "ci cd", "continuous integration"], ["Jenkins"], ["MongoDB"], ["Redis"], ["Firebase"],
  ["distributed systems"], ["microservices"], ["networking", "tcp/ip"], ["security", "cybersecurity"], ["Jira"], ["Agile", "scrum"],
  ["unit testing", "testing", "pytest", "jest"], ["object-oriented programming", "oop", "object oriented"], ["data structures"], ["algorithms"],
  // Hardware, engineering
  ["CAD", "solidworks", "autocad", "fusion 360"], ["embedded systems", "embedded"], ["PCB design", "pcb", "altium"], ["FPGA"],
  ["circuit design"], ["LabVIEW"], ["ROS"], ["robotics"],
  // Design, product, business
  ["Figma"], ["Adobe Photoshop", "photoshop"], ["Illustrator", "adobe illustrator"], ["UX research", "user research"],
  ["prototyping"], ["wireframing", "wireframes"], ["product management"], ["SEO"], ["Google Analytics"], ["Salesforce"], ["HubSpot"],
  ["financial modeling"], ["accounting"], ["marketing"], ["copywriting"], ["social media"], ["project management"],
  ["public speaking", "presentations"], ["Spanish"], ["Mandarin", "chinese"], ["French"],
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Word-boundary match that also works for names like "C++", "C#" and ".NET".
const pattern = (term: string) => new RegExp(`(^|[^a-z0-9+#.])${esc(term.toLowerCase())}(?![a-z0-9+#])`, "i");
const ENTRIES = SKILLS.map(([name, ...alt]) => ({ name, tests: [name, ...alt].map(pattern) }));
// One-letter names (C, R) are only trusted next to words like "language" or in a list of skills.
const RISKY = new Set(["C", "R", "Go", "Swift", "Spring", "Express", "Rust", "Assembly", "Looker", "testing", "security", "networking", "marketing"]);

function found(text: string) {
  const t = ` ${text.toLowerCase()} `;
  return ENTRIES.filter((e) => e.tests.some((re) => re.test(t))).map((e) => e.name);
}

export type KeywordMatch = { pct: number; matched: string[]; missing: string[] };

// Returns null when the posting has too little text to judge (e.g. SimplifyJobs listings).
export function keywordMatch(job: Job, profile: Profile): KeywordMatch | null {
  if (job.source === "simplify" || job.description.length < 300) return null;
  const wanted = found(`${job.title} ${job.description}`).filter((n) => !RISKY.has(n) || pattern(`${n} programming`).test(job.description) || job.description.includes(`${n},`) || job.description.includes(`, ${n}`));
  if (wanted.length < 3) return null;
  const resumeText = [profile.skills.join(", "), profile.major, ...profile.experiences.flatMap((e) => [e.title, ...e.bullets])].join(" \n ");
  const have = new Set(found(resumeText));
  const matched = wanted.filter((w) => have.has(w));
  const missing = wanted.filter((w) => !have.has(w));
  return { pct: Math.round((matched.length / wanted.length) * 100), matched, missing };
}
