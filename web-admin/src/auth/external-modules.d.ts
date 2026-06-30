declare module "crypto-js";

declare module "react-router-dom" {
  import * as React from "react";

  export function withRouter<P>(component: React.ComponentType<P>): React.ComponentType<P>;
}
