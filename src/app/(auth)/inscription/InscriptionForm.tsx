"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Cookies from "js-cookie";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { fetchApi } from "@/lib/api";

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Le pseudo est requis")
      .min(2, "Le pseudo doit contenir au moins 2 caractères"),
    email: z
      .string()
      .min(1, "L'email est requis")
      .email("Veuillez entrer un email valide"),
    password: z
      .string()
      .min(1, "Le mot de passe est requis")
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z
      .string()
      .min(1, "Veuillez confirmer votre mot de passe"),
    subscribeNewsletter: z.boolean().optional(),
    // ToS / Privacy consent — blocking. `z.literal(true)` forces the
    // checkbox to be explicitly checked; defaultChecked is intentionally
    // NOT set so the user performs a deliberate action (GDPR best
    // practice: no pre-ticked consent boxes). Zod v4 uses `message`
    // directly (v3's `errorMap` option was removed).
    acceptCgu: z.literal(true, {
      message: "Vous devez accepter les CGU pour créer un compte",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function InscriptionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) Cookies.set('referral_code', ref, { expires: 7 })
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Watched to drive the submit button's disabled state — keeps the CTA
  // visually disabled until the user ticks the ToS box (Zod will also
  // reject submission if they bypass it via devtools).
  const acceptCgu = watch("acceptCgu");

  async function handleOAuth(provider: "google") {
    await signIn(provider, { callbackUrl: "/" });
  }

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true);
    setError(null);
    try {
      const referralCode = searchParams.get('ref') ?? Cookies.get('referral_code') ?? undefined;
      const res = await fetchApi("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          subscribeNewsletter: data.subscribeNewsletter !== false,
          tosAcceptedAt: new Date().toISOString(),
          referralCode,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Erreur lors de la création du compte");
        return;
      }

      setEmailSent(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="items-center space-y-4 pb-2">
            <Logo variant="long" />
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Compte cr&eacute;&eacute; !
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Un email de confirmation a &eacute;t&eacute; envoy&eacute; &agrave; votre adresse.
              Cliquez sur le lien pour activer votre compte.
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Le lien expire dans 24 heures. Pensez &agrave; v&eacute;rifier vos spams.
            </p>
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => router.push("/connexion?registered=true")}
            >
              Aller &agrave; la connexion
            </Button>
          </CardContent>
        </Card>

      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="items-center space-y-4 pb-2">
        <Logo variant="long" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Cr&eacute;er un compte PokeItem
        </h1>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Pseudo"
            type="text"
            placeholder="Votre pseudo"
            autoComplete="username"
            error={errors.name?.message}
            {...register("name")}
          />

          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Mot de passe"
            type="password"
            placeholder="********"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Input
            label="Confirmer le mot de passe"
            type="password"
            placeholder="********"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {/* CGU consent — obligatoire */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] accent-[#E7BA76]"
              {...register("acceptCgu")}
            />
            <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
              J&apos;accepte les{" "}
              <a
                href="https://www.pokeitem.fr/cgu"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#E7BA76]"
              >
                CGU
              </a>{" "}
              et j&apos;ai pris connaissance de la{" "}
              <a
                href="https://www.pokeitem.fr/politique-confidentialite"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#E7BA76]"
              >
                Politique de confidentialit&eacute;
              </a>
            </span>
          </label>
          {errors.acceptCgu && (
            <p className="text-xs text-red-500">{errors.acceptCgu.message}</p>
          )}

          {/* Newsletter consent */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] accent-[#E7BA76]"
              {...register("subscribeNewsletter")}
            />
            <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
              J&apos;accepte de recevoir les nouveaut&eacute;s et offres PokeItem par email.
              D&eacute;sinscription possible &agrave; tout moment.
            </span>
          </label>

          <Button type="submit" className="w-full" loading={isLoading} disabled={!acceptCgu || isLoading}>
            Cr&eacute;er mon compte
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--border-default)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--bg-card)] px-2 text-[var(--text-secondary)]">
              ou
            </span>
          </div>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full" type="button" onClick={() => handleOAuth("google")}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuer avec Google
          </Button>

        </div>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          D&eacute;j&agrave; inscrit ?{" "}
          <Link
            href="/connexion"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
