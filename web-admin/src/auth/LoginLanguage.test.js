/* eslint-env jest */

import {getSigninLanguageOverride} from "./LoginLanguage";

describe("getSigninLanguageOverride", () => {
  test("does not force English when organization languages are empty", () => {
    expect(getSigninLanguageOverride([])).toBe("");
  });

  test("uses the only configured organization language", () => {
    expect(getSigninLanguageOverride(["zh"])).toBe("zh");
  });

  test("keeps user/default language when multiple choices are available", () => {
    expect(getSigninLanguageOverride(["zh", "en"])).toBe("");
  });
});
