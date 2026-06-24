import React from "react";
import {Space} from "antd";

interface ListPageRowActionsProps {
  className: string;
  children: React.ReactNode;
  wrap?: boolean;
}

// 行操作统一保持低噪声文本/图标按钮，避免列表复用时再次出现重按钮操作列。
export default function ListPageRowActions(props: ListPageRowActionsProps): JSX.Element {
  const className = ["enterprise-list-row-actions", props.className].filter(Boolean).join(" ");

  return (
    <Space className={className} size={4} wrap={props.wrap ?? false}>
      {props.children}
    </Space>
  );
}
