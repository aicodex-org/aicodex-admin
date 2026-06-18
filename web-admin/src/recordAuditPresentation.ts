type AuditRecordLike = Record<string, unknown>;

const sensitiveKeyPattern = /(password|secret|token|authorization|cookie|credential|clientSecret|accessToken|refreshToken|idToken|session|payload|trace|raw|reason|headers?)/i;
const sensitivePairPattern = /\b(access[_-]?token|accessToken|refresh[_-]?token|refreshToken|id[_-]?token|idToken|client[_-]?secret|clientSecret|password|secret|authorization|cookie|session|reason)(\s*[:=]\s*)([^&\s,;]+)/gi;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const bearerPattern = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const phonePattern = /\b1[3-9]\d{9}\b/g;
const longIdentifierPattern = /\b[A-Za-z0-9_-]{24,}\b/g;

function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function redactText(value: unknown): string {
  return toText(value)
    .replace(sensitivePairPattern, (_match, key, separator) => `${key}${separator}***`)
    .replace(emailPattern, "***@***")
    .replace(phonePattern, "***")
    .replace(bearerPattern, "$1 ***")
    .replace(longIdentifierPattern, match => match.length > 40 ? `${match.slice(0, 8)}***${match.slice(-6)}` : match);
}

function tryParseJson(value: string): unknown {
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => redactObject(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as AuditRecordLike).map(([key, fieldValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? "***" : redactObject(fieldValue),
    ]));
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  return value;
}

function compactText(value: string, maxLength = 72): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}...`;
}

function getStatusCode(record: AuditRecordLike): number {
  const value = Number(record.statusCode);
  return Number.isFinite(value) ? value : 0;
}

function getEventType(action: string): string {
  const normalized = action.toLowerCase();
  if (["login", "logout", "signup"].includes(normalized)) {
    return "Identity session event";
  }
  if (normalized.includes("user")) {
    return "Account lifecycle event";
  }
  if (normalized.includes("application") || normalized.includes("provider") || normalized.includes("organization")) {
    return "Configuration change event";
  }
  if (normalized.includes("delete") || normalized.includes("remove")) {
    return "Destructive operation event";
  }
  return "Audit event";
}

function summarizeObject(value: unknown): string {
  const text = toText(value).trim();
  if (!text) {
    return "-";
  }

  const parsed = tryParseJson(text);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const object = parsed as AuditRecordLike;
    const type = toText(object.type || object.category || object.objectType || object.owner || "Object");
    const name = toText(object.displayName || object.name || object.id || object.key);
    return compactText(redactText([type, name].filter(Boolean).join(" / ")) || "Object detail available");
  }

  if (text.startsWith("{") || text.startsWith("[") || text.includes("trace") || text.includes("payload")) {
    return "Object detail available";
  }
  return compactText(redactText(text));
}

export function sanitizeAuditDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== null) {
      return JSON.stringify(redactObject(parsed), null, 2);
    }
    return redactText(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(redactObject(value), null, 2);
  }
  return redactText(value);
}

export function buildAuditRecordPresentation(record: AuditRecordLike = {}) {
  const statusCode = getStatusCode(record);
  const action = toText(record.action);
  const hasDetail = Boolean(record.object || record.response || record.requestUri || record.clientIp);
  const result = statusCode >= 500
    ? "Failed"
    : statusCode >= 400
      ? "Needs review"
      : "Succeeded";
  const riskLevel = statusCode >= 500
    ? "High"
    : statusCode >= 400 || /delete|remove/i.test(action)
      ? "Medium"
      : "Low";

  return {
    eventType: getEventType(action),
    objectSummary: summarizeObject(record.object),
    result,
    riskLevel,
    evidenceStatus: hasDetail ? "Evidence available" : "No evidence detail",
    operator: compactText(redactText(toText(record.user) || toText(record.name) || "System")),
    occurredAt: toText(record.createdTime),
  };
}
