// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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

import React from "react";
import * as Setting from "../../Setting";
import {Dropdown, Space} from "antd";
import "../../App.less";
import i18next from "i18next";
import {CheckOutlined} from "@ant-design/icons";
import {CompactTheme, DarkTheme, Light} from "antd-token-previewer/es/icons";
type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

export const Themes = [
  {label: "Default", key: "default", icon: <Light style={{fontSize: "24px"}} />},        // t("general:Default")
  {label: "Dark", key: "dark", icon: <DarkTheme style={{fontSize: "24px"}} />},          // t("theme:Dark")
  {label: "Compact", key: "compact", icon: <CompactTheme style={{fontSize: "24px"}} />}, // t("theme:Compact")
];

function getIcon(themeKey: LegacyAny): React.ReactNode {
  if (themeKey?.includes("dark")) {
    return Themes.find((theme: LegacyAny) => theme.key === "dark")?.icon;
  } else if (themeKey?.includes("default")) {
    return Themes.find((theme: LegacyAny) => theme.key === "default")?.icon;
  }
}

class ThemeSelect extends React.Component<LegacyAny, LegacyAny> {
  constructor(props: LegacyAny) {
    super(props);
  }

  icon = getIcon(this.props.themeAlgorithm);

  getThemeItems(): LegacyAny[] {
    return Themes.map((theme: LegacyAny) => Setting.getItem(
      <Space>
        {t(`theme:${theme.label}`)}
        {this.props.themeAlgorithm.includes(theme.key) ? <CheckOutlined style={{marginLeft: "5px"}} /> : null}
      </Space>,
      theme.key, theme.icon));
  }

  render() {
    const onClick = (e: LegacyAny) => {
      let nextTheme;
      if (e.key === "compact") {
        if (this.props.themeAlgorithm.includes("compact")) {
          nextTheme = this.props.themeAlgorithm.filter((theme: LegacyAny) => theme !== "compact");
        } else {
          nextTheme = [...this.props.themeAlgorithm, "compact"];
        }
      } else {
        if (!this.props.themeAlgorithm.includes(e.key)) {
          if (e.key === "dark") {
            nextTheme = [...this.props.themeAlgorithm.filter((theme: LegacyAny) => theme !== "default"), e.key];
          } else {
            nextTheme = [...this.props.themeAlgorithm.filter((theme: LegacyAny) => theme !== "dark"), e.key];
          }
        } else {
          nextTheme = [...this.props.themeAlgorithm];
        }
      }

      this.icon = getIcon(nextTheme);
      this.props.onChange(nextTheme);
    };

    return (
      <Dropdown menu={{
        items: this.getThemeItems(),
        onClick,
        selectable: true,
        multiple: true,
        selectedKeys: [...this.props.themeAlgorithm],
      }}>
        <div className="select-box">
          {this.icon}
        </div>
      </Dropdown>
    );
  }
}

export default ThemeSelect;
