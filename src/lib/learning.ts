// Free learning resources and project ideas for common internship skills.
// Hand-picked official docs and free courses; every skill also gets a
// YouTube and freeCodeCamp search link. Nothing here is paid or sponsored.

export type Resource = { name: string; url: string };

const R: Record<string, Resource[]> = {
  Python: [{ name: "The official Python tutorial", url: "https://docs.python.org/3/tutorial/" }, { name: "freeCodeCamp: Scientific Computing with Python", url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/" }],
  SQL: [{ name: "SQLBolt: interactive SQL lessons", url: "https://sqlbolt.com/" }, { name: "Khan Academy: Intro to SQL", url: "https://www.khanacademy.org/computing/computer-programming/sql" }],
  JavaScript: [{ name: "The Modern JavaScript Tutorial", url: "https://javascript.info/" }],
  TypeScript: [{ name: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" }],
  React: [{ name: "react.dev: Learn React", url: "https://react.dev/learn" }],
  "Node.js": [{ name: "Node.js: Learn", url: "https://nodejs.org/en/learn" }],
  Git: [{ name: "Learn Git Branching (interactive)", url: "https://learngitbranching.js.org/" }, { name: "Pro Git book", url: "https://git-scm.com/book/en/v2" }],
  Docker: [{ name: "Docker: Get started", url: "https://docs.docker.com/get-started/" }],
  Kubernetes: [{ name: "Kubernetes Basics tutorial", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" }],
  AWS: [{ name: "AWS Skill Builder (free courses)", url: "https://skillbuilder.aws/" }],
  Azure: [{ name: "Microsoft Learn: Azure training", url: "https://learn.microsoft.com/en-us/training/azure/" }],
  GCP: [{ name: "Google Cloud training", url: "https://cloud.google.com/learn/training" }],
  Linux: [{ name: "Linux Journey", url: "https://linuxjourney.com/" }],
  Java: [{ name: "dev.java: Learn Java", url: "https://dev.java/learn/" }],
  "C++": [{ name: "LearnCpp.com", url: "https://www.learncpp.com/" }],
  Go: [{ name: "A Tour of Go", url: "https://go.dev/tour/" }],
  Rust: [{ name: "The Rust Book", url: "https://doc.rust-lang.org/book/" }],
  "C#": [{ name: "Microsoft Learn: C#", url: "https://learn.microsoft.com/en-us/dotnet/csharp/" }],
  pandas: [{ name: "Kaggle Learn: pandas", url: "https://www.kaggle.com/learn/pandas" }],
  NumPy: [{ name: "NumPy: Learn", url: "https://numpy.org/learn/" }],
  "machine learning": [{ name: "Kaggle Learn: Intro to Machine Learning", url: "https://www.kaggle.com/learn/intro-to-machine-learning" }, { name: "Google Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course" }],
  "deep learning": [{ name: "fast.ai: Practical Deep Learning", url: "https://course.fast.ai/" }],
  PyTorch: [{ name: "PyTorch tutorials", url: "https://pytorch.org/tutorials/" }],
  TensorFlow: [{ name: "TensorFlow tutorials", url: "https://www.tensorflow.org/tutorials" }],
  "scikit-learn": [{ name: "scikit-learn tutorials", url: "https://scikit-learn.org/stable/tutorial/index.html" }],
  LLMs: [{ name: "Hugging Face LLM Course", url: "https://huggingface.co/learn/llm-course" }],
  NLP: [{ name: "Hugging Face LLM Course (NLP)", url: "https://huggingface.co/learn/llm-course" }],
  "computer vision": [{ name: "Kaggle Learn: Computer Vision", url: "https://www.kaggle.com/learn/computer-vision" }],
  statistics: [{ name: "Khan Academy: Statistics and probability", url: "https://www.khanacademy.org/math/statistics-probability" }],
  "data visualization": [{ name: "Kaggle Learn: Data Visualization", url: "https://www.kaggle.com/learn/data-visualization" }],
  "data analysis": [{ name: "Kaggle Learn: pandas", url: "https://www.kaggle.com/learn/pandas" }],
  Tableau: [{ name: "Tableau free training videos", url: "https://www.tableau.com/learn/training" }],
  "Power BI": [{ name: "Microsoft Learn: Power BI", url: "https://learn.microsoft.com/en-us/training/powerplatform/power-bi" }],
  Excel: [{ name: "GCFGlobal: free Excel tutorials", url: "https://edu.gcfglobal.org/en/excel/" }],
  "data structures": [{ name: "MIT OpenCourseWare 6.006: Introduction to Algorithms", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/" }],
  algorithms: [{ name: "MIT OpenCourseWare 6.006: Introduction to Algorithms", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/" }],
  "REST APIs": [{ name: "MDN: An overview of HTTP", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" }],
  HTML: [{ name: "MDN: Learn web development", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development" }],
  CSS: [{ name: "MDN: Learn web development", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development" }],
  Spark: [{ name: "Apache Spark quick start", url: "https://spark.apache.org/docs/latest/quick-start.html" }],
  "CI/CD": [{ name: "GitHub Actions docs", url: "https://docs.github.com/en/actions" }],
  "unit testing": [{ name: "pytest: Get started", url: "https://docs.pytest.org/en/stable/getting-started.html" }],
  MATLAB: [{ name: "MATLAB Onramp (free)", url: "https://matlabacademy.mathworks.com/" }],
};

export function resourcesFor(skill: string): Resource[] {
  const q = encodeURIComponent(`${skill} tutorial for beginners`);
  return [
    ...(R[skill] || []),
    { name: `YouTube: ${skill} tutorials for beginners`, url: `https://www.youtube.com/results?search_query=${q}` },
    { name: `freeCodeCamp articles on ${skill}`, url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(skill)}` },
  ];
}

const GROUPS: [RegExp, (s: string) => string][] = [
  [/^(React|JavaScript|TypeScript|Node\.js|HTML|CSS|REST APIs|Next\.js|Vue|Angular|Express|GraphQL|Tailwind)$/, (s) => `Build a small web app with ${s} (for example a club event board or a study timer) and deploy it free on Vercel or GitHub Pages.`],
  [/^(SQL|pandas|Tableau|Excel|Power BI|statistics|data analysis|data visualization|NumPy|Looker|Google Sheets|R)$/, (s) => `Analyze a public dataset (data.gov or Kaggle) with ${s} and publish a short write-up with 2–3 charts and what you found.`],
  [/^(machine learning|PyTorch|TensorFlow|scikit-learn|deep learning|NLP|LLMs|computer vision|Keras)$/, (s) => `Train a simple model with ${s} on a Kaggle dataset and explain in a README what worked, what didn't and why.`],
  [/^(Docker|Kubernetes|AWS|Azure|GCP|CI\/CD|Linux|Git|Terraform|Jenkins)$/, (s) => `Use ${s} on a project you already have (containerize it, deploy it, or automate its tests) and write the steps in its README.`],
  [/^(Java|C\+\+|Go|Rust|C#|Python|Kotlin|Swift)$/, (s) => `Write a small, finished tool in ${s}, like a command-line to-do list or a grade calculator, with tests and a README.`],
];

export function projectFor(skill: string) {
  const g = GROUPS.find(([re]) => re.test(skill));
  return (g ? g[1](skill) : `Make one small, finished project that uses ${skill} and put it on GitHub with a README.`) + " Then add one honest resume bullet saying what you built.";
}
