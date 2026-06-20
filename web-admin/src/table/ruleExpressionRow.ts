// Rule expressions are persisted as open backend objects; tables edit the shared display fields.
export interface RuleExpressionRow {
  [key: string]: unknown;
  name?: string;
  operator?: string;
  value?: string;
}

// RuleEditPage forwards these legacy props; expression tables keep accepting them without reading them.
export interface RuleExpressionTablePassthroughProps {
  ruleName?: string;
  account?: Record<string, unknown>;
}

export type RuleExpressionField = "name" | "operator" | "value";

export function getRuleExpressionText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}
