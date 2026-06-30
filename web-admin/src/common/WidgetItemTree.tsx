import i18next from "i18next";
import {Tree} from "antd";
import React from "react";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

export const WidgetItemTree = ({disabled, checkedKeys, defaultExpandedKeys, onCheck}: LegacyAny) => {
  const WidgetItemNodes = [
    {
      title: t("general:All"),
      key: "all",
      children: [
        {title: t("general:Tour"), key: "tour"},
        {title: t("general:AI Assistant"), key: "ai-assistant"},
        {title: t("user:Language"), key: "language"},
        {title: t("theme:Theme"), key: "theme"},
      ],
    },
  ];

  return (
    <Tree
      disabled={disabled}
      checkable
      checkedKeys={checkedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onCheck={onCheck}
      treeData={WidgetItemNodes}
    />
  );
};
