export type AuthProviderCategory = "OAuth" | "SAML" | "Web3" | string;

export interface AuthProvider {
  owner?: string;
  name?: string;
  category?: AuthProviderCategory;
  type: string;
  subType?: string;
  method?: string;
  displayName?: string;
  clientId?: string;
  clientId2?: string;
  clientSecret?: string;
  clientSecret2?: string;
  appId?: string;
  domain?: string;
  scopes?: string;
  customAuthUrl?: string;
  disableSsl?: boolean;
  signName?: string;
  enablePkce?: boolean;
  [key: string]: unknown;
}

export interface ApplicationProviderItem {
  name?: string;
  provider?: AuthProvider;
  [key: string]: unknown;
}

export interface AuthApplication {
  name?: string;
  owner?: string;
  organization?: string;
  logo?: string;
  displayName?: string;
  homepageUrl?: string;
  forcedRedirectOrigin?: string;
  providers?: ApplicationProviderItem[];
  customScopes?: ConsentScope[];
  [key: string]: unknown;
}

export interface ConsentScope {
  scope: string;
  displayName?: string;
  description?: string;
  [key: string]: unknown;
}

export interface OAuthParams {
  clientId?: string;
  redirectUri?: string;
  responseType?: string;
  responseMode?: string;
  scope?: string;
  state?: string;
  nonce?: string;
  codeChallenge?: string;
  challengeMethod?: string;
  resource?: string;
  samlRequest?: string;
  relayState?: string;
  noRedirect?: string;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  status: string;
  msg?: string;
  data?: T;
  data2?: unknown;
  data3?: unknown;
}

export interface RouteMatch<Params extends Record<string, string | undefined> = Record<string, string | undefined>> {
  params: Params;
}

export interface HistoryLike {
  push(path: string): void;
}

export interface LocationLike<State = unknown> {
  search: string;
  state?: State;
}
