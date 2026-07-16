import type {ReactNode} from "react";
import type {EnterpriseTlsPolicy} from "../common/enterpriseTlsPolicy";

export type ProviderFieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | boolean[]
  | Record<string, unknown>
  | Record<string, unknown>[];

export interface ProviderConfig extends Record<string, ProviderFieldValue> {
  appId?: string;
  bucket?: string;
  category?: string;
  cert?: string;
  clientId?: string;
  clientId2?: string;
  clientSecret?: string;
  clientSecret2?: string;
  content?: string;
  customAuthUrl?: string;
  customLogo?: string;
  customTokenUrl?: string;
  customUserInfoUrl?: string;
  disableSsl?: boolean;
  displayName?: string;
  domain?: string;
  emailRegex?: string;
  enablePkce?: boolean;
  enableProxy?: boolean;
  enableSignAuthnRequest?: boolean;
  endpoint?: string;
  host?: string;
  httpHeaders?: Record<string, unknown>[];
  idP?: string;
  intranetEndpoint?: string;
  issuerUrl?: string;
  method?: string;
  metadata?: string;
  name?: string;
  owner?: string;
  pathPrefix?: string;
  port?: number;
  providerUrl?: string;
  receiver?: string;
  regionId?: string;
  scopes?: string;
  signName?: string;
  sslMode?: string;
  subType?: string;
  templateCode?: string;
  title?: string;
  tlsPolicy?: EnterpriseTlsPolicy;
  type: string;
  userMapping?: Record<string, string>;
}

export interface AccountConfig {
  email?: string;
  organization?: {
    countryCodes?: string[];
  };
  [key: string]: unknown;
}

export interface CertConfig {
  name: string;
  type?: string;
  [key: string]: unknown;
}

export type ProviderFieldName = string;
export type UpdateProviderField = (field: ProviderFieldName, value: ProviderFieldValue) => void;
export type RenderProviderNode = () => ReactNode;
