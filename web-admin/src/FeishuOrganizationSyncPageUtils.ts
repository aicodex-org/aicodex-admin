export function getFeishuBusinessOrganizationNameFromTenantKey(tenantKey?: string | null): string {
  const sanitized = `${tenantKey || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");

  return sanitized ? `feishu-${sanitized}` : "";
}
