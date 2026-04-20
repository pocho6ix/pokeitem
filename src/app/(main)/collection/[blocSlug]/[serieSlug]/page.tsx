import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

export default async function Page({ params }: Props) {
  const { blocSlug, serieSlug } = await params;
  redirect(`/collection/cartes/${blocSlug}/${serieSlug}`);
}
