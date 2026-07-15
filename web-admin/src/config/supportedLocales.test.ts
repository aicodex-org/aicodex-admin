/* eslint-env jest */
import {expect} from "@jest/globals";
import {getCountryLocale} from "./countryLocales";
import {
  loadAppLocaleNamespace,
  normalizeSupportedLanguage,
  supportedLanguages
} from "./supportedLocales";

describe("supportedLocales", () => {
  test("keeps the application and country locale contract on the same 11 languages", () => {
    expect(supportedLanguages).toEqual([
      "de", "en", "es", "fr", "ja", "pl", "pt", "tr", "uk", "vi", "zh",
    ]);
  });

  test("normalizes region variants and falls back unknown languages to English", () => {
    expect(normalizeSupportedLanguage("zh-CN")).toBe("zh");
    expect(normalizeSupportedLanguage("pt_BR")).toBe("pt");
    expect(normalizeSupportedLanguage("EN-us")).toBe("en");
    expect(normalizeSupportedLanguage("unknown")).toBe("en");
    expect(normalizeSupportedLanguage(undefined)).toBe("en");
  });

  test("loads an application namespace through an explicit locale loader", async() => {
    for (const language of supportedLanguages) {
      const general = await loadAppLocaleNamespace(language, "general");

      expect(general).toBeDefined();
      expect(typeof general).toBe("object");
    }
  });

  test("resolves country data with the same normalization and fallback", () => {
    expect(getCountryLocale("zh-CN").locale).toBe("zh");
    expect(getCountryLocale("pt_BR").locale).toBe("pt");
    expect(getCountryLocale("unknown").locale).toBe("en");
  });
});
