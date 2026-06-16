import {Tree} from "antd";
import React from "react";
import {buildEnterpriseNavigationConfigTreeData} from "../enterpriseNavigation";

export const NavItemTree = ({disabled, checkedKeys, defaultExpandedKeys, onCheck}) => {
  const NavItemNodes = buildEnterpriseNavigationConfigTreeData();

  return (
    <Tree
      disabled={disabled}
      checkable
      checkedKeys={checkedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onCheck={onCheck}
      treeData={NavItemNodes}
    />
  );
};
