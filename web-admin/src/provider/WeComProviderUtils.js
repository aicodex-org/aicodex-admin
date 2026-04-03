import i18next from "i18next";

export function getWeComRequiredFields(provider) {
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

export function validateWeComProviderFields(provider, translate = i18next.t.bind(i18next)) {
  if (provider.type !== "WeCom") {
    return "";
  }

  if (!provider.subType) {
    return translate("provider:Please select WeCom sub type first");
  }

  if (!provider.method) {
    return translate("provider:Please select WeCom login method first");
  }

  const fieldLabels = {
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
