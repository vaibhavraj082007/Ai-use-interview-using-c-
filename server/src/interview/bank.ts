import type { QuestionType, Difficulty } from './provider.js'

/**
 * Curated question bank keyed by lowercase skill name.
 *
 * This is the single source of truth for mock-mode generation. Each skill
 * carries a mix of coding, conceptual, and oral questions across
 * Easy / Medium / Hard difficulty levels.
 */
export interface BankEntry {
  text: string
  topic: string
  type: QuestionType
  difficulty: Difficulty
  starterCode?: string
}

/** Hand-curated questions — highest quality, always served first. */
const CURATED_BANK: Record<string, BankEntry[]> = {
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
      starterCode:
        'function useDebounce<T>(value: T, delay: number): T {\n  // your code here\n}',
    },
    {
      text: 'Implement a `usePrevious` hook that returns the previous value of a state variable.',
      topic: 'Custom Hooks',
      type: 'coding',
      difficulty: 'Easy',
      starterCode:
        'function usePrevious<T>(value: T): T | undefined {\n  // your code here\n}',
    },
    {
      text: "How does React's reconciliation algorithm decide when to unmount and remount a component vs. update it in place?",
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
      text: "What are controlled vs uncontrolled components? Give an example of when you'd prefer each.",
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
      text: 'Explain how discriminated unions work in TypeScript and give a practical example of when they are useful.',
      topic: 'TypeScript Patterns',
      type: 'oral',
      difficulty: 'Medium',
    },
    {
      text: 'Implement a type-safe event emitter class with `on`, `off`, and `emit` methods using TypeScript generics.',
      topic: 'TypeScript Generics',
      type: 'coding',
      difficulty: 'Hard',
      starterCode:
        'type EventMap = Record<string, unknown[]>\n\nclass TypedEmitter<T extends EventMap> {\n  // your code here\n}',
    },
    {
      text: "What are template literal types? Show how you'd use them to create a type-safe CSS utility.",
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
      starterCode:
        '.tooltip {\n  position: relative;\n}\n.tooltip::after {\n  /* your code here */\n}',
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
      text: "Implement a `debounce` function from scratch. Explain when you'd use debounce vs throttle.",
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
      starterCode:
        'function deepClone(obj, seen = new WeakMap()) {\n  // your code here\n}',
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
      text: "What are the WCAG 2.1 AA requirements? Give examples of how you'd meet them in a web application.",
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
      starterCode:
        'function rateLimiter(windowMs, maxRequests) {\n  // your code here\n  return (req, res, next) => {\n  }\n}',
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
      starterCode:
        'function validate(schema) {\n  return (req, res, next) => {\n    // your code here\n  }\n}',
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
      starterCode:
        '-- Tables: customers(id, name), orders(id, customer_id, total, created_at)\nSELECT\n  -- your query here',
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
      starterCode:
        'function verifyJWT(secret) {\n  return (req, res, next) => {\n    // your code here\n  }\n}',
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
      starterCode:
        "import { render, screen, waitFor } from '@testing-library/react'\n\ntest('shows data after loading', async () => {\n  // your code here\n})",
    },
    {
      text: "How would you convince a team that doesn't write tests to adopt testing? What's your testing philosophy?",
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
      starterCode:
        '# Stage 1: Build\nFROM node:20-alpine AS builder\n# your code here\n\n# Stage 2: Production\nFROM node:20-alpine\n# your code here',
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
      starterCode:
        'import time\n\ndef timer(func):\n    # your code here\n    pass',
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
      starterCode:
        'import pandas as pd\n\ndef clean_dataset(df: pd.DataFrame) -> pd.DataFrame:\n    # your code here\n    pass',
    },
    {
      text: "Discuss strategies for working with large datasets in pandas that don't fit in memory.",
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
      starterCode:
        'class LRUCache {\n  constructor(capacity) {\n    // your code here\n  }\n  get(key) {}\n  put(key, value) {}\n}',
    },
    {
      text: "How would you decide what to cache in a web application? Walk me through your decision framework.",
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
      starterCode:
        "module.exports = {\n  entry: './src/index.js',\n  optimization: {\n    // your code here\n  },\n}",
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

/* ── Expanded question bank ───────────────────────────────────── */

/**
 * Topic library per skill — the raw material for bank expansion.
 *
 * Each topic is a noun phrase; combined with the templates below it yields
 * unique questions across all three types and difficulty tiers, which is how
 * the bank reaches 2000+ entries while staying fully hand-reviewable
 * (topics and templates are written; the sentences are assembled from them).
 */
const SKILL_TOPICS: Record<string, string[]> = {
  react: [
    'the Virtual DOM',
    'hooks and component state',
    'the useEffect lifecycle',
    'context and providers',
    'server components and streaming SSR',
    'memoization with React.memo',
    'keyed list reconciliation',
    'error boundaries',
    'lazy loading with Suspense',
    'controlled form inputs',
    'custom hook design',
    'the React fiber render model',
    'concurrent rendering and transitions',
    'ref forwarding and DOM nodes',
    'hydration mismatches in SSR',
    'profiling with React DevTools',
  ],
  typescript: [
    'discriminated unions',
    'generic constraints',
    'mapped and conditional types',
    'template literal types',
    'type guards and narrowing',
    'the strict null-check model',
    'utility types like Partial and Pick',
    'declaration merging',
    'abstract classes versus interfaces',
    'type inference in generic functions',
    'assertion functions',
    'index signatures and Record',
    'ambient declaration files',
    'decorator metadata',
    'nominal versus structural typing',
    'the satisfies operator',
  ],
  javascript: [
    'closures and lexical scope',
    'the event loop and task queues',
    'prototypal inheritance',
    'promises and async/await',
    'generators and iterators',
    'Proxy and Reflect',
    'WeakMap and memory retention',
    'debounce versus throttle',
    'module patterns and dynamic import',
    'structured clone and deep equality',
    'regular-expression performance',
    'binary search from scratch',
    'chained array transformations',
    'event delegation',
    'copy-on-write array methods',
    'Symbol and well-known symbols',
  ],
  css: [
    'flexbox layout',
    'CSS grid and named areas',
    'the cascade and specificity',
    'custom properties and theming',
    'container queries',
    'media queries and responsive breakpoints',
    'transitions and keyframe animations',
    'cascade layers',
    'stacking contexts and positioning',
    'overflow and scroll containers',
    'aspect-ratio and intrinsic sizing',
    'subgrid',
    'logical properties',
    'calc(), min(), max() and clamp() functions',
    'anchor positioning',
    'content-visibility',
  ],
  html: [
    'semantic landmarks',
    'form validation attributes',
    'native control accessibility',
    'document head and SEO meta tags',
    'the forgiving parsing model',
    'responsive images and the picture element',
    'data attributes',
    'inline SVG',
    'iframe security attributes',
    'lazy loading for images',
    'script loading with async and defer',
    'template and slot markup',
  ],
  accessibility: [
    'keyboard navigation patterns',
    'ARIA live regions',
    'focus management in dialogs',
    'color contrast requirements',
    'screen-reader testing workflows',
    'accessible form error messaging',
    'skip links and landmarks',
    'the prefers-reduced-motion query',
    'accessible data tables',
    'touch-target sizing',
    'accessible custom widgets versus native elements',
    'accessible carousels',
  ],
  'node.js': [
    'the libuv event loop phases',
    'streams and backpressure',
    'child processes and worker threads',
    'cluster mode on multi-core hosts',
    'Buffers and encodings',
    'async middleware error handling',
    'heap snapshots and memory leaks',
    'graceful shutdown',
    'filesystem watch modes',
    'the raw http module',
    'glob-style file traversal',
    'environment configuration',
    'dependency injection in services',
    'structured logging',
    'diagnosing event-loop lag',
    'process timing with hrtime',
  ],
  'rest apis': [
    'resource naming conventions',
    'cursor pagination',
    'HTTP status-code semantics',
    'API versioning strategies',
    'idempotency keys and retries',
    'ETag conditional requests',
    'rate-limit headers',
    'CORS preflight handling',
    'structured error envelopes',
    'webhook delivery design',
    'OpenAPI schemas',
    'batch and bulk endpoints',
    'content negotiation',
    'partial responses with field masks',
  ],
  sql: [
    'join variants and row fan-out',
    'window functions',
    'transaction isolation levels',
    'covering indexes',
    'query plans and EXPLAIN',
    'GROUP BY aggregation',
    'common table expressions',
    'upsert and conflict handling',
    'foreign-key cascade actions',
    'table partitioning',
    'SQLite-specific quirks',
    'parameterized queries',
    'nullable-column pitfalls',
    'correlated subqueries',
    'null-safe comparisons',
  ],
  auth: [
    'password hashing with bcrypt',
    'JWT structure and key rotation',
    'OAuth 2.0 authorization flows',
    'session cookie flags',
    'refresh-token rotation',
    'role-based access control',
    'CSRF defence',
    'the SameSite cookie policy',
    'API key scoping',
    'time-based one-time passwords',
    'passkeys and WebAuthn',
    'capability tokens',
  ],
  testing: [
    'unit-test structure',
    'mocking and test doubles',
    'integration-test databases',
    'snapshot testing',
    'causes of flaky tests',
    'what coverage metrics really mean',
    'property-based testing',
    'contract testing for APIs',
    'page objects for end-to-end tests',
    'red-green-refactor discipline',
    'automated accessibility checks',
    'load-testing basics',
    'mutation testing',
    'stubbing network calls',
    'behaviour-driven scenarios',
  ],
  docker: [
    'image layer caching',
    'multi-stage builds',
    'Compose networking',
    'volumes and bind mounts',
    'health checks',
    'resource limits',
    '.dockerignore and build context',
    'registry authentication and tagging',
    'distroless base images',
    'debugging container crashes',
    'instruction ordering in Dockerfiles',
    'multi-platform builds with buildx',
  ],
  python: [
    'list comprehensions',
    'generators and yield',
    'decorators with functools',
    'context managers',
    'virtual environments',
    'type hints with mypy',
    'dataclasses',
    'asyncio concurrency',
    'comprehension performance',
    'exception hierarchies',
    'packaging with pyproject.toml',
    'profiling with cProfile',
    'dunder method protocols',
    'structural pattern matching',
    'slots and attribute layout',
  ],
  pandas: [
    'Series versus DataFrame indexing',
    'groupby split-apply-combine',
    'merge and join semantics',
    'filling and dropping missing data',
    'vectorization versus apply',
    'categorical dtypes',
    'time-series resampling',
    'method chaining with pipes',
    'reading large files in chunks',
    'pivot and melt reshaping',
    'duplicate-key handling',
    'string methods with the str accessor',
  ],
  caching: [
    'cache-aside and write-through policies',
    'TTL and eviction rules',
    'HTTP caching headers',
    'CDN invalidation',
    'memoization patterns',
    'Redis data structures',
    'cache stampede and thundering herds',
    'cache key design',
    'stale-while-revalidate',
    'negative caching',
  ],
  webpack: [
    'entry and output configuration',
    'code-splitting strategies',
    'tree-shaking mechanics',
    'loaders versus plugins',
    'dev server and hot module replacement',
    'externals',
    'source maps',
    'asset modules',
    'environment injection with DefinePlugin',
    'module federation',
  ],
  statistics: [
    'descriptive versus inferential statistics',
    'common probability distributions',
    'confidence intervals',
    'the steps of hypothesis testing',
    'sizing an A/B test',
    'correlation versus causation',
    "Bayes' theorem intuition",
    'sampling bias',
    'p-value misuse',
    'bootstrap resampling',
  ],
  'ml basics': [
    'train-validation-test splits',
    'overfitting and regularization',
    'feature scaling',
    'classification metrics',
    'cross-validation folds',
    'gradient descent variants',
    'reading a confusion matrix',
    'baseline models',
    'leakage in datasets',
    'class imbalance and resampling',
  ],
  'data viz': [
    'chart-selection heuristics',
    'color scales and visual perception',
    'axis and label design',
    'tooltips and drill-down',
    'dashboards versus reports',
    'avoiding misleading charts',
    'storytelling with annotations',
    'sparklines and micro-charts',
  ],
  etl: [
    'batch versus streaming ingestion',
    'watermarks and incremental loads',
    'schema evolution',
    'data-quality checks',
    'idempotent pipeline runs',
    'warehouse modelling basics',
    'backfill strategies',
    'late-arriving facts',
  ],
  'ci/cd': [
    'pipeline stage design',
    'branch-protection rules',
    'semantic versioning releases',
    'blue-green and canary deploys',
    'secrets management in CI',
    'artifact caching in pipelines',
    'roll-back runbooks',
    'trunk-based development',
  ],
}

/**
 * Sentence templates applied to every topic. Wording is verb-agreement safe
 * (imperative / "about X" / "of X" forms) so any noun phrase fits. Eight
 * templates per topic cover all three types across Easy / Medium / Hard.
 */
const EXPANSION_TEMPLATES: {
  type: QuestionType
  difficulty: Difficulty
  text: (topic: string) => string
  starterCode?: (topic: string) => string
}[] = [
  {
    type: 'conceptual',
    difficulty: 'Easy',
    text: (t) => `Explain ${t} in your own words — what it is and why it matters.`,
  },
  {
    type: 'conceptual',
    difficulty: 'Medium',
    text: (t) =>
      `What should a strong candidate know about ${t}? Include one real-world example.`,
  },
  {
    type: 'conceptual',
    difficulty: 'Hard',
    text: (t) =>
      `What are the common pitfalls and misconceptions around ${t}? How do experienced engineers avoid them?`,
  },
  {
    type: 'oral',
    difficulty: 'Easy',
    text: (t) => `How would you briefly introduce ${t} to a new teammate on day one?`,
  },
  {
    type: 'oral',
    difficulty: 'Medium',
    text: (t) =>
      `Walk me through ${t} in a production codebase. What trade-offs and failure modes would you watch for?`,
  },
  {
    type: 'oral',
    difficulty: 'Hard',
    text: (t) =>
      `Make the technical case for adopting ${t} on a team that is sceptical — cover costs, risks, and rollout.`,
  },
  {
    type: 'coding',
    difficulty: 'Medium',
    text: (t) => `Write a compact, runnable example that demonstrates ${t}. Comment the key lines.`,
    starterCode: (t) => `// Demonstrate: ${t}\n`,
  },
  {
    type: 'coding',
    difficulty: 'Hard',
    text: (t) =>
      `Implement a small utility that puts ${t} into practice with sensible edge-case handling. Explain your design choices in comments.`,
    starterCode: (t) => `// ${t}\n`,
  },
]

/**
 * Merge curated + expanded entries per skill. Curated entries come first
 * (stable sort in the mock provider keeps them preferred) and a global
 * text set guarantees every question in the bank is unique.
 */
function buildQuestionBank(): Record<string, BankEntry[]> {
  const used = new Set<string>()
  const out: Record<string, BankEntry[]> = {}

  for (const [key, curated] of Object.entries(CURATED_BANK)) {
    out[key] = []
    for (const entry of curated) {
      if (used.has(entry.text)) continue
      used.add(entry.text)
      out[key].push(entry)
    }
  }

  for (const [key, topics] of Object.entries(SKILL_TOPICS)) {
    const list = out[key] ?? (out[key] = [])
    for (const topic of topics) {
      for (const tpl of EXPANSION_TEMPLATES) {
        const text = tpl.text(topic)
        if (used.has(text)) continue
        used.add(text)
        const entry: BankEntry = {
          text,
          topic,
          type: tpl.type,
          difficulty: tpl.difficulty,
        }
        if (tpl.starterCode) entry.starterCode = tpl.starterCode(topic)
        list.push(entry)
      }
    }
  }

  return out
}

/** The full question bank: curated questions first, then expanded ones. */
export const QUESTION_BANK: Record<string, BankEntry[]> = buildQuestionBank()

/** Total number of unique questions across every skill. */
export const BANK_SIZE = Object.values(QUESTION_BANK).reduce(
  (n, list) => n + list.length,
  0
)

/** Generic questions used when no skill-specific questions are available. */
export const FALLBACK_QUESTIONS: BankEntry[] = [
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
    text: "Walk me through how you would debug a production issue that you've never seen before.",
    topic: 'Debugging',
    type: 'oral',
    difficulty: 'Hard',
  },
  {
    text: 'Describe your approach to estimating effort for a piece of work you have never done before.',
    topic: 'Estimation',
    type: 'oral',
    difficulty: 'Medium',
  },
  {
    text: 'How would you handle a situation where you disagree with a technical decision made by the team lead?',
    topic: 'Collaboration',
    type: 'oral',
    difficulty: 'Medium',
  },
]

/**
 * Keyword → bank-key detection table.
 *
 * Lets the mock provider find relevant skills by scanning the raw CV text,
 * so generated questions reflect what the candidate actually mentions.
 * Keys are matched case-insensitively as substrings of the CV.
 */
export const SKILL_DETECTORS: { key: string; patterns: string[] }[] = [
  { key: 'react', patterns: ['react', 'jsx', 'next.js', 'nextjs', 'redux'] },
  { key: 'typescript', patterns: ['typescript', ' ts ', ' ts,', ' ts.'] },
  {
    key: 'javascript',
    patterns: ['javascript', ' es6', 'es2015', ' node', 'js dev'],
  },
  { key: 'css', patterns: ['css', 'tailwind', 'sass', 'scss', 'less', 'flexbox'] },
  { key: 'html', patterns: ['html', 'semantic markup'] },
  {
    key: 'accessibility',
    patterns: ['accessibility', 'a11y', 'wcag', 'aria', 'screen reader'],
  },
  {
    key: 'node.js',
    patterns: ['node.js', 'nodejs', ' node ', 'express', 'nest.js', 'nestjs'],
  },
  {
    key: 'rest apis',
    patterns: ['rest', 'restful', 'api design', 'graphql', 'http api'],
  },
  {
    key: 'sql',
    patterns: ['sql', 'postgres', 'mysql', 'sqlite', 'database', 'mongodb', 'nosql'],
  },
  { key: 'auth', patterns: ['auth', 'jwt', 'oauth', 'security', 'sso'] },
  {
    key: 'testing',
    patterns: ['testing', 'jest', 'vitest', 'cypress', 'playwright', 'tdd', 'unit test'],
  },
  { key: 'docker', patterns: ['docker', 'kubernetes', 'k8s', 'container', 'compose'] },
  { key: 'python', patterns: ['python', 'django', 'flask'] },
  { key: 'pandas', patterns: ['pandas', 'dataframe'] },
  {
    key: 'caching',
    patterns: ['caching', 'cache', 'redis', 'memcached', 'cdn'],
  },
  { key: 'webpack', patterns: ['webpack', 'vite', 'rollup', 'bundler', 'esbuild'] },
  { key: 'statistics', patterns: ['statistics', 'statistical', 'hypothesis test'] },
  {
    key: 'ml basics',
    patterns: ['machine learning', 'ml model', 'classification', 'regression', 'neural'],
  },
  { key: 'data viz', patterns: ['data viz', 'visualization', 'd3', 'chart', 'dashboard'] },
  { key: 'etl', patterns: ['etl', 'data pipeline', 'airflow', 'data warehouse'] },
  { key: 'ci/cd', patterns: ['ci/cd', 'continuous integration', 'jenkins', 'github actions', 'gitlab ci'] },
]

/** All skills the bank knows about (useful for defaults when CV is empty). */
export const ALL_BANK_KEYS = Object.keys(QUESTION_BANK)

/**
 * Which bank skills belong to each candidate role.
 *
 * A Frontend interview must only draw from Frontend skills (and likewise for
 * Backend / Data), so questions and "detected skills" never drift into areas
 * outside the candidate's chosen job. Full Stack is the union of both tracks.
 */
const FRONTEND_KEYS = [
  'react',
  'typescript',
  'javascript',
  'css',
  'html',
  'accessibility',
  'webpack',
  'testing',
]
const BACKEND_KEYS = [
  'node.js',
  'typescript',
  'javascript',
  'rest apis',
  'sql',
  'auth',
  'caching',
  'docker',
  'testing',
  'ci/cd',
]

export const ROLE_DOMAINS: Record<string, string[]> = {
  Frontend: FRONTEND_KEYS,
  Backend: BACKEND_KEYS,
  Data: ['python', 'sql', 'pandas', 'statistics', 'ml basics', 'data viz', 'etl'],
  'Full Stack': [...new Set([...FRONTEND_KEYS, ...BACKEND_KEYS])],
}

/**
 * Bank keys the given role may draw from. Unknown roles fall back to every
 * bank key (no filtering) so custom/free-text roles keep working.
 */
export function domainForRole(role: string): string[] {
  return ROLE_DOMAINS[role.trim()] ?? ALL_BANK_KEYS
}
