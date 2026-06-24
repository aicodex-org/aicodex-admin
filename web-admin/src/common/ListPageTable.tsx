import React from "react";
import {Table} from "antd";
import type {TableProps} from "antd";

interface ListPageTableProps<RecordType extends object> extends TableProps<RecordType> {
}

function isToolbarShell(node: React.ReactNode): node is React.ReactElement<{className?: string}> {
  return React.isValidElement<{className?: string}>(node) &&
    typeof node.props.className === "string" &&
    node.props.className.split(/\s+/).includes("enterprise-list-toolbar-shell");
}

// 列表页表格壳，集中约束密度、边框、排序提示和固定布局等共同属性。
export default function ListPageTable<RecordType extends object>(props: ListPageTableProps<RecordType>): JSX.Element {
  const {
    className,
    size = "middle",
    bordered = false,
    showSorterTooltip = {target: "sorter-icon"},
    tableLayout = "fixed",
    title,
    ...restProps
  } = props;
  const mergedClassName = ["enterprise-list-table", className].filter(Boolean).join(" ");
  const wrappedTitle = title === undefined ? undefined : (currentPageData: readonly RecordType[]) => {
    const titleContent = title(currentPageData);
    if (isToolbarShell(titleContent)) {
      return titleContent;
    }
    return <div className="enterprise-list-toolbar-shell">{titleContent}</div>;
  };

  return (
    <Table<RecordType>
      {...restProps}
      className={mergedClassName}
      size={size}
      bordered={bordered}
      showSorterTooltip={showSorterTooltip}
      tableLayout={tableLayout}
      title={wrappedTitle}
    />
  );
}
