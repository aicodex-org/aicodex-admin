import React from "react";
import {Pagination, Table} from "antd";
import type {TablePaginationConfig, TableProps} from "antd";

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
    pagination,
    onChange,
    ...restProps
  } = props;
  const mergedClassName = ["enterprise-list-table", className].filter(Boolean).join(" ");
  const paginationConfig = pagination && typeof pagination === "object" ? pagination : undefined;
  const wrappedTitle = title === undefined ? undefined : (currentPageData: readonly RecordType[]) => {
    const titleContent = title(currentPageData);
    if (isToolbarShell(titleContent)) {
      return titleContent;
    }
    return <div className="enterprise-list-toolbar-shell">{titleContent}</div>;
  };
  const handleTableChange: TableProps<RecordType>["onChange"] = (nextPagination, filters, sorter, extra) => {
    const mergedPagination = paginationConfig === undefined ?
      nextPagination :
      {...paginationConfig, ...nextPagination};

    onChange?.(mergedPagination, filters, sorter, extra);
  };
  const handleFooterPaginationChange: NonNullable<TablePaginationConfig["onChange"]> = (current, pageSize) => {
    const nextPagination = {
      ...paginationConfig,
      current,
      pageSize,
    } as TablePaginationConfig;

    paginationConfig?.onChange?.(current, pageSize);
    onChange?.(nextPagination, {}, {}, {action: "paginate", currentDataSource: []});
  };

  return (
    <div className="enterprise-list-table-frame">
      <Table<RecordType>
        {...restProps}
        className={mergedClassName}
        size={size}
        bordered={bordered}
        showSorterTooltip={showSorterTooltip}
        tableLayout={tableLayout}
        title={wrappedTitle}
        pagination={paginationConfig === undefined ? pagination : false}
        onChange={handleTableChange}
      />
      {paginationConfig === undefined ? null : (
        <div className="enterprise-list-pagination-footer">
          <Pagination
            {...paginationConfig}
            className="enterprise-list-pagination-footer-control"
            size={paginationConfig.size ?? "small"}
            onChange={handleFooterPaginationChange}
          />
        </div>
      )}
    </div>
  );
}
