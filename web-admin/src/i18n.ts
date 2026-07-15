// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import i18n from "i18next";
import * as Conf from "./Conf";
import {initReactI18next} from "react-i18next";
import en from "./locales/en/data.json";
import type {LegacyAny} from "./types/legacyPage";
import {loadAppLocaleNamespace} from "./config/supportedLocales";

// Load backend-provided frontend config before language detection runs.
Conf.initConfigFromCookie();

type ResourceCallback = (error: unknown, data?: unknown) => void;
type ResourceLoader = ((language: string, namespace: string, callback?: ResourceCallback) => unknown) | Record<string, Record<string, unknown>>;

const resourcesToBackend = (res: ResourceLoader) => ({
  type: "backend" as const,
  init(_services: unknown, _backendOptions: unknown, _i18nextOptions: unknown) {/* use services and options */},
  read(language: string, namespace: string, callback: ResourceCallback) {
    if (typeof res === "function") {
      if (res.length < 3) {
        try {
          const r = res(language, namespace) as Promise<{default?: Record<string, unknown>}> | Record<string, unknown>;
          if (r && typeof (r as Promise<unknown>).then === "function") {
            (r as Promise<{default?: Record<string, unknown>}>).then((data) => callback(null, (data && data.default) || data)).catch(callback);
          } else {
            callback(null, r);
          }
        } catch (err) {
          callback(err);
        }
        return;
      }
      res(language, namespace, callback);
      return;
    }
    callback(null, res && res[language] && res[language][namespace]);
  },
});

function initLanguage() {
  let language = localStorage.getItem("language");
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlLanguage = params.get("language");
    if (urlLanguage) {
      language = urlLanguage;
    }
  }

  if (language === undefined || language === null || language === "") {
    language = Conf.DefaultLanguage || "zh";
  }

  return language;
}

i18n.use(resourcesToBackend(loadAppLocaleNamespace) as LegacyAny)
  .use(initReactI18next)
  .init({
    lng: initLanguage(),
    ns: Object.keys(en),
    fallbackLng: "en",

    keySeparator: false,

    interpolation: {
      escapeValue: true,
    },
    // debug: true,
    saveMissing: true,
  });
export default i18n;
