import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ blocSlug: string }>;
}

export default async function Page({ params }: Props) {
  const { blocSlug } = await params;
  redirect(`/collection/cartes/${blocSlug}`);
}
