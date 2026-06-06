"use client";
export const dynamic = 'force-dynamic';

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Mic, Zap, Users, Star, ChevronRight } from "lucide-react";
import { LEAGUE_CONFIG } from "@/types";

const FEATURES = [
  {
    icon: Mic,
    title: "Audio en Temps Réel",
    description: "Ton micro capte chaque aboiement. La puissance s'affiche en direct, visualisée avec des effets épiques.",
    color: "#f97316",
  },
  {
    icon: Users,
    title: "Multijoueur 1v1",
    description: "Affronte des joueurs du monde entier via le matchmaking automatique ou crée un salon privé.",
    color: "#a855f7",
  },
  {
    icon: Zap,
    title: "Système de Bonus",
    description: "Déclenche des combos légendaires : Rage du Berger Allemand, Hurlement Lunaire, Alpha Dominant...",
    color: "#fbbf24",
  },
  {
    icon: Trophy,
    title: "Ligues Compétitives",
    description: "Grimpe de l'Os de Bronze jusqu'au Roi des Chiens. Classement mondial mis à jour en temps réel.",
    color: "#22c55e",
  },
];

const LEAGUES = Object.entries(LEAGUE_CONFIG);

const TESTIMONIALS = [
  { user: "ChienFou69", text: "J'ai hurlé si fort que mes voisins ont appelé la police 😂", league: "DOG_KING" as const },
  { user: "BergerAlpha", text: "Le meilleur jeu de 2025, 10/10 recommande à ma meute !", league: "DIAMOND_ALPHA" as const },
  { user: "TchihuahuaRage", text: "Je mesure 1m60 mais mon aboiement est LEGENDAIRE 🔥", league: "PLATINUM_JAW" as const },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-particles">
      {/* Navbar simple */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bone-900/80 backdrop-blur-xl border-b border-bone-800/50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🐾</span>
            <span className="font-display text-2xl text-bark-400 neon-text">BARK BATTLE</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-bone-300 hover:text-white text-sm font-semibold px-3 py-2 transition-colors">
              Connexion
            </Link>
            <Link href="/login?register=true" className="bg-bark-600 hover:bg-bark-500 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all active:scale-95">
              Jouer Gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-bark-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-paw-600/8 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-8xl md:text-9xl"
          >
            🐶
          </motion.div>

          <h1 className="font-display text-6xl md:text-8xl text-white leading-none">
            <span className="text-bark-400 neon-text">BARK</span>{" "}
            <span className="text-white">BATTLE</span>
          </h1>

          <p className="text-xl md:text-2xl text-bone-300 font-semibold max-w-2xl mx-auto leading-relaxed">
            Le premier jeu de combat d'aboiements multijoueur.<br />
            <span className="text-bark-400">Aboie plus fort. Domine la meute.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/login?register=true"
              className="group relative bg-bark-600 hover:bg-bark-500 text-white font-display text-2xl px-10 py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
            >
              <span className="relative z-10">🎮 JOUER MAINTENANT</span>
              <motion.div
                className="absolute inset-0 bg-bark-400/20"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.5 }}
              />
            </Link>
            <Link
              href="#how-it-works"
              className="text-bone-300 hover:text-white font-bold text-lg px-8 py-4 rounded-2xl border border-bone-700 hover:border-bone-500 transition-all flex items-center gap-2"
            >
              Comment ça marche ? <ChevronRight size={18} />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 pt-6 text-bone-400">
            <div className="text-center">
              <p className="font-display text-3xl text-bark-400">12K+</p>
              <p className="text-xs font-semibold uppercase tracking-wide">Joueurs</p>
            </div>
            <div className="w-px h-10 bg-bone-700" />
            <div className="text-center">
              <p className="font-display text-3xl text-bark-400">50K+</p>
              <p className="text-xs font-semibold uppercase tracking-wide">Matchs joués</p>
            </div>
            <div className="w-px h-10 bg-bone-700" />
            <div className="text-center">
              <p className="font-display text-3xl text-bark-400">6</p>
              <p className="text-xs font-semibold uppercase tracking-wide">Ligues</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-display text-5xl text-center text-white mb-4"
          >
            COMMENT ÇA MARCHE ?
          </motion.h2>
          <p className="text-center text-bone-400 mb-12 text-lg">3 étapes pour devenir le Roi des Chiens</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Branche ton Micro", desc: "Autorise l'accès à ton microphone. Aucun enregistrement permanent.", emoji: "🎤" },
              { step: "02", title: "Trouve un Adversaire", desc: "Matchmaking automatique en moins de 30 secondes, ou invite un ami.", emoji: "⚔️" },
              { step: "03", title: "ABOIE !", desc: "Aboie le plus fort possible pendant 30 secondes. Le score décide du vainqueur.", emoji: "🐕" },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-6 text-center space-y-4 hover:border-bark-500/30 transition-all group"
              >
                <div className="text-5xl group-hover:animate-bounce">{step.emoji}</div>
                <div className="font-display text-bark-500 text-lg">{step.step}</div>
                <h3 className="font-display text-2xl text-white">{step.title}</h3>
                <p className="text-bone-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-bone-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-5xl text-center text-white mb-12">
            FONCTIONNALITÉS
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 flex gap-5 hover:scale-[1.01] transition-transform group"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: `${feat.color}22`, border: `1px solid ${feat.color}44` }}
                >
                  <feat.icon size={24} style={{ color: feat.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">{feat.title}</h3>
                  <p className="text-bone-400 text-sm leading-relaxed">{feat.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leagues */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-5xl text-center text-white mb-4">LES LIGUES</h2>
          <p className="text-center text-bone-400 mb-12">6 niveaux de prestige. Un seul Roi des Chiens.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {LEAGUES.map(([key, config], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-5 text-center league-shine hover:scale-105 transition-transform cursor-default"
                style={{ borderColor: `${config.color}33` }}
              >
                <div className="text-4xl mb-2">{config.emoji}</div>
                <p className="font-display text-lg text-white leading-tight">{config.name}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: config.color }}>
                  {config.minRP === 0 ? "Débutant" : `${config.minRP}+ RP`}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-bone-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-5xl text-center text-white mb-12">
            LA MEUTE A PARLÉ 🐺
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className="glass-card p-5 space-y-3"
              >
                <div className="flex items-center gap-1 text-yellow-400">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
                </div>
                <p className="text-bone-300 text-sm italic">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{t.user}</span>
                  <span className="text-xs" style={{ color: LEAGUE_CONFIG[t.league].color }}>
                    {LEAGUE_CONFIG[t.league].emoji} {LEAGUE_CONFIG[t.league].name}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          <div className="text-6xl animate-float">🏆</div>
          <h2 className="font-display text-6xl text-white">
            PRÊT À <span className="text-bark-400 neon-text">ABOYER</span> ?
          </h2>
          <p className="text-bone-400 text-xl">Rejoins 12,000+ joueurs et prouve que tu es l'Alpha.</p>
          <Link
            href="/login?register=true"
            className="inline-block bg-bark-600 hover:bg-bark-500 text-white font-display text-2xl px-12 py-5 rounded-2xl transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
          >
            🐾 REJOINDRE LA MEUTE
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bone-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-bone-500 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐾</span>
            <span className="font-display text-bark-600">BARK BATTLE</span>
            <span>© 2025. Tous droits réservés.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/terms" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
