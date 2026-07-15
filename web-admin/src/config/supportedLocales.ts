/** Vite 构建可静态分析的应用语言全集。 */
export const supportedLanguages = [
  "de", "en", "es", "fr", "ja", "pl", "pt", "tr", "uk", "vi", "zh",
] as const;

export type SupportedLanguage = typeof supportedLanguages[number];
type AppLocaleResources = Record<string, unknown>;
type AppLocaleModule = {default: AppLocaleResources};
type AppLocaleLoader = () => Promise<AppLocaleModule>;

const appLocaleLoaders: Record<SupportedLanguage, AppLocaleLoader> = {
  de: () => import("../locales/de/data.json"),
  en: () => import("../locales/en/data.json"),
  es: () => import("../locales/es/data.json"),
  fr: () => import("../locales/fr/data.json"),
  ja: () => import("../locales/ja/data.json"),
  pl: () => import("../locales/pl/data.json"),
  pt: () => import("../locales/pt/data.json"),
  tr: () => import("../locales/tr/data.json"),
  uk: () => import("../locales/uk/data.json"),
  vi: () => import("../locales/vi/data.json"),
  zh: () => import("../locales/zh/data.json"),
};

/** 将语言或 region tag 收敛到支持语言，未知值回退英文。 */
export function normalizeSupportedLanguage(language?: string): SupportedLanguage {
  const baseLanguage = `${language ?? ""}`.trim().toLowerCase().split(/[-_]/, 1)[0];
  return supportedLanguages.includes(baseLanguage as SupportedLanguage)
    ? baseLanguage as SupportedLanguage
    : "en";
}

/** 通过显式 loader 按需加载指定语言 namespace。 */
export async function loadAppLocaleNamespace(language: string, namespace: string): Promise<unknown> {
  const localeModule = await appLocaleLoaders[normalizeSupportedLanguage(language)]();
  return localeModule.default[namespace];
}
