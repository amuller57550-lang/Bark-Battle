"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authAPI } from "@/lib/api";
import toast from "react-hot-toast";

// Landing page for the backend's OAuth redirect: /auth/callback?token=...
// (or ?error=... if the provider login failed). It stores the JWT, fetches
// the freshly-authenticated user, and bounces to the dashboard.
function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setToken, setUser } = useAuthStore();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      toast.error("Connexion impossible. Réessaie plus tard. 🐾");
      router.replace("/login");
      return;
    }

    setToken(token);
    authAPI
      .me()
      .then(({ data }) => {
        setUser(data);
        toast.success(`Content de te revoir, ${data.username} ! 🐶`);
        router.replace("/dashboard");
      })
      .catch(() => {
        setToken(null);
        toast.error("Connexion impossible. Réessaie plus tard. 🐾");
        router.replace("/login");
      });
  }, [params, router, setToken, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <span className="text-5xl animate-bounce inline-block">🐾</span>
        <p className="text-bone-300 font-display text-xl">Connexion en cours...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-4xl animate-pulse">🐾</span>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
