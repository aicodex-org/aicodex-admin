import {describe, expect, test} from "vitest";
import {buildAuditRecordPresentation, sanitizeAuditDetailValue} from "./recordAuditPresentation";

describe("recordAuditPresentation", () => {
  test("summarizes raw audit records without exposing request payload fields", () => {
    const presentation = buildAuditRecordPresentation({
      action: "update-user",
      method: "POST",
      requestUri: "/api/update-user?accessToken=very-secret-token",
      clientIp: "10.1.2.3",
      statusCode: 500,
      user: "operator@example.test",
      object: "{\"type\":\"application\",\"name\":\"portal\",\"clientSecret\":\"super-secret\",\"trace\":\"raw-trace\"}",
      response: "{\"error\":\"failed\",\"token\":\"super-secret\",\"email\":\"alice@example.test\"}",
    });

    expect(presentation).toMatchObject({
      eventType: "Account lifecycle event",
      result: "Failed",
      riskLevel: "High",
      evidenceStatus: "Evidence available",
    });
    expect(presentation.objectSummary).toBe("application / portal");
    expect(JSON.stringify(presentation)).not.toContain("/api/update-user");
    expect(JSON.stringify(presentation)).not.toContain("10.1.2.3");
    expect(JSON.stringify(presentation)).not.toContain("super-secret");
    expect(JSON.stringify(presentation)).not.toContain("alice@example.test");
  });

  test("redacts sensitive JSON details before rendering folded raw evidence", () => {
    const redacted = sanitizeAuditDetailValue("{\"clientSecret\":\"super-secret\",\"token\":\"abc\",\"email\":\"alice@example.test\",\"phone\":\"13800138000\",\"trace\":\"raw-trace\",\"reason\":\"raw-reason\"}");

    expect(redacted).toContain("\"clientSecret\": \"***\"");
    expect(redacted).toContain("\"token\": \"***\"");
    expect(redacted).toContain("\"trace\": \"***\"");
    expect(redacted).toContain("\"reason\": \"***\"");
    expect(redacted).toContain("***@***");
    expect(redacted).not.toContain("super-secret");
    expect(redacted).not.toContain("alice@example.test");
    expect(redacted).not.toContain("13800138000");
    expect(redacted).not.toContain("raw-trace");
    expect(redacted).not.toContain("raw-reason");
  });

  test("redacts sensitive query string values in raw request details", () => {
    const redacted = sanitizeAuditDetailValue("/api/update-user?accessToken=very-secret-token&client_secret=abc123&reason=raw-reason");

    expect(redacted).toContain("accessToken=***");
    expect(redacted).toContain("client_secret=***");
    expect(redacted).toContain("reason=***");
    expect(redacted).not.toContain("very-secret-token");
    expect(redacted).not.toContain("abc123");
    expect(redacted).not.toContain("raw-reason");
  });
});
