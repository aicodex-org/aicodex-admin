import React from "react";

interface PageScrollShellProps {
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

// 统一页面壳：固定页头，正文区域内部滚动。
export default function PageScrollShell({
  header,
  children,
  className,
  headerClassName,
  bodyClassName,
}: PageScrollShellProps): JSX.Element {
  return (
    <div className={joinClassNames("admin-page-scroll-shell", className)}>
      <div className={joinClassNames("admin-page-scroll-shell-header", headerClassName)}>
        {header}
      </div>
      <div className={joinClassNames("admin-page-scroll-shell-body", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
