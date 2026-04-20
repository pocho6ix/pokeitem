import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ blocSlug: string; serieSlug: string; itemSlug: string }>;
}

export default async function Page({ params }: Props) {
  const { blocSlug, serieSlug, itemSlug } = await params;
  redirect(`/collection/produits/${blocSlug}/${serieSlug}/${itemSlug}`);
}
