// ---------------------------------------------------------------------------
// Agent personas — shared with the frontend data layer
// ---------------------------------------------------------------------------

export const LIFECYCLE_STAGES = [
  { id: 'discovery', label: 'Discovery', color: '#6366f1' },
  { id: 'design', label: 'Design', color: '#8b5cf6' },
  { id: 'development', label: 'Development', color: '#3d6cec' },
  { id: 'qa', label: 'QA & Security', color: '#f59e0b' },
  { id: 'deployment', label: 'Deployment', color: '#10b981' },
  { id: 'operations', label: 'Operations', color: '#ef4444' },
]

export const AGENT_DEFS = [
  { name: 'Product Scout', role: 'Product Manager', stage: 'discovery', description: 'Scans market signals, user feedback and competitor moves to surface product opportunities.', tags: ['market-research', 'roadmap', 'prioritization'], price: 0.42 },
  { name: 'Requirement Miner', role: 'Business Analyst', stage: 'discovery', description: 'Extracts structured requirements from stakeholder conversations and raw briefs.', tags: ['requirements', 'spec-writing', 'stakeholder'], price: 0.38 },
  { name: 'UX Researcher', role: 'UX Researcher', stage: 'discovery', description: 'Designs and runs user studies, synthesizes interviews into actionable insights.', tags: ['user-research', 'interviews', 'insights'], price: 0.55 },
  { name: 'Wireframe Artist', role: 'Product Designer', stage: 'design', description: 'Produces low-fidelity wireframes and user flows from validated requirements.', tags: ['wireframes', 'user-flows', 'prototyping'], price: 0.61 },
  { name: 'UI Systems Builder', role: 'UI Designer', stage: 'design', description: 'Maintains the design system, tokens and component specs across the product.', tags: ['design-system', 'tokens', 'components'], price: 0.74 },
  { name: 'Design Critic', role: 'Design Reviewer', stage: 'design', description: 'Peer-audits design output for consistency, accessibility and brand compliance.', tags: ['audit', 'a11y', 'brand'], price: 0.29 },
  { name: 'Frontend Engineer', role: 'Frontend Dev', stage: 'development', description: 'Implements UI features with typed components, tests and performance budgets.', tags: ['react', 'typescript', 'css'], price: 1.2 },
  { name: 'Backend Engineer', role: 'Backend Dev', stage: 'development', description: 'Builds APIs, data models and business logic with contract-first design.', tags: ['api', 'databases', 'services'], price: 1.35 },
  { name: 'API Integration Specialist', role: 'Integration Dev', stage: 'development', description: 'Wires third-party services and internal systems into reliable integrations.', tags: ['integrations', 'webhooks', 'oauth'], price: 0.98 },
  { name: 'Code Reviewer', role: 'Engineering Reviewer', stage: 'development', description: 'Peer-reviews pull requests for correctness, security and maintainability.', tags: ['code-review', 'security', 'best-practices'], price: 0.45 },
  { name: 'QA Tester', role: 'QA Engineer', stage: 'qa', description: 'Designs test plans, runs regression suites and files reproducible bug reports.', tags: ['test-plans', 'regression', 'bug-reports'], price: 0.52 },
  { name: 'Security Auditor', role: 'Security Engineer', stage: 'qa', description: 'Scans for vulnerabilities, reviews threat models and enforces policy gates.', tags: ['pentest', 'threat-model', 'compliance'], price: 0.88 },
  { name: 'Performance Optimizer', role: 'Performance Engineer', stage: 'qa', description: 'Profiles bottlenecks and applies targeted optimizations to latency and memory.', tags: ['profiling', 'latency', 'optimization'], price: 0.79 },
  { name: 'Release Orchestrator', role: 'DevOps Engineer', stage: 'deployment', description: 'Coordinates build, staging and production rollouts with rollback safety.', tags: ['ci-cd', 'rollouts', 'rollback'], price: 0.66 },
  { name: 'Infra Provisioner', role: 'Platform Engineer', stage: 'deployment', description: 'Provisions and tunes cloud infrastructure, autoscaling and cost controls.', tags: ['terraform', 'kubernetes', 'cloud'], price: 0.93 },
  { name: 'Docs Scribe', role: 'Technical Writer', stage: 'operations', description: 'Keeps API docs, runbooks and changelogs accurate and searchable.', tags: ['documentation', 'runbooks', 'changelog'], price: 0.31 },
  { name: 'Support Triage', role: 'Support Engineer', stage: 'operations', description: 'Classifies incoming issues, drafts responses and escalates with context.', tags: ['triage', 'support', 'escalation'], price: 0.27 },
  { name: 'Analytics Reporter', role: 'Data Analyst', stage: 'operations', description: 'Turns product telemetry into dashboards, funnels and decision-ready reports.', tags: ['analytics', 'dashboards', 'funnels'], price: 0.58 },
]

export const AGENTS = AGENT_DEFS.map((def, i) => ({
  id: `ag-${String(i + 1).padStart(3, '0')}`,
  ...def,
  stage: LIFECYCLE_STAGES.find((s) => s.id === def.stage),
  pricePerTask: def.price,
}))

export const getAgent = (id) => AGENTS.find((a) => a.id === id)