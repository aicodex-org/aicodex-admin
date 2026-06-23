import React from "react";
import {Table} from "antd";
import type {TableProps} from "antd";

interface ListPageTableProps<RecordType extends object> extends TableProps<RecordType> {
}

// 列表页表格壳，集中约束密度、边框、排序提示和固定布局等共同属性。
export default function ListPageTable<RecordType extends object>(props: ListPageTableProps<RecordType>): JSX.Element {
  const {
    className,
    size = "middle",
    bordered = false,
    showSorterTooltip = {target: "sorter-icon"},
    tableLayout = "fixed",
    ...restProps
  } = props;
  const mergedClassName = ["enterprise-list-table", className].filter(Boolean).join(" ");

  return (
    <Table<RecordType>
      {...restProps}
      className={mergedClassName}
      size={size}
      bordered={bordered}
      showSorterTooltip={showSorterTooltip}
      tableLayout={tableLayout}
    />
  );
}
