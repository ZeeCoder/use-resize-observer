// @types/react-dom@18 does not ship a declaration for the `react-dom/server.browser`
// entry point (it was added in the @types/react-dom@19 line). Since v10 supports
// both React 18 and 19, this minimal ambient declaration lets the hydration test
// typecheck under either. On React 19 it merges harmlessly with the real one.
declare module "react-dom/server.browser" {
  import type { ReactNode } from "react";
  export function renderToString(node: ReactNode): string;
}
