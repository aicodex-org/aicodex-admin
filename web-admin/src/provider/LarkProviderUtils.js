import i18next from "i18next";

export function isLarkProvider(provider) {
  return provider?.type === "Lark";
}

export function getLarkProviderEndpoint(provider) {
  if (provider?.disableSsl) {
    return {
      endpointMode: "global-lark",
      authBaseUrl: "https://accounts.larksuite.com",
      authUrl: "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
      apiBaseUrl: "https://open.larksuite.com",
    };
  }

  return {
    endpointMode: "domestic-feishu",
    authBaseUrl: "https://accounts.feishu.cn",
    authUrl: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
    apiBaseUrl: "https://open.feishu.cn",
  };
}

export function getLarkProviderBrand(provider) {
  const isGlobalLark = provider?.disableSsl === true;
  const defaultDisplayName = isGlobalLark ? "Lark" : "Feishu";
  const displayName = provider?.displayName?.trim() || defaultDisplayName;

  return {
    brandKey: isGlobalLark ? "lark" : "feishu",
    logoAssetKey: "lark-feishu-shared",
    defaultDisplayName: defaultDisplayName,
    displayName: displayName,
    altText: `Sign in with ${displayName}`,
    socialLogoPath: "/img/social_lark.png",
    buttonLogoPath: "/buttons/lark.svg",
  };
}

export function getLarkProviderEndpointModeInfo(provider) {
  if (provider?.disableSsl) {
    return {
      modeName: "Global Lark",
      authDomain: "accounts.larksuite.com",
      apiDomain: "open.larksuite.com",
      credentialPlatform: "Lark open platform",
    };
  }

  return {
    modeName: "Domestic Feishu",
    authDomain: "accounts.feishu.cn",
    apiDomain: "open.feishu.cn",
    credentialPlatform: "Feishu open platform",
  };
}

export function getLarkProviderCallbackUrl(origin = window.location.origin) {
  return `${origin.replace(/\/$/, "")}/callback`;
}

export function validateLarkProviderFields(provider, translate = i18next.t.bind(i18next)) {
  if (!isLarkProvider(provider)) {
    return "";
  }

  const fieldLabels = {
    clientId: "App ID",
    clientSecret: "App Secret",
  };

  const missingField = ["clientId", "clientSecret"].find(field => !provider[field]?.trim());
  if (missingField) {
    return `${fieldLabels[missingField]} ${translate("provider:This field is required")}`;
  }

  return "";
}
