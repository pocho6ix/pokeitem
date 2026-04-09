"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

function VerificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "signing-in" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Lien de vérification invalide.");
      return;
    }

    fetch(`/api/auth/verify?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(
            data.error === "Token expiré"
              ? "Ce lien a expiré. Veuillez vous réinscrire."
              : data.error ?? "Lien de vérification invalide."
          );
          return;
        }

        // Auto-login with the one-time token
        setStatus("signing-in");
        const result = await signIn("credentials", {
          autoLoginToken: data.autoLoginToken,
          redirect: false,
        });

        if (result?.ok) {
          router.replace("/");
        } else {
          // Fallback: verification worked but auto-login failed — send to login page
          setStatus("success");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
      });
  }, [token, router]);

  return (
    <>
      {(status === "loading" || status === "signing-in") && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <svg className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {status === "signing-in" ? "Connexion en cours..." : "Vérification en cours..."}
          </h2>
        </>
      )}

      {status === "success" && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Email vérifié !
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Votre compte est actif. Cliquez ci-dessous pour vous connecter.
          </p>
          <Button className="mt-2" onClick={() => router.replace("/connexion")}>
            Se connecter
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" x2="9" y1="9" y2="15" />
              <line x1="9" x2="15" y1="9" y2="15" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Échec de la vérification
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {errorMessage}
          </p>
          <Button variant="outline" className="mt-2" onClick={() => router.replace("/inscription")}>
            Réessayer l&apos;inscription
          </Button>
        </>
      )}
    </>
  );
}

export default function VerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-4 pb-2">
          <Logo size="lg" />
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Suspense
            fallback={
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <svg className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            }
          >
            <VerificationContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
