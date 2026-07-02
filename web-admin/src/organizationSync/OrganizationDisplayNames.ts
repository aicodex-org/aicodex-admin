// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

export interface OrganizationDisplayNameRecord {
  name?: string;
  value?: string;
  displayName?: string;
  label?: unknown;
}

export type OrganizationDisplayNameMap = Record<string, string>;

function normalizeText(value?: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return `${value}`.trim();
  }
  return "";
}

export function buildOrganizationDisplayNameMap(organizations: OrganizationDisplayNameRecord[] = []): OrganizationDisplayNameMap {
  const displayNames: OrganizationDisplayNameMap = {};
  organizations.forEach(organization => {
    const name = normalizeText(organization.name || organization.value);
    if (!name) {
      return;
    }
    const displayName = normalizeText(organization.displayName || organization.label || name);
    displayNames[name] = displayName || name;
  });
  return displayNames;
}

export function areOrganizationDisplayNameMapsEqual(left: OrganizationDisplayNameMap = {}, right: OrganizationDisplayNameMap = {}): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every(key => left[key] === right[key]);
}

export function resolveOrganizationDisplayName(displayNames: OrganizationDisplayNameMap = {}, organization?: string): string {
  const name = normalizeText(organization);
  if (!name) {
    return "-";
  }
  return displayNames[name] || name;
}
