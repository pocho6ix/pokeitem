"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Veuillez entrer un email valide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function ConnexionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const reset = searchParams.get("reset");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("EMAIL_NOT_VERIFIED")) {
          setError("Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte de réception.");
        } else {
          setError("Email ou mot de passe incorrect");
        }
        return;
      }

      // Full page reload so the session cookie is picked up by middleware / server components
      window.location.href = "/";
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuth(provider: "google") {
    await signIn(provider, { callbackUrl: "/" });
  }

  return (
    <Card>
      <CardHeader className="items-center space-y-4 pb-2">
        <Link href="/" aria-label="PokeItem" className="flex justify-center">
          <Image
            src="/logo-long.png"
            alt="PokeItem"
            width={240}
            height={60}
            priority
            className="h-12 w-auto"
          />
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Connexion &agrave; PokeItem
        </h1>
      </CardHeader>

      <CardContent className="space-y-6">
        {registered && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600 dark:text-green-400">
            Compte cr&eacute;&eacute; avec succ&egrave;s ! V&eacute;rifiez votre email pour activer votre compte.
          </div>
        )}
        {reset && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600 dark:text-green-400">
            Mot de passe mis &agrave; jour. Vous pouvez vous connecter.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="space-y-1.5">
            <Input
              label="Mot de passe"
              type="password"
              placeholder="********"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <div className="flex justify-end">
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Mot de passe oubli&eacute; ?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            Se connecter
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
          Pas encore inscrit ?{" "}
          <Link
            href="/inscription"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Cr&eacute;er un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
