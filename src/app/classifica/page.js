"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { Medal, Trophy, ArrowLeft, Crown } from "lucide-react";

export default function ClassificaPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Recupera solo gli utenti non admin ordinati per XP
        const { data, error } = await supabase
          .from("profiles")
          .select("id, nickname, avatar_url, xp, articles_count")
          .neq("role", "admin")
          .order("xp", { ascending: false });

        if (!error && data) {
          setLeaderboard(data);
        }
      } catch (err) {
        console.error("Errore classifica:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 p-4 sm:p-8 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <Link href="/" className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
          <ArrowLeft size={14} /> Torna alla Home
        </Link>
        <span className="text-xs text-[#C5A46D] font-serif italic">Classifica Ufficiale Redattori</span>
      </div>

      <header className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-white flex items-center justify-center gap-3">
          <Trophy className="text-[#C5A46D]" size={36} /> Classifica Redazione
        </h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Gli studenti con più pubblicazioni e punti esperienza guadagnati scrivendo articoli.
        </p>
      </header>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Caricamento classifica...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12 bg-zinc-950 rounded-2xl border border-zinc-800 text-zinc-500">
          Nessun redattore ancora in classifica.
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((user, index) => {
            const isTop3 = index < 3;
            const badgeColor = index === 0 ? "text-amber-400 border-amber-500/40" : index === 1 ? "text-slate-300 border-slate-400/40" : index === 2 ? "text-amber-700 border-amber-700/40" : "text-zinc-500 border-zinc-800";

            return (
              <div
                key={user.id}
                className={`bg-zinc-950/80 border p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 transition ${
                  index === 0 ? "border-[#C5A46D] shadow-lg shadow-[#C5A46D]/10" : "border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-xl font-bold font-mono text-sm flex items-center justify-center border ${badgeColor}`}>
                    {index === 0 ? <Crown size={16} /> : `#${index + 1}`}
                  </span>

                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center font-bold text-black text-lg bg-gradient-to-br from-[#D4B47C] to-[#806432]">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                      user.nickname?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base">{user.nickname || "Redattore"}</h3>
                    <span className="text-xs text-zinc-500">{user.articles_count || 0} Articoli Pubblicati</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-extrabold text-[#D4B47C] block">{user.xp || 100} XP</span>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Punteggio</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}