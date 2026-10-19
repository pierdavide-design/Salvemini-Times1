"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { Printer, ArrowLeft } from "lucide-react";

export default function EdicolaPage() {
  const [articles, setArticles] = useState([]);
  const [timeframe, setTimeframe] = useState("week"); // 'week' | 'month'
  const [loading, setLoading] = useState(true);
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" })
    );
  }, []);

  useEffect(() => {
    async function fetchEdition() {
      setLoading(true);
      const days = timeframe === "week" ? 7 : 30;
      const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from("articles")
        .select("*, profiles(nickname)")
        .ilike("status", "published")
        .gte("created_at", dateThreshold)
        .order("created_at", { ascending: false });

      setArticles(data || []);
      setLoading(false);
    }

    fetchEdition();
  }, [timeframe]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-4 sm:p-8">
      {/* BARRA SUPERIORE */}
      <header className="max-w-5xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#C5A46D]">L'Edicola del Salvemini</h1>
            <p className="text-xs text-zinc-400">Edizione digitale impaginata e pronta per il download PDF</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#151515] p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setTimeframe("week")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === "week" ? "bg-[#C5A46D] text-black" : "text-zinc-400"
              }`}
            >
              Settimanale
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === "month" ? "bg-[#C5A46D] text-black" : "text-zinc-400"
              }`}
            >
              Mensile
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#C5A46D] hover:bg-[#b3925c] text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-md"
          >
            <Printer size={16} /> Scarica PDF / Stampa
          </button>
        </div>
      </header>

      {/* LAYOUT GIORNALINO STILE QUOTIDIANO */}
      <main className="max-w-5xl mx-auto bg-white text-black p-8 sm:p-12 rounded-3xl shadow-2xl print:p-0 print:shadow-none print:rounded-none">
        
        {/* INTESTAZIONE GIORNALE */}
        <div className="border-b-4 border-black pb-4 mb-6 text-center">
          <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-zinc-600 border-b border-black pb-1 mb-3">
            <span>Edizione {timeframe === "week" ? "Settimanale" : "Mensile"}</span>
            <span>{formattedDate}</span>
            <span>Liceo Salvemini</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight uppercase">
            Salvemini Times
          </h1>
          <p className="text-xs italic font-serif mt-1 text-zinc-700">
            La voce indipendente degli studenti del Salvemini
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500 font-serif">Compilazione edizione in corso...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 font-serif">
            Nessun articolo pubblicato nel periodo selezionato.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ARTICOLO PRINCIPALE (PRIMA PAGINA) */}
            <article className="md:col-span-2 border-b md:border-b-0 md:border-r border-zinc-300 pr-0 md:pr-6 pb-6 md:pb-0">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5">
                In Primo Piano
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold mt-2 leading-tight">
                {articles[0].title}
              </h2>
              {articles[0].subtitle && (
                <p className="text-sm font-serif italic text-zinc-700 mt-1">{articles[0].subtitle}</p>
              )}
              {articles[0].cover_url && (
                <img
                  src={articles[0].cover_url}
                  alt={articles[0].title}
                  className="w-full h-56 object-cover my-4 rounded border border-zinc-300"
                />
              )}
              <div
                className="text-xs leading-relaxed font-serif text-zinc-800 space-y-2 mt-3"
                dangerouslySetInnerHTML={{ __html: articles[0].content }}
              />
              <p className="text-[10px] font-mono mt-4 text-zinc-500">
                Redattore: {articles[0].profiles?.nickname || "Redazione"}
              </p>
            </article>

            {/* COLONNA LATERALE */}
            <div className="space-y-6">
              {articles.slice(1).map((art) => (
                <article key={art.id} className="border-b border-zinc-200 pb-4 last:border-b-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800">
                    {art.category || "Generale"}
                  </span>
                  <h3 className="text-base font-serif font-bold leading-snug mt-1">{art.title}</h3>
                  <p className="text-xs font-serif text-zinc-600 line-clamp-3 mt-1">
                    {art.summary || art.content?.replace(/<[^>]*>?/gm, "")}
                  </p>
                  <p className="text-[9px] font-mono mt-2 text-zinc-400">
                    Di {art.profiles?.nickname || "Redazione"}
                  </p>
                </article>
              ))}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}