import { RedirectClient } from "./RedirectClient";

export async function generateStaticParams() {
  return [] as { blocSlug: string; serieSlug: string }[];
}

export const dynamicParams = false;

export default function Page() {
  return <RedirectClient />;
}
