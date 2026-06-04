"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authAPI } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [isRegister, setIsRegister] = useState(params.get("register") === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser, setToken } = useAuthStore();

  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { data } = await authAPI.register(form.username, form.email, form.password);
        setToken(data.access_token);
        setUser(data.user);
        toast.success("Bienvenue dans la meute ! 🐾");
      } else {
        const { data } = await authAPI.login(form.email, form.password);
        setToken(data.access_token);
        setUser(data.user);
        toast.success(`Content de te revoir, ${data.user.username} ! 🐶`);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isRegister ? "Erreur lors de l'inscription" : "Email ou mot de passe incorrect"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-particles relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-bark-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-paw-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <Link href="/" className="flex items-center gap-2 text-bone-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Retour à l'accueil
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-5xl mb-3">🐾</div>
            <h1 className="font-display text-4xl text-white">
              {isRegister ? "REJOINDRE LA MEUTE" : "CONNEXION"}
            </h1>
            <p className="text-bone-400 text-sm">
              {isRegister
                ? "Crée ton compte et commence à aboyer !"
                : "Bon retour parmi les chiens !"}
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3 px-4 rounded-xl transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>

            <button className="w-full flex items-center justify-center gap-3 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-white font-semibold py-3 px-4 rounded-xl transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.136 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Continuer avec Discord
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-bone-700" />
            <span className="text-bone-500 text-xs font-semibold">OU</span>
            <div className="flex-1 h-px bg-bone-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-semibold text-bone-300 mb-1.5">
                    Pseudo
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-500" />
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="AlphaDog_42"
                      required={isRegister}
                      className="w-full bg-bone-800 border border-bone-700 focus:border-bark-500 rounded-xl py-3 pl-9 pr-4 text-white placeholder-bone-600 outline-none transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-semibold text-bone-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-500" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="alpha@barkbattle.com"
                  required
                  className="w-full bg-bone-800 border border-bone-700 focus:border-bark-500 rounded-xl py-3 pl-9 pr-4 text-white placeholder-bone-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-bone-300 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-bone-800 border border-bone-700 focus:border-bark-500 rounded-xl py-3 pl-9 pr-10 text-white placeholder-bone-600 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-500 hover:text-bone-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-bark-600 hover:bg-bark-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 font-display text-lg"
            >
              {loading ? "⏳ Chargement..." : isRegister ? "🐾 CRÉER MON COMPTE" : "🔑 SE CONNECTER"}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-bone-400 text-sm">
            {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-bark-400 font-bold hover:text-bark-300 transition-colors"
            >
              {isRegister ? "Se connecter" : "S'inscrire gratuitement"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
