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

  export interface BrowserRouterProps {
    basename?: string;
    forceRefresh?: boolean;
    getUserConfirmation?: unknown;
    keyLength?: number;
    children?: React.ReactNode;
  }

  export class BrowserRouter extends React.Component<BrowserRouterProps> {}

  export interface RouteComponentProps {
    history: {
      push: (path: string | Record<string, unknown>, state?: unknown) => void;
      replace?: (path: string | Record<string, unknown>, state?: unknown) => void;
      [key: string]: unknown;
    };
    location: {
      pathname: string;
      search: string;
      hash?: string;
      state?: unknown;
      [key: string]: unknown;
    };
    match: {
      path: string;
      url: string;
      isExact: boolean;
      params: Record<string, string>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface RouteProps {
    path?: string | string[];
    exact?: boolean;
    strict?: boolean;
    sensitive?: boolean;
    component?: React.ComponentType<any>;
    render?: (props: RouteComponentProps) => React.ReactNode;
    children?: React.ReactNode | ((props: RouteComponentProps) => React.ReactNode);
  }

  export class Route extends React.Component<RouteProps> {}

  export interface SwitchProps {
    location?: unknown;
    children?: React.ReactNode;
  }

  export class Switch extends React.Component<SwitchProps> {}

  export interface RedirectProps {
    to: LinkTarget;
    push?: boolean;
    from?: string;
    exact?: boolean;
    strict?: boolean;
  }

  export class Redirect extends React.Component<RedirectProps> {}

  export function withRouter<P>(component: React.ComponentType<P>): React.ComponentType<P>;
}
