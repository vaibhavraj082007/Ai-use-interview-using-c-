/**
 * Question Engine
 *
 * Generates role-based interview questions from CV skills.
 * Currently uses a local mock bank. Designed with a provider pattern
 * so a Claude API provider can be swapped in later.
 *
 * Usage:
 *   const questions = generateQuestions({ role, skills, difficulty, count })
 */

/* ── Types ─────────────────────────────────────────────────────── */

export type QuestionType = 'coding' | 'conceptual' | 'oral'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface InterviewQuestion {
  id: string
  text: string
  skill: string
  topic: string
  type: QuestionType
  difficulty: Difficulty
  /** Optional starter code shown for 'coding' questions */
  starterCode?: string
  /** Time limit override in seconds (defaults to engine default) */
  timeLimitSeconds?: number
}

export interface GenerateOptions {
  role: string
  skills: string[]
  difficulty: Difficulty
  count: number
}

/* ── Question Type Metadata ────────────────────────────────────── */

export const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; color: string; bgColor: string; icon: string; description: string }
> = {
  coding: {
    label: 'Coding',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: '⌨️',
    description: 'Write or analyze code',
  },
  conceptual: {
    label: 'Conceptual',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    icon: '💡',
    description: 'Explain concepts & theory',
  },
  oral: {
    label: 'Oral',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: '🎙️',
    description: 'Discuss & articulate ideas',
  },
}

/* ── Mock Question Bank ────────────────────────────────────────── */

interface BankEntry {
  text: string
  topic: string
  type: QuestionType
  difficulty: Difficulty
  starterCode?: string
}

/**
 * Questions keyed by skill name (lowercase).
 * Each skill has a mix of coding, conceptual, and oral questions
 * across Easy / Medium / Hard difficulty levels.
 */
const QUESTION_BANK: Record<string, BankEntry[]> = {
  /* ── React ─────────────────────────────────────────────────── */
  react: [
    {
      text: 'What is the Virtual DOM and how does React use it to update the UI efficiently?',
      topic: 'React Internals',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Explain the differences between `useEffect` and `useLayoutEffect`. When would you choose one over the other?',
      topic: 'React Hooks',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'Walk me through how you would architect a complex form with dynamic validation, conditional fields, and auto-save in React.',
      topic: 'React Architecture',
      type: 'oral',
      difficulty: 'Hard',
    },
    {
      text: 'Write a custom `useDebounce` hook that delays updating a value until the user stops typing for a given delay.',
      topic: 'Custom Hooks',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: 'function useDebounce<T>(value: T, delay: number): T {\n  // your code here\n}',
    },
    {
      text: 'Implement a `usePrevious` hook that returns the previous value of a state variable.',
      topic: 'Custom Hooks',
      type: 'coding',
      difficulty: 'Easy',
      starterCode: 'function usePrevious<T>(value: T): T | undefined {\n  // your code here\n}',
    },
    {
      text: 'How does React\'s reconciliation algorithm decide when to unmount and remount a component vs. update it in place?',
      topic: 'React Internals',
      type: 'oral',
      difficulty: 'Hard',
    },
    {
      text: 'Explain the concept of React Server Components. How do they differ from traditional SSR?',
      topic: 'React Advanced',
      type: 'conceptual',
      difficulty: 'Hard',
    },
    {
      text: 'What are controlled vs uncontrolled components? Give an example of when you\'d prefer each.',
      topic: 'React Patterns',
      type: 'conceptual',
      difficulty: 'Easy',
    },
  ],

  /* ── TypeScript ────────────────────────────────────────────── */
  typescript: [
    {
      text: 'What is the difference between `interface` and `type` in TypeScript? When would you use one over the other?',
      topic: 'TypeScript Basics',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Write a generic `DeepPartial<T>` type that makes all nested properties optional.',
      topic: 'TypeScript Generics',
      type: 'coding',
      difficulty: 'Hard',
      starterCode: 'type DeepPartial<T> = {\n  // your code here\n}',
    },
    {
      text: 'Explain how discriminated unions work in TypeScript and give a practical example of when they\'re useful.',
      topic: 'TypeScript Patterns',
      type: 'oral',
      difficulty: 'Medium',
    },
    {
      text: 'Implement a type-safe event emitter class with `on`, `off`, and `emit` methods using TypeScript generics.',
      topic: 'TypeScript Generics',
      type: 'coding',
      difficulty: 'Hard',
      starterCode: 'type EventMap = Record<string, unknown[]>\n\nclass TypedEmitter<T extends EventMap> {\n  // your code here\n}',
    },
    {
      text: 'What are template literal types? Show how you\'d use them to create a type-safe CSS utility.',
      topic: 'TypeScript Advanced',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'How would you explain the benefits of TypeScript to a team that has been writing plain JavaScript? What are the trade-offs?',
      topic: 'TypeScript Adoption',
      type: 'oral',
      difficulty: 'Easy',
    },
  ],

  /* ── CSS ───────────────────────────────────────────────────── */
  css: [
    {
      text: 'Describe the CSS Box Model. How do `margin`, `border`, and `padding` interact, and what is the effect of `box-sizing: border-box`?',
      topic: 'CSS Fundamentals',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Write CSS to create a responsive card grid that shows 1 column on mobile, 2 on tablet, and 3 on desktop using CSS Grid.',
      topic: 'CSS Grid',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: '.card-grid {\n  /* your code here */\n}',
    },
    {
      text: 'Explain the difference between `position: relative`, `absolute`, `fixed`, and `sticky`. Give a use case for each.',
      topic: 'CSS Layout',
      type: 'oral',
      difficulty: 'Easy',
    },
    {
      text: 'How would you implement a dark mode system using CSS custom properties? Discuss theming strategies at scale.',
      topic: 'CSS Architecture',
      type: 'oral',
      difficulty: 'Hard',
    },
    {
      text: 'Create a pure CSS tooltip that appears on hover, positions itself above the element, and has a small arrow.',
      topic: 'CSS Components',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: '.tooltip {\n  position: relative;\n}\n.tooltip::after {\n  /* your code here */\n}',
    },
    {
      text: 'What is the CSS specificity algorithm? How do you resolve conflicts without using `!important`?',
      topic: 'CSS Specificity',
      type: 'conceptual',
      difficulty: 'Medium',
    },
  ],

  /* ── HTML ──────────────────────────────────────────────────── */
  html: [
    {
      text: 'What are semantic HTML elements and why are they important for accessibility and SEO?',
      topic: 'Semantic HTML',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Walk me through how you would structure the HTML for a complex dashboard page. What elements would you use and why?',
      topic: 'HTML Architecture',
      type: 'oral',
      difficulty: 'Medium',
    },
    {
      text: 'Write the HTML markup for an accessible modal dialog that traps focus and can be closed with Escape.',
      topic: 'HTML & A11y',
      type: 'coding',
      difficulty: 'Hard',
    },
  ],

  /* ── JavaScript ────────────────────────────────────────────── */
  javascript: [
    {
      text: 'Implement a `debounce` function from scratch. Explain when you\'d use debounce vs throttle.',
      topic: 'JavaScript Patterns',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: 'function debounce(fn, delay) {\n  // your code here\n}',
    },
    {
      text: 'What is the difference between `==` and `===` in JavaScript? Give examples where they produce different results.',
      topic: 'JavaScript Basics',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Explain closures in JavaScript with a practical example. How do closures relate to data privacy?',
      topic: 'JavaScript Core',
      type: 'oral',
      difficulty: 'Medium',
    },
    {
      text: 'Write a `deepClone` function that handles objects, arrays, dates, and circular references.',
      topic: 'JavaScript Algorithms',
      type: 'coding',
      difficulty: 'Hard',
      starterCode: 'function deepClone(obj, seen = new WeakMap()) {\n  // your code here\n}',
    },
    {
      text: 'Explain the JavaScript event loop. How do microtasks (Promises) and macrotasks (setTimeout) differ in scheduling?',
      topic: 'JavaScript Runtime',
      type: 'conceptual',
      difficulty: 'Hard',
    },
    {
      text: 'How would you explain prototypal inheritance to a developer coming from a class-based language like Java?',
      topic: 'JavaScript OOP',
      type: 'oral',
      difficulty: 'Medium',
    },
  ],

  /* ── Accessibility ─────────────────────────────────────────── */
  accessibility: [
    {
      text: 'What are the WCAG 2.1 AA requirements? Give examples of how you\'d meet them in a web application.',
      topic: 'Accessibility Standards',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'Walk me through how you would audit an existing website for accessibility issues. What tools and processes do you use?',
      topic: 'Accessibility Audit',
      type: 'oral',
      difficulty: 'Easy',
    },
    {
      text: 'Write ARIA attributes for a custom dropdown select component to make it fully accessible to screen readers.',
      topic: 'ARIA Patterns',
      type: 'coding',
      difficulty: 'Hard',
    },
  ],

  /* ── Node.js ───────────────────────────────────────────────── */
  'node.js': [
    {
      text: 'Explain the Node.js event loop and how it handles I/O operations differently from multi-threaded servers.',
      topic: 'Node.js Architecture',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'Implement a basic rate limiter middleware for an Express API using a sliding window algorithm.',
      topic: 'Node.js Middleware',
      type: 'coding',
      difficulty: 'Hard',
      starterCode: 'function rateLimiter(windowMs, maxRequests) {\n  // your code here\n  return (req, res, next) => {\n  }\n}',
    },
    {
      text: 'How would you design a Node.js service to handle 10,000 concurrent WebSocket connections? Discuss architecture choices.',
      topic: 'Node.js Scaling',
      type: 'oral',
      difficulty: 'Hard',
    },
    {
      text: 'What is the difference between `process.nextTick` and `setImmediate` in Node.js?',
      topic: 'Node.js Event Loop',
      type: 'conceptual',
      difficulty: 'Easy',
    },
  ],

  /* ── REST APIs ─────────────────────────────────────────────── */
  'rest apis': [
    {
      text: 'Explain REST principles. What makes an API truly RESTful vs. just using HTTP?',
      topic: 'API Design',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Design the API endpoints for a social media feed with pagination, filtering, and real-time updates. Walk me through your choices.',
      topic: 'API Architecture',
      type: 'oral',
      difficulty: 'Hard',
    },
    {
      text: 'Write an Express middleware that validates request bodies against a schema and returns structured error messages.',
      topic: 'API Validation',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: 'function validate(schema) {\n  return (req, res, next) => {\n    // your code here\n  }\n}',
    },
  ],

  /* ── SQL ───────────────────────────────────────────────────── */
  sql: [
    {
      text: 'What is the difference between `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, and `FULL OUTER JOIN`?',
      topic: 'SQL Joins',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Write a SQL query to find the top 3 customers by total order value in the last 30 days, including customers with no orders.',
      topic: 'SQL Queries',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: '-- Tables: customers(id, name), orders(id, customer_id, total, created_at)\nSELECT\n  -- your query here',
    },
    {
      text: 'Discuss database indexing strategies. When would you use a composite index vs. separate indexes? What are the trade-offs?',
      topic: 'SQL Performance',
      type: 'oral',
      difficulty: 'Hard',
    },
  ],

  /* ── Auth ──────────────────────────────────────────────────── */
  auth: [
    {
      text: 'Explain the difference between authentication and authorization. How do JWTs fit into this picture?',
      topic: 'Auth Concepts',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Walk me through how you would implement OAuth 2.0 social login (e.g. Google) in a full-stack application. What are the security considerations?',
      topic: 'OAuth 2.0',
      type: 'oral',
      difficulty: 'Hard',
    },
    {
      text: 'Implement a JWT verification middleware that checks token expiry, validates the signature, and attaches user data to the request.',
      topic: 'JWT Auth',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: 'function verifyJWT(secret) {\n  return (req, res, next) => {\n    // your code here\n  }\n}',
    },
  ],

  /* ── Testing ───────────────────────────────────────────────── */
  testing: [
    {
      text: 'What is the testing pyramid? Explain the trade-offs between unit tests, integration tests, and E2E tests.',
      topic: 'Testing Strategy',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Write a test for a React component that fetches data on mount and displays a loading state, then the data.',
      topic: 'React Testing',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: "import { render, screen, waitFor } from '@testing-library/react'\n\ntest('shows data after loading', async () => {\n  // your code here\n})",
    },
    {
      text: 'How would you convince a team that doesn\'t write tests to adopt testing? What\'s your testing philosophy?',
      topic: 'Testing Culture',
      type: 'oral',
      difficulty: 'Easy',
    },
  ],

  /* ── Docker ────────────────────────────────────────────────── */
  docker: [
    {
      text: 'What is the difference between a Docker image and a container? Explain the layered file system.',
      topic: 'Docker Basics',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Write a multi-stage Dockerfile for a Node.js application that minimizes the final image size.',
      topic: 'Dockerfile',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: '# Stage 1: Build\nFROM node:20-alpine AS builder\n# your code here\n\n# Stage 2: Production\nFROM node:20-alpine\n# your code here',
    },
    {
      text: 'Discuss how you would set up a local development environment with Docker Compose for a full-stack app with a database, API, and frontend.',
      topic: 'Docker Compose',
      type: 'oral',
      difficulty: 'Hard',
    },
  ],

  /* ── Python ────────────────────────────────────────────────── */
  python: [
    {
      text: 'What are Python decorators? Write a decorator that logs function execution time.',
      topic: 'Python Patterns',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: 'import time\n\ndef timer(func):\n    # your code here\n    pass',
    },
    {
      text: 'Explain the GIL (Global Interpreter Lock) in Python. How does it affect multi-threaded programs?',
      topic: 'Python Internals',
      type: 'conceptual',
      difficulty: 'Hard',
    },
    {
      text: 'Walk me through how you would structure a large Python project. What tools do you use for dependency management and code quality?',
      topic: 'Python Best Practices',
      type: 'oral',
      difficulty: 'Medium',
    },
  ],

  /* ── Pandas ────────────────────────────────────────────────── */
  pandas: [
    {
      text: 'What is the difference between `loc` and `iloc` in pandas? Give examples of each.',
      topic: 'Pandas Basics',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Write pandas code to clean a dataset: handle missing values, remove duplicates, and normalize a column.',
      topic: 'Data Cleaning',
      type: 'coding',
      difficulty: 'Medium',
      starterCode: "import pandas as pd\n\ndef clean_dataset(df: pd.DataFrame) -> pd.DataFrame:\n    # your code here\n    pass",
    },
    {
      text: 'Discuss strategies for working with large datasets in pandas that don\'t fit in memory.',
      topic: 'Pandas Performance',
      type: 'oral',
      difficulty: 'Hard',
    },
  ],

  /* ── Caching ───────────────────────────────────────────────── */
  caching: [
    {
      text: 'Explain cache invalidation strategies: write-through, write-behind, and cache-aside. When would you use each?',
      topic: 'Caching Patterns',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'Implement a simple LRU cache class with `get` and `put` methods with O(1) time complexity.',
      topic: 'LRU Cache',
      type: 'coding',
      difficulty: 'Hard',
      starterCode: 'class LRUCache {\n  constructor(capacity) {\n    // your code here\n  }\n  get(key) {}\n  put(key, value) {}\n}',
    },
    {
      text: 'How would you decide what to cache in a web application? Walk me through your decision framework.',
      topic: 'Caching Strategy',
      type: 'oral',
      difficulty: 'Easy',
    },
  ],

  /* ── Webpack / Bundlers ────────────────────────────────────── */
  webpack: [
    {
      text: 'What is tree-shaking and how do modern bundlers implement it? What are the prerequisites?',
      topic: 'Build Tools',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'Describe your ideal frontend build pipeline. How do you balance build speed with output optimization?',
      topic: 'Build Pipeline',
      type: 'oral',
      difficulty: 'Hard',
    },
    {
      text: 'Configure a Webpack setup with code splitting, lazy loading, and a shared vendor chunk.',
      topic: 'Webpack Config',
      type: 'coding',
      difficulty: 'Hard',
      starterCode: "module.exports = {\n  entry: './src/index.js',\n  optimization: {\n    // your code here\n  },\n}",
    },
  ],

  /* ── Statistics ────────────────────────────────────────────── */
  statistics: [
    {
      text: 'Explain the difference between Type I and Type II errors. Give a real-world example of each.',
      topic: 'Statistical Inference',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'How would you explain p-values and confidence intervals to a non-technical stakeholder?',
      topic: 'Statistics Communication',
      type: 'oral',
      difficulty: 'Easy',
    },
  ],

  /* ── ML Basics ─────────────────────────────────────────────── */
  'ml basics': [
    {
      text: 'Explain the bias-variance trade-off. How does it affect model selection?',
      topic: 'ML Fundamentals',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'Walk me through how you would approach a new classification problem from data exploration to model deployment.',
      topic: 'ML Workflow',
      type: 'oral',
      difficulty: 'Hard',
    },
  ],

  /* ── Data Viz ──────────────────────────────────────────────── */
  'data viz': [
    {
      text: 'What principles do you follow when designing data visualizations? Discuss chart selection for different data types.',
      topic: 'Visualization Design',
      type: 'oral',
      difficulty: 'Easy',
    },
    {
      text: 'Explain when to use a bar chart vs. line chart vs. scatter plot. What are common visualization mistakes?',
      topic: 'Visualization Principles',
      type: 'conceptual',
      difficulty: 'Easy',
    },
  ],

  /* ── ETL ───────────────────────────────────────────────────── */
  etl: [
    {
      text: 'What is the difference between ETL and ELT? When would you choose one over the other?',
      topic: 'Data Engineering',
      type: 'conceptual',
      difficulty: 'Medium',
    },
    {
      text: 'Describe how you would design a data pipeline that ingests real-time events, transforms them, and loads into a data warehouse.',
      topic: 'Pipeline Architecture',
      type: 'oral',
      difficulty: 'Hard',
    },
  ],

  /* ── CI/CD ─────────────────────────────────────────────────── */
  'ci/cd': [
    {
      text: 'What is the difference between continuous integration, continuous delivery, and continuous deployment?',
      topic: 'CI/CD Concepts',
      type: 'conceptual',
      difficulty: 'Easy',
    },
    {
      text: 'Walk me through how you would set up a CI/CD pipeline for a monorepo with multiple services.',
      topic: 'CI/CD Architecture',
      type: 'oral',
      difficulty: 'Hard',
    },
  ],
}

/* ── Fallback questions (used when skills don't match the bank) ── */

const FALLBACK_QUESTIONS: BankEntry[] = [
  {
    text: 'Tell me about a challenging technical problem you solved recently. What was your approach and what did you learn?',
    topic: 'Problem Solving',
    type: 'oral',
    difficulty: 'Easy',
  },
  {
    text: 'How do you stay up to date with new technologies? How do you decide which ones to learn?',
    topic: 'Professional Growth',
    type: 'oral',
    difficulty: 'Easy',
  },
  {
    text: 'Describe a time when you had to make a technical trade-off. How did you weigh the options?',
    topic: 'Decision Making',
    type: 'oral',
    difficulty: 'Medium',
  },
  {
    text: 'How do you approach code reviews? What do you look for and how do you give feedback?',
    topic: 'Collaboration',
    type: 'oral',
    difficulty: 'Medium',
  },
  {
    text: 'Walk me through how you would debug a production issue that you\'ve never seen before.',
    topic: 'Debugging',
    type: 'oral',
    difficulty: 'Hard',
  },
]

/* ── Provider Interface (for future Claude API) ────────────────── */

export interface QuestionProvider {
  name: string
  generate: (options: GenerateOptions) => Promise<InterviewQuestion[]>
}

/* ── Mock Provider ─────────────────────────────────────────────── */

/**
 * Generates questions from the local mock bank.
 * Balances question types across coding / conceptual / oral.
 */
function generateFromBank(options: GenerateOptions): InterviewQuestion[] {
  const { skills, difficulty, count } = options

  // 1. Gather all candidate questions matching the requested skills
  const pool: (BankEntry & { skill: string })[] = []

  for (const skill of skills) {
    const key = skill.toLowerCase()
    const entries = QUESTION_BANK[key]
    if (entries) {
      for (const entry of entries) {
        pool.push({ ...entry, skill })
      }
    }
  }

  // 2. Filter by difficulty: include the target level + adjacent levels
  const difficultyOrder: Difficulty[] = ['Easy', 'Medium', 'Hard']
  const targetIdx = difficultyOrder.indexOf(difficulty)

  function difficultyScore(d: Difficulty): number {
    const idx = difficultyOrder.indexOf(d)
    return Math.abs(idx - targetIdx)
  }

  // Sort pool: exact-difficulty first, then adjacent
  pool.sort((a, b) => difficultyScore(a.difficulty) - difficultyScore(b.difficulty))

  // 3. Balance question types (roughly equal split)
  const targetCounts: Record<QuestionType, number> = {
    coding: Math.ceil(count * 0.35),
    conceptual: Math.ceil(count * 0.35),
    oral: count - Math.ceil(count * 0.35) * 2 + Math.ceil(count * 0.35),
  }

  // Adjust to not exceed total
  const totalTarget = targetCounts.coding + targetCounts.conceptual + targetCounts.oral
  if (totalTarget > count) {
    targetCounts.oral = Math.max(1, targetCounts.oral - (totalTarget - count))
  }

  const selected: (BankEntry & { skill: string })[] = []
  const usedTexts = new Set<string>()

  // Pick questions per type
  for (const qType of ['coding', 'conceptual', 'oral'] as QuestionType[]) {
    const typePool = pool.filter(
      (q) => q.type === qType && !usedTexts.has(q.text)
    )
    const needed = targetCounts[qType]

    for (let i = 0; i < needed && i < typePool.length; i++) {
      selected.push(typePool[i])
      usedTexts.add(typePool[i].text)
    }
  }

  // 4. If we still need more questions, fill from remaining pool
  if (selected.length < count) {
    const remaining = pool.filter((q) => !usedTexts.has(q.text))
    for (const q of remaining) {
      if (selected.length >= count) break
      selected.push(q)
      usedTexts.add(q.text)
    }
  }

  // 5. If still short, pull from fallbacks
  if (selected.length < count) {
    for (const fb of FALLBACK_QUESTIONS) {
      if (selected.length >= count) break
      if (!usedTexts.has(fb.text)) {
        selected.push({ ...fb, skill: 'General' })
        usedTexts.add(fb.text)
      }
    }
  }

  // 6. Shuffle the final selection to interleave types
  shuffleArray(selected)

  // 7. Map to InterviewQuestion with unique IDs
  return selected.slice(0, count).map((q, idx) => ({
    id: `q-${idx + 1}`,
    text: q.text,
    skill: q.skill,
    topic: q.topic,
    type: q.type,
    difficulty: q.difficulty,
    starterCode: q.starterCode,
    timeLimitSeconds: q.type === 'coding' ? 180 : 120,
  }))
}

/** Fisher–Yates shuffle */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export const mockProvider: QuestionProvider = {
  name: 'mock',
  generate: async (options) => generateFromBank(options),
}

/* ── Claude API Provider (placeholder) ─────────────────────────── */

/**
 * TODO: Connect Claude API
 *
 * To enable AI-generated questions, implement this provider:
 *
 * 1. Set up an API route or serverless function that proxies to the
 *    Anthropic Messages API (never expose API keys client-side).
 *
 * 2. Send a prompt like:
 *    "Generate {count} interview questions for a {role} developer
 *     with skills in {skills}. Difficulty: {difficulty}.
 *     Mix: ~35% coding, ~35% conceptual, ~30% oral.
 *     Return JSON array with fields: text, topic, type, difficulty, starterCode?"
 *
 * 3. Parse the response and map to InterviewQuestion[].
 *
 * Example:
 *
 * export const claudeProvider: QuestionProvider = {
 *   name: 'claude',
 *   generate: async (options) => {
 *     const res = await fetch('/api/generate-questions', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(options),
 *     })
 *     const data = await res.json()
 *     return data.questions as InterviewQuestion[]
 *   },
 * }
 */

/* ── Main Entry Point ──────────────────────────────────────────── */

let activeProvider: QuestionProvider = mockProvider

export function setProvider(provider: QuestionProvider) {
  activeProvider = provider
}

export function getProvider(): QuestionProvider {
  return activeProvider
}

/**
 * Generate interview questions based on role, skills, difficulty, and count.
 * Uses the active provider (defaults to mock bank).
 */
export async function generateQuestions(
  options: GenerateOptions
): Promise<InterviewQuestion[]> {
  return activeProvider.generate(options)
}
