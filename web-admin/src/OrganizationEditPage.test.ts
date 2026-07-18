import {describe, expect, test} from "vitest";
import {
  getOrganizationNameTooltipKey,
  isOrganizationNameLocked
} from "./OrganizationEditPageUtils";

describe("OrganizationEditPage", () => {
  test("locks organization name editing when backend marks sync-managed organization", () => {
    expect(isOrganizationNameLocked({name: "feishu-cli-a", nameLocked: true})).toBe(true);
    expect(getOrganizationNameTooltipKey({name: "feishu-cli-a", nameLocked: true})).toBe("organization:Organization name locked - Tooltip");
  });

  test("keeps built-in and new organization name editable rules unchanged", () => {
    expect(isOrganizationNameLocked({name: "built-in", nameLocked: true})).toBe(false);
    expect(isOrganizationNameLocked({name: "new-org", nameLocked: true}, "add")).toBe(false);
    expect(isOrganizationNameLocked({name: "regular-org", nameLocked: false})).toBe(false);
    expect(getOrganizationNameTooltipKey({name: "regular-org", nameLocked: false})).toBe("organization:Organization name - Tooltip");
  });
});
