import {Tree} from "antd";
import React from "react";
import {buildEnterpriseNavigationConfigTreeData} from "../enterpriseNavigation";
type LegacyAny = import("../types/legacyPage").LegacyAny;

export const NavItemTree = ({disabled, checkedKeys, defaultExpandedKeys, onCheck}: LegacyAny) => {
  const NavItemNodes = buildEnterpriseNavigationConfigTreeData();

  return (
    <Tree
      disabled={disabled}
      checkable
      checkedKeys={checkedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onCheck={onCheck}
      treeData={NavItemNodes}
      virtual={false}
    />
  );
};
