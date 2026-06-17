declare module "react-router-dom" {
  import * as React from "react";

  export type LinkTarget =
    | string
    | {
      pathname?: string;
      search?: string;
      hash?: string;
      state?: unknown;
    };

  export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    to: LinkTarget;
    replace?: boolean;
    innerRef?: React.Ref<HTMLAnchorElement>;
  }

  export class Link extends React.Component<LinkProps> {}

  export interface MemoryRouterProps {
    initialEntries?: LinkTarget[];
    initialIndex?: number;
    children?: React.ReactNode;
  }

  export class MemoryRouter extends React.Component<MemoryRouterProps> {}
}
