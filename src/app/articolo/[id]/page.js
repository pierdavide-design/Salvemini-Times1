"use client";

import { useEffect, useState, use, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { ArrowLeft, Eye, Calendar, User, Printer, Trash2, Send, Sparkles, Tag, ShieldCheck } from "lucide-react";

// Generatore ID Univoco Dispositivo
function getDeviceId() {
  if (typeof window === "undefined") return "server-id";
  let deviceId = localStorage.getItem("salvemini_device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("salvemini_device_id", deviceId);
  }
  return deviceId;
}

function ArticleDetailContent({ params }) {
  const resolvedParams = use(params);
  const articleId = resolvedParams?.id;
  const router = useRouter();

  const [article, setArticle] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [articleNotFound, setArticleNotFound] = useState(false);

  // Rif per impedire conteggi doppi dovuti al React Strict Mode
  const viewIncremented = useRef(false);

  // Reazioni Emoji
  const [reactions, setReactions] = useState({ fire: 0, mindblown: 0, clap: 0, heart: 0, lightbulb: 0 });
  const [userReactions, setUserReactions] = useState({});

  // Commenti
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // 1. CARICAMENTO DATI PRINCIPALI
  useEffect(() => {
    async function loadData() {
      if (!articleId) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUser(session?.user ?? null);

        // Caricamento Articolo con Fallback e magariSingola (evita crash se 0 risultati)
        let { data: artData, error: artError } = await supabase
          .from("articles")
          .select("*, profiles(nickname, avatar_url, role)")
          .eq("id", articleId)
          .maybeSingle();

        // Se il JOIN fallisce, tentiamo il fallback sui dati base
        if (artError || !artData) {
          console.warn("⚠️ Recupero dati autore fallito, tento il fallback dell'articolo...");
          const { data: fallbackArtData } = await supabase
            .from("articles")
            .select("*")
            .eq("id", articleId)
            .maybeSingle();
            
          artData = fallbackArtData;
        }

        // Se proprio non esiste, mostriamo l'errore senza chiudere bruscamente la pagina
        if (!artData) {
          setArticleNotFound(true);
          return;
        }
        
        setArticle(artData);
        fetchReactions();
        fetchComments();

      } catch (err) {
        console.error("❌ Eccezione grave durante il caricamento:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [articleId]);

  // 2. SISTEMA DI VISUALIZZAZIONI A RITARDO (Evita spam e doppi incrementi)
  useEffect(() => {
    if (!articleId || articleNotFound) return;

    // L'utente deve stare sulla pagina almeno 5 secondi per contare la visualizzazione
    const timer = setTimeout(() => {
      if (!viewIncremented.current) {
        supabase.rpc("increment_article_views", { p_article_id: articleId })
          .then(() => { viewIncremented.current = true; })
          .catch(() => console.warn("Contatore views RPC non presente."));
      }
    }, 5000); 

    // Se l'utente esce prima dei 5 secondi, annulliamo l'incremento
    return () => clearTimeout(timer);
  }, [articleId, articleNotFound]);

  // RECUPERO REAZIONI
  const fetchReactions = async () => {
    if (!articleId) return;
    const { data } = await supabase
      .from("article_reactions")
      .select("emoji, device_id")
      .eq("article_id", articleId);

    if (data) {
      const deviceId = getDeviceId();
      const counts = { fire: 0, mindblown: 0, clap: 0, heart: 0, lightbulb: 0 };
      const userActive = {};

      data.forEach((r) => {
        if (counts[r.emoji] !== undefined) counts[r.emoji]++;
        if (r.device_id === deviceId) userActive[r.emoji] = true;
      });

      setReactions(counts);
      setUserReactions(userActive);
    }
  };

  // RECUPERO COMMENTI
  const fetchComments = async () => {
    if (!articleId) return;
    
    let { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("*, profiles(nickname, avatar_url)")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true });

    if (commentsError || !commentsData) {
      const { data: fallbackComments } = await supabase
        .from("comments")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true });
        
      commentsData = fallbackComments;
    }

    if (commentsData) setComments(commentsData);
  };

  // SISTEMA LIKE A SCELTA SINGOLA (Stile Sondaggio)
  const handleToggleReaction = async (emojiType) => {
    const deviceId = getDeviceId();
    
    // Controlla se il dispositivo ha già un'altra reazione attiva
    const activeEmoji = Object.keys(userReactions).find(e => userReactions[e]);

    // Se clicchi un like diverso, prima rimuovo quello vecchio
    if (activeEmoji && activeEmoji !== emojiType) {
      await supabase.rpc("toggle_article_reaction", {
        p_article_id: articleId,
        p_device_id: deviceId,
        p_emoji: activeEmoji,
      });
    }

    // Aggiungi (o rimuovi se hai ricliccato lo stesso) il nuovo like
    const { data } = await supabase.rpc("toggle_article_reaction", {
      p_article_id: articleId,
      p_device_id: deviceId,
      p_emoji: emojiType,
    });

    if (data) fetchReactions();
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("⚠️ Per commentare devi aver effettuato l'accesso!");
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const { error } = await supabase.from("comments").insert({
      article_id: articleId,
      user_id: currentUser.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment("");
      fetchComments();
    } else {
      alert("⚠️ Errore invio commento: " + error.message);
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Vuoi rimuovere questo commento?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      alert("⚠️ Impossibile eliminare il commento: " + error.message);
    }
  };

  // RENDERIZZATORE TESTO
  const renderContent = (contentStr) => {
    if (!contentStr) return null;

    const isHtml = /<[a-z][\s\S]*>/i.test(contentStr);

    if (isHtml) {
      return (
        <div
          className="prose prose-invert max-w-none leading-relaxed text-zinc-200 text-base sm:text-lg
            [&>p]:mb-5 [&>h2]:text-2xl [&>h2]:font-serif [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:text-[#C5A46D] 
            [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-3 
            [&>strong]:font-extrabold [&>strong]:text-white 
            [&>blockquote]:border-l-4 [&>blockquote]:border-[#C5A46D] [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-6 [&>blockquote]:text-zinc-300
            [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-5 [&>figure]:my-6 [&>figure>img]:rounded-2xl [&>figure>img]:mx-auto [&>figure>img]:max-h-[500px]"
          dangerouslySetInnerHTML={{ __html: contentStr }}
        />
      );
    }

    return contentStr.split('\n').map((line, idx) => {
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-serif font-bold text-[#C5A46D] mt-8 mb-4 border-b border-zinc-800 pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={idx} className="border-l-4 border-[#C5A46D] pl-4 text-zinc-300 italic my-6 text-lg bg-zinc-900/40 p-4 rounded-r-2xl">{line.replace('> ', '')}</blockquote>;
      }
      if (line.startsWith('• ')) {
        return <li key={idx} className="ml-4 list-disc marker:text-[#C5A46D] text-zinc-300 mb-2">{line.replace('• ', '')}</li>;
      }
      const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        return (
          <div key={idx} className="my-8 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl print:my-4">
            <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto object-cover max-h-[500px]" />
            {imgMatch[1] && <p className="text-center text-xs text-zinc-400 p-2 italic bg-zinc-950">{imgMatch[1]}</p>}
          </div>
        );
      }
      if (line.trim() === '') return <br key={idx} />;
      return <p key={idx} className="mb-4 leading-relaxed text-zinc-200 text-lg print:text-black print:text-base">{line}</p>;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-zinc-400">
        <div className="w-6 h-6 border-2 border-[#C5A46D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // GESTIONE ERRORE SENZA REDIRECT FORZATO
  if (articleNotFound || !article) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-zinc-400 gap-4">
        <p className="text-sm">⚠️ Questo articolo non esiste oppure non è ancora pubblico.</p>
        <Link href="/" className="text-[#C5A46D] font-bold hover:underline text-xs flex items-center gap-2">
          <ArrowLeft size={16} /> Torna alla Home
        </Link>
      </div>
    );
  }

  const isArticleAuthor = currentUser?.id === article.user_id;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 pb-24 print:bg-white print:text-black">
      
      {/* HEADER TOP BAR */}
      <header className="h-16 border-b border-zinc-800 bg-[#0A0A0A]/90 backdrop-blur sticky top-0 z-30 px-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft size={16} /> Torna indietro
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Versione Stampabile"
          >
            <Printer size={15} /> Stampa / PDF
          </button>
          <Link href="/">
            <span className="font-serif font-bold text-[#C5A46D] text-lg">Salvemini Times</span>
          </Link>
        </div>
      </header>

      {/* HEADER DI STAMPA */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-serif font-bold uppercase tracking-widest">SALVEMINI TIMES</h1>
        <p className="text-xs italic font-serif">La voce libera degli studenti</p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* INTESTAZIONE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#C5A46D]/15 text-[#D4B47C] border border-[#C5A46D]/30 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:border-black print:text-black">
              <Tag size={12} /> {article.category || "Generale"}
            </span>

            {article.is_trending && (
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full">
                🔥 In Evidenza
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white leading-tight print:text-black">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-lg sm:text-xl font-serif text-[#C5A46D] italic print:text-zinc-800">
              {article.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 print:text-black print:border-black">
            <div className="flex items-center gap-2">
              <User size={14} className="text-[#C5A46D]" />
              <span className="text-zinc-200 font-semibold flex items-center gap-1 print:text-black">
                {article.profiles?.nickname || "Redazione"}
                {article.profiles?.role === "admin" && (
                  <ShieldCheck size={14} className="text-[#C5A46D]" title="Caporedattore Admin" />
                )}
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{new Date(article.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 print:hidden">
              <Eye size={14} className="text-[#C5A46D]" />
              <span>{article.views || 1} visualizzazioni</span>
            </div>
          </div>
        </div>

        {/* COPERTINA */}
        {article.cover_url && (
          <div className="w-full h-80 sm:h-[420px] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative print:h-64">
            <img src={article.cover_url} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* CONTENUTO ARTICOLO */}
        <article className="bg-[#111111] border border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none">
          {renderContent(article.content)}
        </article>

        {/* REAZIONI EMOJI (Scelta Singola) */}
        <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 space-y-3 print:hidden">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A46D] flex items-center gap-2">
            <Sparkles size={14} /> Lascia una Reazione
          </h3>

          <div className="flex flex-wrap gap-3">
            {[
              { type: "fire", icon: "🔥", label: "Super" },
              { type: "mindblown", icon: "🤯", label: "Shock" },
              { type: "clap", icon: "👏", label: "Bravo" },
              { type: "heart", icon: "❤️", label: "Love" },
              { type: "lightbulb", icon: "💡", label: "Geniale" },
            ].map((emo) => {
              const count = reactions[emo.type] || 0;
              const isActive = userReactions[emo.type];

              return (
                <button
                  key={emo.type}
                  onClick={() => handleToggleReaction(emo.type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition border ${
                    isActive
                      ? "bg-[#C5A46D] text-black border-[#C5A46D]"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <span>{emo.icon}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SEZIONE COMMENTI */}
        <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6 print:hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              💬 Discussione ({comments.length})
            </h3>
            {isArticleAuthor && (
              <span className="text-xs bg-[#C5A46D]/15 text-[#D4B47C] border border-[#C5A46D]/30 px-3 py-1 rounded-full font-semibold hidden sm:inline-block">
                👑 Sei il Moderatore
              </span>
            )}
          </div>

          {/* FORM NUOVO COMMENTO */}
          {currentUser ? (
            <form onSubmit={handleAddComment} className="flex gap-3">
              <input
                type="text"
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Aggiungi una riflessione pubblica..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
              />
              <button
                type="submit"
                disabled={submittingComment}
                className="bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-5 rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Send size={14} /> Invio
              </button>
            </form>
          ) : (
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-xs text-zinc-400">
              <Link href="/login" className="text-[#C5A46D] font-bold underline">Accedi</Link> per partecipare alla discussione.
            </div>
          )}

          {/* LISTA COMMENTI */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Nessun commento presente. Sii il primo a esprimere la tua opinione!</p>
            ) : (
              comments.map((com) => {
                const isCommentAuthor = currentUser?.id === com.user_id;
                const canDelete = isCommentAuthor || isArticleAuthor;

                return (
                  <div key={com.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4B47C] to-[#806432] text-black font-bold flex items-center justify-center text-xs shrink-0">
                        {com.profiles?.nickname?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{com.profiles?.nickname || "Studente"}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(com.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-zinc-300 mt-1">{com.content}</p>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(com.id)}
                        className="text-zinc-500 hover:text-red-400 p-1.5 transition"
                        title={isArticleAuthor ? "Rimuovi commento (Moderatore Articolo)" : "Elimina il tuo commento"}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default function ArticleDetailPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-zinc-400">
          <div className="w-6 h-6 border-2 border-[#C5A46D] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ArticleDetailContent params={params} />
    </Suspense>
  );
}