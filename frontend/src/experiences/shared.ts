import type { Plan, Proposal, SaveFunction } from "../types";
export type BaseProps = { plan: Plan; busy: boolean; save: SaveFunction };
export type Preview = (proposal: Proposal) => void;
