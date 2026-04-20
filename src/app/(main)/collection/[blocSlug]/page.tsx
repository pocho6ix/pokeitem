import { RedirectClient } from "./RedirectClient";

export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function Page() {
  return <RedirectClient />;
}
