export type EventKind = "Wedding" | "Birthday" | "Community event";
export interface Event {
  name: string;
  kind: EventKind;
  date: string;
  city: string;
  location: string;
  budget: number;
  currency: "INR" | "USD" | "EUR" | "GBP";
  guests: number;
  duration: number;
  theme: string;
  preferences: string;
  must_have: string;
  optional: string;
  priorities: string[];
  illustrative: boolean;
}
export interface BudgetRow {
  category: string;
  allocated: number;
  planned: number;
  actual: number;
}
export interface Task {
  id: string;
  title: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
  depends_on: string[];
  notes: string;
}
export interface Vendor {
  category: string;
  estimated: number;
  status: "Research" | "Contacted" | "Shortlisted" | "Booked";
  priority: "High" | "Medium" | "Low";
  notes: string;
  contact: string;
}
export interface Suggestions {
  overview: string;
  themes: string[];
  activities: string[];
  food: string[];
  logistics: string[];
  risks: string[];
  next_actions: string[];
  ideas: string[];
}
export interface Plan {
  id: string;
  revision: number;
  event: Event;
  budget: BudgetRow[];
  tasks: Task[];
  vendors: Vendor[];
  suggestions: Suggestions;
  source: string;
}
export interface Health {
  total: number;
  planned: number;
  actual: number;
  remaining: number;
  per_guest: number;
  completed: number;
  task_count: number;
  progress: number;
  days_left: number;
  score: number;
  breakdown: { label: string; earned: number; possible: number }[];
  warnings: string[];
  today: string;
}
export interface Proposal {
  token: string;
  plan: Plan;
  explanation: string;
}

export type SaveFunction = (
  path: string,
  body: unknown,
  method?: string,
) => Promise<Plan>;

export type Workflow = "planning" | "ideas" | "copilot" | "rescue" | "critic";
export interface AIStatus {
  enabled: boolean;
  configured: boolean;
  ready: boolean;
  remaining: number;
  daily_limit: number;
  message: string;
}
export interface AIReview {
  summary: string;
  findings: string[];
  next_actions: string[];
  revision: number;
  subjective: boolean;
}
export interface AIResult {
  mode: "live";
  workflow: Workflow;
  answer: string;
  suggestions: Suggestions;
  proposal: Proposal | null;
  review: AIReview | null;
}
