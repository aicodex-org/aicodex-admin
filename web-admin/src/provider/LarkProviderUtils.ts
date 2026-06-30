import i18next from "i18next";

export interface LarkProviderEndpoint {
  endpointMode: "global-lark" | "domestic-feishu";
  authBaseUrl: string;
  authUrl: string;
  apiBaseUrl: string;
}

export interface LarkProviderBrand {
  brandKey: "lark" | "feishu";
  logoAssetKey: "lark-feishu-shared";
  defaultDisplayName: string;
  displayName: string;
  altText: string;
  socialLogoPath: string;
  buttonLogoPath: string;
}

export interface LarkProviderEndpointModeInfo {
  modeName: "Global Lark" | "Domestic Feishu";
  authDomain: string;
  apiDomain: string;
  credentialPlatform: "Lark open platform" | "Feishu open platform";
}

type Translate = (key: string) => string;
type LarkProviderField = "clientId" | "clientSecret";

interface LarkProviderLike {
  type?: string;
  disableSsl?: boolean;
  displayName?: string;
  clientId?: string;
  clientSecret?: string;
}

export function isLarkProvider(provider?: LarkProviderLike | null): boolean {
  return provider?.type === "Lark";
}

export function getLarkProviderEndpoint(provider?: LarkProviderLike | null): LarkProviderEndpoint {
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

export function getLarkProviderBrand(provider?: LarkProviderLike | null): LarkProviderBrand {
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

export function getLarkProviderEndpointModeInfo(provider?: LarkProviderLike | null): LarkProviderEndpointModeInfo {
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

export function getLarkProviderCallbackUrl(origin = window.location.origin): string {
  return `${origin.replace(/\/$/, "")}/callback`;
}

export function validateLarkProviderFields(provider: LarkProviderLike, translate: Translate = i18next.t.bind(i18next)): string {
  if (!isLarkProvider(provider)) {
    return "";
  }

  const fieldLabels: Record<LarkProviderField, string> = {
    clientId: "App ID",
    clientSecret: "App Secret",
  };

  const missingField = (["clientId", "clientSecret"] as LarkProviderField[]).find(field => !provider[field]?.trim());
  if (missingField) {
    return `${fieldLabels[missingField]} ${translate("provider:This field is required")}`;
  }

  return "";
}
