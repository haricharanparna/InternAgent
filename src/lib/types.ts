export type Profile = {
  name: string;
  email: string;
  school: string;
  major: string;
  graduationYear: string;
  skills: string[];
  experiences: {
    title: string;
    organization: string;
    kind: "job" | "project" | "club" | "hackathon" | "volunteer" | "other";
    bullets: string[];
  }[];
  interests: string[];
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: "greenhouse" | "lever" | "ashby" | "simplify";
  description: string;
};

export type Fit = {
  id: string;
  score: number;
  matched: string[];
  missing: string[];
  reason: string;
};

export type ScoredJob = Job & { fit?: Fit };

export type RoleInfo = {
  summary: string;
  dayToDay: string[];
  lookingFor: string[];
  goodToKnow: string[];
  // True when the posting had little detail and the AI worked from the title.
  fromTitleOnly: boolean;
  company: {
    about: string;
    source: "wikipedia" | "posting" | "none";
    url?: string;
  };
};

export type TailoredResume = {
  summary: string;
  skills: string[];
  experiences: {
    title: string;
    organization: string;
    bullets: { original: string; tailored: string; why: string }[];
  }[];
  // Requirements from the posting the student doesn't show. Never added to the resume.
  gaps: string[];
};

// ---------- Chosen opportunities: next steps and emails ----------

export type AppStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

// What the server needs to know about one tracked internship.
export type Opportunity = {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  matched?: string[];
  missing?: string[];
  status: AppStatus;
  appliedAt?: string;
  notes?: string;
};

export type NextStep = { title: string; detail: string; when: string };

export type NextStepsPlan = {
  headline: string;
  steps: NextStep[];
  prep: string[];
  suggestedEmail: EmailType | "none";
  status: AppStatus; // the stage this plan was written for
  generatedAt: string;
  done?: number[]; // steps the student has checked off
};

export const EMAIL_TYPES = [
  { id: "outreach", label: "Reach out", hint: "Message a recruiter or employee before applying" },
  { id: "follow_up", label: "Follow up", hint: "Check in after applying with no reply" },
  { id: "thank_you", label: "Thank you", hint: "Send within 24 hours of an interview" },
  { id: "referral", label: "Ask for a referral", hint: "Ask someone you know at the company" },
  { id: "accept", label: "Accept offer", hint: "Accept and ask about next steps" },
  { id: "decline", label: "Decline offer", hint: "Say no politely and keep the door open" },
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number]["id"];

export type EmailDraft = { subject: string; body: string; tips: string[] };

// ---------- Resume builder ----------

export type ExperienceKind = Profile["experiences"][number]["kind"];

// The student's own answers to the builder's questions.
export type BuilderExperience = {
  id: string;
  kind: ExperienceKind;
  role: string;
  org: string;
  location: string;
  start: string;
  end: string;
  what: string; // what they did, in their own words
  tools: string; // tools and skills they used
  results: string; // numbers or outcomes, if any
};

export type BuilderAnswers = {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  school: string;
  degree: string;
  major: string;
  gradDate: string;
  gpa: string;
  coursework: string;
  honors: string;
  experiences: BuilderExperience[];
  skills: string;
  languages: string;
  target: string;
};

// The finished, editable resume. Contact, education and dates are copied from
// the answers by code; the AI only writes the summary, bullets and skill groups.
export type BuiltResume = {
  name: string;
  contact: string[];
  summary: string;
  education: { school: string; degree: string; date: string; details: string[] }[];
  experiences: { kind: ExperienceKind; title: string; organization: string; location: string; dates: string; bullets: string[] }[];
  skills: { label: string; items: string[] }[];
  // Questions that would make the resume stronger (e.g. "How many people used it?").
  tips: string[];
};
