export function getSigninLanguageOverride(languages: unknown): string {
  if (!Array.isArray(languages)) {
    return "";
  }

  const normalizedLanguages = languages
    .map(language => `${language ?? ""}`.trim())
    .filter(language => language !== "");

  // 只有组织明确配置唯一登录语言时才强制切换；空配置必须交回默认语言策略处理。
  return normalizedLanguages.length === 1 ? normalizedLanguages[0] : "";
}
