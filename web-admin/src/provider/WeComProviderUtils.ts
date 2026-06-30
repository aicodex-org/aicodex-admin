import i18next from "i18next";

// eslint-disable-next-line unused-imports/no-unused-imports
import type {ProviderConfig} from "./ProviderFieldTypes";

type Translate = (key: string) => string;
type WeComRequiredField = "clientId" | "clientSecret" | "appId" | "scopes";

export function getWeComRequiredFields(provider: ProviderConfig): WeComRequiredField[] {
  if (provider.subType === "Internal" && provider.method === "Normal") {
    return ["clientId", "clientSecret", "appId"];
  }

  if (provider.subType === "Internal" && provider.method === "Silent") {
    return ["clientId", "clientSecret", "scopes"];
  }

  if (provider.subType === "Third-party" && provider.method === "Normal") {
    return ["clientId", "clientSecret"];
  }

  if (provider.subType === "Third-party" && provider.method === "Silent") {
    return ["clientId", "clientSecret", "scopes"];
  }

  return [];
}

export function validateWeComProviderFields(provider: ProviderConfig, translate: Translate = i18next.t.bind(i18next)): string {
  if (provider.type !== "WeCom") {
    return "";
  }

  if (!provider.subType) {
    return translate("provider:Please select WeCom sub type first");
  }

  if (!provider.method) {
    return translate("provider:Please select WeCom login method first");
  }

  const fieldLabels: Record<WeComRequiredField, string> = {
    clientId: provider.subType === "Internal" ? "Corp ID" : "Provider App ID",
    clientSecret: provider.subType === "Internal" ? "Secret" : "Provider Secret",
    appId: "Agent ID",
    scopes: "Scope",
  };

  const missingField = getWeComRequiredFields(provider).find(field => !provider[field]?.trim());
  if (missingField) {
    return `${fieldLabels[missingField]} ${translate("provider:This field is required")}`;
  }

  return "";
}
