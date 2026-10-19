"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Send, ShieldCheck, CheckCircle } from "lucide-react";

export default function FeedbackPage() {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Generale");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("feedbacks").insert([{ content, category }]);

    if (!error) {
      setSent(true);
      setContent("");
    } else {
      alert("Errore nell'invio del feedback.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-[#151515] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white mb-6 transition">
          <ArrowLeft size={16} /> Torna alla Home
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="text-[#C5A46D]" size={20} />
          <h1 className="text-xl font-serif font-bold text-white">Box Feedback Anonimo</h1>
        </div>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Invia suggerimenti, critiche o segnalazioni in modo 100% anonimo. Nessun dato personale viene salvato.
        </p>

        {sent ? (
          <div className="bg-[#C5A46D]/10 border border-[#C5A46D]/30 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle className="mx-auto text-[#C5A46D]" size={36} />
            <h3 className="font-serif font-bold text-lg text-white">Feedback Inviato!</h3>
            <p className="text-xs text-zinc-400">Grazie per il tuo contributo alla redazione del Salvemini Times.</p>

            <button
              onClick={() => setSent(false)}
              className="mt-2 text-xs text-[#C5A46D] font-bold underline"
            >
              Invia un altro messaggio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Argomento
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#C5A46D]"
              >
                <option value="Generale">💡 Suggerimento Generale</option>
                <option value="Articoli">📰 Segnalazione Articolo</option>
                <option value="Gossip">🔥 Gossip / Rumor</option>
                <option value="Problema">⚠️ Segnalazione Bug / Problema</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Messaggio
              </label>
              <textarea
                required
                rows={5}
                placeholder="Scrivi qui il tuo messaggio anonimo..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#C5A46D] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C5A46D] hover:bg-[#b3925c] text-black font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
            >
              <Send size={14} /> {loading ? "Invio in corso..." : "Invia Messaggio Anonimo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}