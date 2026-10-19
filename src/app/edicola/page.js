"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { Printer, ArrowLeft, Newspaper, Calendar as CalendarIcon } from "lucide-react";

export default function EdicolaPage() {
  const [articles, setArticles] = useState([]);
  const [timeframe, setTimeframe] = useState("week"); // 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Imposta le date iniziali (ultimi 7 giorni)
  useEffect(() => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 7);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(past.toISOString().split("T")[0]);
  }, []);

  // Cambia intervallo con i bottoni rapidi
  const handleTimeframeChange = (type) => {
    setTimeframe(type);
    const today = new Date();
    const past = new Date();

    if (type === "week") {
      past.setDate(today.getDate() - 7);
    } else if (type === "month") {
      past.setDate(today.getDate() - 30);
    }

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(past.toISOString().split("T")[0]);
  };

  useEffect(() => {
    async function fetchEdition() {
      if (!startDate || !endDate) return;
      setLoading(true);

      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate + "T23:59:59").toISOString();

      try {
        // 1. Tenta la query principale con JOIN sui profili
        let { data, error } = await supabase
          .from("articles")
          .select("*, profiles(nickname)")
          .eq("status", "published")
          .gte("updated_at", startIso)
          .lte("updated_at", endIso)
          .order("updated_at", { ascending: false });

        // 2. Se la JOIN fallisce (es. per FK o RLS mancante), effettua il fallback sulla sola tabella articoli
        if (error) {
          console.warn("⚠️ Query con join 'profiles' fallita, eseguo fallback semplice:", error);
          
          const fallbackRes = await supabase
            .from("articles")
            .select("*")
            .eq("status", "published")
            .gte("updated_at", startIso)
            .lte("updated_at", endIso)
            .order("updated_at", { ascending: false });

          if (fallbackRes.error) {
            throw fallbackRes.error;
          }
          data = fallbackRes.data;
        }

        setArticles(data || []);
      } catch (err) {
        console.error("❌ Errore definitivo recupero edicola:", err?.message || err);
      } finally {
        setLoading(false);
      }
    }

    fetchEdition();
  }, [startDate, endDate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-4 sm:p-8 print:bg-white print:p-0 print:text-black">
      
      {/* BARRA SUPERIORE DEI FILTRI (NASCOSTA IN STAMPA) */}
      <header className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#C5A46D]">L'Edicola del Salvemini</h1>
            <p className="text-xs text-zinc-400">Edizione digitale impaginata e pronta per il download PDF</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selettore Periodo Rapido */}
          <div className="flex bg-[#151515] p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => handleTimeframeChange("week")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === "week" ? "bg-[#C5A46D] text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              Settimanale
            </button>
            <button
              onClick={() => handleTimeframeChange("month")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === "month" ? "bg-[#C5A46D] text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              Mensile
            </button>
          </div>

          {/* Input Date Personalizzate */}
          <div className="flex items-center gap-1.5 bg-[#151515] px-3 py-1 rounded-xl border border-zinc-800 text-xs">
            <CalendarIcon size={14} className="text-[#C5A46D]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setTimeframe("custom");
              }}
              className="bg-transparent text-white focus:outline-none text-[11px] cursor-pointer"
            />
            <span className="text-zinc-600">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setTimeframe("custom");
              }}
              className="bg-transparent text-white focus:outline-none text-[11px] cursor-pointer"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#C5A46D] hover:bg-[#b3925c] text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-md"
          >
            <Printer size={16} /> Scarica PDF / Stampa
          </button>
        </div>
      </header>

      {/* FOGLIO GIORNALE */}
      <main className="max-w-5xl mx-auto bg-white text-black p-8 sm:p-12 rounded-3xl shadow-2xl print:p-0 print:shadow-none print:rounded-none print:w-full">
        
        {/* INTESTAZIONE GIORNALE CON DATE */}
        <div className="border-b-4 border-black pb-4 mb-6 text-center">
          <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-widest text-zinc-600 border-b border-black pb-1 mb-3">
            <span>Edizione {timeframe === "week" ? "Settimanale" : timeframe === "month" ? "Mensile" : "Speciale"}</span>
            <span className="font-bold text-black">
              DAL {startDate ? new Date(startDate).toLocaleDateString("it-IT") : ""} AL {endDate ? new Date(endDate).toLocaleDateString("it-IT") : ""}
            </span>
            <span>Liceo Salvemini</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight uppercase">
            SALVEMINI TIMES
          </h1>
          <p className="text-xs italic font-serif mt-1 text-zinc-700">
            La voce indipendente degli studenti del Salvemini
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500 font-serif flex items-center justify-center gap-2">
            <Newspaper size={20} className="animate-pulse" /> Ricerca articoli nel periodo in corso...
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 font-serif space-y-2">
            <p className="text-base font-bold text-zinc-700">Nessun articolo pubblicato nel periodo selezionato.</p>
            <p className="text-xs text-zinc-500">Prova a cambiare l'intervallo di date nel menu in alto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* ARTICOLO PRINCIPALE (PRIMA PAGINA) */}
            <article className="md:col-span-2 border-b md:border-b-0 md:border-r border-zinc-300 pr-0 md:pr-8 pb-6 md:pb-0">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5">
                In Primo Piano
              </span>
              
              <h2 className="text-2xl sm:text-3xl font-serif font-bold mt-2 leading-tight">
                {articles[0].title}
              </h2>

              {articles[0].subtitle && (
                <p className="text-sm font-serif italic text-zinc-700 mt-1.5">{articles[0].subtitle}</p>
              )}

              {articles[0].cover_url && (
                <img
                  src={articles[0].cover_url}
                  alt={articles[0].title}
                  className="w-full h-64 object-cover my-4 rounded border border-zinc-200 shadow-sm"
                />
              )}

              <div
                className="text-xs leading-relaxed font-serif text-zinc-800 space-y-3 mt-3 [&>p]:mb-3 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mt-4 [&>strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: articles[0].content }}
              />

              <div className="text-[10px] font-mono mt-6 pt-3 border-t border-zinc-200 text-zinc-500 flex justify-between">
                <span>Redattore: <strong>{articles[0].profiles?.nickname || "Redazione"}</strong></span>
                <span>Pubblicato il: {new Date(articles[0].updated_at || articles[0].created_at).toLocaleDateString("it-IT")}</span>
              </div>
            </article>

            {/* COLONNA LATERALE (ALTRI ARTICOLI) */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest border-b-2 border-black pb-1">
                Altre Notizie
              </h3>

              {articles.slice(1).map((art) => (
                <article key={art.id} className="border-b border-zinc-200 pb-5 last:border-b-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                    {art.category || "Vita Scolastica"}
                  </span>
                  
                  <h4 className="text-base font-serif font-bold leading-snug mt-1.5">{art.title}</h4>
                  
                  {art.subtitle && (
                    <p className="text-xs font-serif italic text-zinc-600 mt-0.5 line-clamp-2">{art.subtitle}</p>
                  )}

                  {art.cover_url && (
                    <img
                      src={art.cover_url}
                      alt={art.title}
                      className="w-full h-32 object-cover my-2 rounded border border-zinc-200"
                    />
                  )}

                  <p className="text-xs font-serif text-zinc-700 line-clamp-3 mt-1 leading-normal">
                    {art.content?.replace(/<[^>]*>?/gm, "")}
                  </p>

                  <div className="text-[9px] font-mono mt-2 text-zinc-400 flex justify-between">
                    <span>Di {art.profiles?.nickname || "Redazione"}</span>
                    <span>{new Date(art.updated_at || art.created_at).toLocaleDateString("it-IT")}</span>
                  </div>
                </article>
              ))}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}