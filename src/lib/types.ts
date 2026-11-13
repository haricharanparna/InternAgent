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
