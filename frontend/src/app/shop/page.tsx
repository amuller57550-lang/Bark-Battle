"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { shopAPI } from "@/lib/api";
import { ShopItem } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const MOCK_ITEMS: ShopItem[] = [
  { id: "1", name: "Chiot Furieux", description: "Un badge légendaire pour les vrais alphas", type: "BADGE", rarity: "LEGENDARY", price: 500, currency: "BONES", preview: "🐕‍🦺" },
  { id: "2", name: "Maître des Aboiements", description: "Titre exclusif pour les champions", type: "TITLE", rarity: "EPIC", price: 300, currency: "BONES", preview: "👑" },
  { id: "3", name: "Cadre Flamboyant", description: "Un cadre de profil en feu", type: "FRAME", rarity: "RARE", price: 150, currency: "BONES", preview: "🔥" },
  { id: "4", name: "Alpha Suprême", description: "Le titre ultime", type: "TITLE", rarity: "LEGENDARY", price: 2000, currency: "PREMIUM", preview: "💎" },
  { id: "5", name: "Animation Victoire Arc-en-ciel", description: "Arc-en-ciel lors des victoires !", type: "ANIMATION", rarity: "EPIC", price: 800, currency: "BONES", preview: "🌈" },
  { id: "6", name: "Badge Vétéran", description: "Pour les joueurs expérimentés", type: "BADGE", rarity: "RARE", price: 200, currency: "BONES", preview: "🎖️" },
  { id: "7", name: "Effet Électrique", description: "Effets visuels électriques sur profil", type: "EFFECT", rarity: "EPIC", price: 600, currency: "BONES", preview: "⚡" },
  { id: "8", name: "Cadre Royal", description: "Couronne dorée autour de ton avatar", type: "FRAME", rarity: "LEGENDARY", price: 1500, currency: "PREMIUM", preview: "👑" },
];

const TYPE_LABELS: Record<string, string> = {
  BADGE: "Badge", TITLE: "Titre", FRAME: "Cadre", EFFECT: "Effet", ANIMATION: "Animation",
};

const RARITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  COMMON:    { color: "#78716c", bg: "#78716c22", label: "Commun" },
  RARE:      { color: "#3b82f6", bg: "#3b82f622", label: "Rare" },
  EPIC:      { color: "#a855f7", bg: "#a855f722", label: "Épique" },
  LEGENDARY: { color: "#f97316", bg: "#f9731622", label: "Légendaire" },
};

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    shopAPI.getItems()
      .then(({ data }) => setItems(data.items || MOCK_ITEMS))
      .catch(() => setItems(MOCK_ITEMS));
  }, []);

  const handlePurchase = async (item: ShopItem) => {
    if (item.isOwned) return;
    setPurchasing(item.id);
    try {
      await shopAPI.purchaseItem(item.id);
      toast.success(`✅ ${item.name} acheté !`);
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isOwned: true } : i));
    } catch {
      toast.error("Fonds insuffisants ou erreur.");
    } finally {
      setPurchasing(null);
    }
  };

  const filters = ["ALL", "BADGE", "TITLE", "FRAME", "EFFECT", "ANIMATION"];
  const filtered = filter === "ALL" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 page-enter">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-5xl text-white">🛒 BOUTIQUE</h1>
          <p className="text-bone-400">Uniquement des cosmétiques. Aucun avantage compétitif.</p>
          <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-700/30 px-4 py-2 rounded-xl">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-400 text-sm font-semibold">100% cosmétique · Fair play garanti</span>
          </div>
        </div>

        {/* Currency display */}
        <div className="flex justify-center gap-4">
          <div className="glass-card px-5 py-3 flex items-center gap-2">
            <span className="text-2xl">🦴</span>
            <div>
              <p className="text-xs text-bone-500 font-semibold">OS (gratuit)</p>
              <p className="font-display text-xl text-bark-400">1,250</p>
            </div>
          </div>
          <div className="glass-card px-5 py-3 flex items-center gap-2">
            <span className="text-2xl">💎</span>
            <div>
              <p className="text-xs text-bone-500 font-semibold">Premium</p>
              <p className="font-display text-xl text-paw-400">0</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 justify-center">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                filter === f ? "bg-bark-600 text-white" : "glass-card text-bone-400 hover:text-white"
              )}
            >
              {f === "ALL" ? "Tout" : TYPE_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item, i) => {
            const rarity = RARITY_CONFIG[item.rarity];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "glass-card p-4 space-y-3 flex flex-col",
                  item.isOwned && "opacity-60"
                )}
                style={{ borderColor: `${rarity.color}33` }}
              >
                {/* Preview */}
                <div
                  className="h-24 rounded-xl flex items-center justify-center text-5xl"
                  style={{ background: rarity.bg }}
                >
                  {item.preview || "🐾"}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-white text-sm truncate">{item.name}</p>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: rarity.bg, color: rarity.color }}
                    >
                      {rarity.label}
                    </span>
                  </div>
                  <p className="text-xs text-bone-500 leading-relaxed">{item.description}</p>
                  <p className="text-xs font-semibold text-bone-500">{TYPE_LABELS[item.type]}</p>
                </div>

                {/* Buy button */}
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={item.isOwned || purchasing === item.id}
                  className={cn(
                    "w-full py-2 rounded-xl font-bold text-sm transition-all",
                    item.isOwned
                      ? "bg-green-800/30 text-green-500 cursor-default"
                      : purchasing === item.id
                      ? "bg-bone-700 text-bone-400 cursor-wait"
                      : "bg-bark-600 hover:bg-bark-500 text-white active:scale-95"
                  )}
                >
                  {item.isOwned ? (
                    "✅ Possédé"
                  ) : purchasing === item.id ? (
                    "⏳ Achat..."
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      {item.currency === "BONES" ? "🦴" : "💎"} {item.price}
                    </span>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Notice */}
        <div className="glass-card p-4 text-center space-y-1">
          <p className="font-semibold text-bone-300 flex items-center justify-center gap-2">
            <ShoppingBag size={16} />
            Comment gagner des 🦴 Os ?
          </p>
          <p className="text-bone-500 text-sm">
            Gagne des matchs, monte en ligue, et complète des défis quotidiens pour obtenir des Os gratuitement.
          </p>
        </div>
      </main>
    </div>
  );
}
