"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { getLeagueConfig } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Home, Trophy, User, ShoppingBag, LogOut, Menu, X, Swords
} from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/matchmaking", label: "Jouer", icon: Swords },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/shop", label: "Boutique", icon: ShoppingBag },
];

export function Navbar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const leagueConfig = user ? getLeagueConfig(user.league) : null;

  return (
    <nav className="sticky top-0 z-50 bg-bone-900/90 backdrop-blur-xl border-b border-bark-700/30">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <span className="text-3xl">🐾</span>
          <span className="font-display text-2xl text-bark-400 group-hover:text-bark-300 transition-colors neon-text">
            BARK BATTLE
          </span>
        </Link>

        {/* Desktop nav */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  pathname === href
                    ? "bg-bark-600 text-white"
                    : "text-bone-300 hover:text-white hover:bg-bone-700"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* User section */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href={`/profile/${user.id}`} className="hidden md:flex items-center gap-3 glass-card px-3 py-1.5 hover:border-bark-500/40 transition-all">
                <div className="text-xl">{leagueConfig?.emoji}</div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white leading-none">{user.username}</p>
                  <p className="text-xs font-semibold leading-none mt-0.5" style={{ color: leagueConfig?.color }}>
                    {leagueConfig?.name} · {user.rp} RP
                  </p>
                </div>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full ring-2 ring-bark-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-bark-700 flex items-center justify-center text-bark-300">
                    <User size={16} />
                  </div>
                )}
              </Link>
              <button onClick={handleLogout} className="hidden md:flex items-center gap-1 text-bone-400 hover:text-red-400 transition-colors p-2">
                <LogOut size={18} />
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-bone-300 p-2">
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-bone-300 hover:text-white text-sm font-semibold px-4 py-2 transition-colors">
                Connexion
              </Link>
              <Link href="/login?register=true" className="bg-bark-600 hover:bg-bark-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                Jouer Gratuitement
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && user && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-bone-800 bg-bone-900/95 backdrop-blur-xl px-4 py-3 space-y-1"
        >
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                pathname === href ? "bg-bark-600 text-white" : "text-bone-300 hover:bg-bone-800"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-bone-800 rounded-xl text-sm font-semibold"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </motion.div>
      )}
    </nav>
  );
}
