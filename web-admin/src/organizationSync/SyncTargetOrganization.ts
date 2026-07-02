// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import moment from "moment";
import i18next from "i18next";
import * as Conf from "../Conf";
import * as Setting from "../Setting";
import * as OrganizationBackend from "../backend/OrganizationBackend";

export type SyncTargetOrganizationHistory = {
  push?: (location: string | {pathname: string; mode?: string}) => void;
};

function getCountryKeys(): string[] {
  return (Setting.Countries as Array<{key: string}>).map(item => item.key);
}

export function createDefaultOrganization(): OrganizationBackend.OrganizationRecord {
  const randomName = Setting.getRandomName();
  const DefaultMfaRememberInHours = 12;
  return {
    owner: "admin",
    name: `organization_${randomName}`,
    createdTime: moment().format(),
    displayName: `New Organization - ${randomName}`,
    websiteUrl: "https://git.leagsoft.com/aicodex/aicodex-admin",
    favicon: Conf.BrandFavicon,
    passwordType: "bcrypt",
    PasswordSalt: "",
    passwordOptions: ["AtLeast6"],
    passwordObfuscatorType: "Plain",
    passwordObfuscatorKey: "",
    passwordExpireDays: 0,
    countryCodes: ["US"],
    defaultAvatar: Conf.BrandIcon,
    defaultApplication: "",
    tags: [],
    languages: getCountryKeys(),
    masterPassword: "",
    defaultPassword: "",
    enableSoftDeletion: false,
    isProfilePublic: true,
    enableTour: true,
    disableSignin: false,
    mfaRememberInHours: DefaultMfaRememberInHours,
    balanceCurrency: "USD",
    accountItems: [
      {name: "Organization", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "ID", visible: true, viewRule: "Public", modifyRule: "Immutable"},
      {name: "Name", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Display name", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "First name", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Last name", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Avatar", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "User type", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Password", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Email", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Phone", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Country code", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Country/Region", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Location", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Address", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Addresses", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Affiliation", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Title", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "ID card type", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "ID card", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "ID card info", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Real name", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "ID verification", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Homepage", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Bio", visible: true, viewRule: "Public", modifyRule: "Self"},
      {name: "Tag", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Language", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Gender", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Birthday", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Education", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Score", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Karma", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Ranking", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Balance", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Balance credit", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Balance currency", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Cart", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Transactions", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Signup application", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Register type", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Register source", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Groups", visible: true, viewRule: "Public", modifyRule: "Admin"},
      {name: "Roles", visible: true, viewRule: "Public", modifyRule: "Immutable"},
      {name: "Permissions", visible: true, viewRule: "Public", modifyRule: "Immutable"},
      {name: "Consents", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "3rd-party logins", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Properties", visible: false, viewRule: "Admin", modifyRule: "Admin"},
      {name: "Is online", visible: true, viewRule: "Admin", modifyRule: "Admin"},
      {name: "Is admin", visible: true, viewRule: "Admin", modifyRule: "Admin"},
      {name: "Is forbidden", visible: true, viewRule: "Admin", modifyRule: "Admin"},
      {name: "Is deleted", visible: true, viewRule: "Admin", modifyRule: "Admin"},
      {name: "Multi-factor authentication", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "MFA items", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "WebAuthn credentials", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Last change password time", visible: true, viewRule: "Admin", modifyRule: "Admin"},
      {name: "Managed accounts", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Face ID", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "MFA accounts", visible: true, viewRule: "Self", modifyRule: "Self"},
      {name: "Need update password", visible: true, viewRule: "Admin", modifyRule: "Admin"},
      {name: "IP whitelist", visible: true, viewRule: "Admin", modifyRule: "Admin"},
    ],
  };
}

export function openNewSyncTargetOrganization(history?: SyncTargetOrganizationHistory): Promise<OrganizationBackend.OrganizationRecord | null> {
  const newOrganization = createDefaultOrganization();
  return OrganizationBackend.addOrganization(newOrganization)
    .then(res => {
      if (res.status === "ok") {
        const location = {pathname: `/organizations/${newOrganization.name}`, mode: "add"};
        if (history?.push) {
          history.push(location);
        } else {
          window.location.href = location.pathname;
        }
        window.dispatchEvent(new Event("storageOrganizationsChanged"));
        return newOrganization;
      }
      Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
      return null;
    })
    .catch(error => {
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      return null;
    });
}
