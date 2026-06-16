import i18next from "i18next";
import React from "react";
import * as Setting from "../Setting";
import GridCards from "./GridCards";

type ShortcutDefinition = {
  link: string;
  name: string;
  description: string;
};

export type ShortcutItem = ShortcutDefinition & {
  logo: string;
  createdTime: string;
};

const shortcutDefinitions: ShortcutDefinition[] = [
  {link: "/organizations", name: i18next.t("general:Organizations"), description: i18next.t("general:User containers")},
  {link: "/users", name: i18next.t("general:Users"), description: i18next.t("general:Users under all organizations")},
  {link: "/providers", name: i18next.t("application:Providers"), description: i18next.t("general:OAuth providers")},
  {link: "/applications", name: i18next.t("general:Applications"), description: i18next.t("general:Applications that require authentication")},
];

export function buildShortcutItems(staticBaseUrl: string = Setting.StaticBaseUrl): ShortcutItem[] {
  return shortcutDefinitions.map(item => ({
    ...item,
    logo: `${staticBaseUrl}/img${item.link}.png`,
    createdTime: "",
  }));
}

const ShortcutsPage = (): JSX.Element => {
  return (
    <div style={{display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center"}}>
      <GridCards items={buildShortcutItems()} />
    </div>
  );
};

export default ShortcutsPage;
