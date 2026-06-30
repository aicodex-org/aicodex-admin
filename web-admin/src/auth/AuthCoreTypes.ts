// Auth core 仍承载大量历史动态 payload；迁移阶段把宽松边界限制在 auth 目录内。
export type LegacyAny = any;

export type LegacyRecord = Record<string, LegacyAny>;

export interface AuthConfig {
  serverUrl?: string;
  appName?: string;
  [key: string]: LegacyAny;
}

export type AuthApiResponse<T = LegacyAny> = {
  status: string;
  msg?: string;
  data?: T;
  data2?: LegacyAny;
  data3?: LegacyAny;
  [key: string]: LegacyAny;
};

export type AuthRouteProps = {
  location: {
    search: string;
    state?: LegacyAny;
  };
  history: LegacyAny;
  match: {
    path?: string;
    params: LegacyRecord;
  };
};

export type AuthPageProps = Partial<AuthRouteProps> & {
  account?: LegacyAny;
  application?: LegacyAny;
  applicationName?: string | null;
  mode?: string | null;
  owner?: string | null;
  preview?: string;
  requiredEnableMfa?: boolean;
  themeAlgorithm?: LegacyAny;
  type?: string;
  userCode?: string | null;
  onLoginSuccess?: (url?: string) => void;
  onUpdateAccount?: (account: LegacyAny) => void;
  onUpdateApplication?: (application: LegacyAny) => void;
};
