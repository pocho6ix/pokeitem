import { UProfileClient } from "./UProfileClient";

export function generateStaticParams() {
  return [{ slug: "_" }];
}

export const dynamicParams = false;

export default function PublicProfilePage() {
  return <UProfileClient />;
}
