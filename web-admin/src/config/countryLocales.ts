import de from "i18n-iso-countries/langs/de.json";
import en from "i18n-iso-countries/langs/en.json";
import es from "i18n-iso-countries/langs/es.json";
import fr from "i18n-iso-countries/langs/fr.json";
import ja from "i18n-iso-countries/langs/ja.json";
import pl from "i18n-iso-countries/langs/pl.json";
import pt from "i18n-iso-countries/langs/pt.json";
import tr from "i18n-iso-countries/langs/tr.json";
import uk from "i18n-iso-countries/langs/uk.json";
import vi from "i18n-iso-countries/langs/vi.json";
import zh from "i18n-iso-countries/langs/zh.json";
import {normalizeSupportedLanguage} from "./supportedLocales";

const countryLocales = {
  de, en, es, fr, ja, pl, pt, tr, uk, vi, zh,
};

/** 返回国家名称库对应语言数据，语言回退规则与应用翻译保持一致。 */
export function getCountryLocale(language?: string) {
  return countryLocales[normalizeSupportedLanguage(language)];
}
