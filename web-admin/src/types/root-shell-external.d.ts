declare module "cookie" {
  export function parse(str: string, options?: Record<string, unknown>): Record<string, string>;
  export function serialize(name: string, value: string, options?: Record<string, unknown>): string;
}

declare module "react-helmet" {
  import * as React from "react";

  export interface HelmetProps {
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  export class Helmet extends React.Component<HelmetProps> {}
}
