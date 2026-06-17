type OrganizationNameLockState = {
  name?: string;
  nameLocked?: boolean;
};

export function isOrganizationNameLocked(organization?: OrganizationNameLockState | null, mode: string = "edit"): boolean {
  return mode !== "add" && organization?.name !== "built-in" && organization?.nameLocked === true;
}

export function getOrganizationNameTooltipKey(organization?: OrganizationNameLockState | null, mode: string = "edit"): string {
  return isOrganizationNameLocked(organization, mode) ? "organization:Organization name locked - Tooltip" : "organization:Organization name - Tooltip";
}
