"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ProfiloPage() {
  const router = useRouter();
  
  // Dati Utente & Profilo da Supabase
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("studente");
  
  // Dati Articoli
  const [articles, setArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'published' | 'draft'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  
  // Stati di caricamento
  const [loading, setLoading] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);
  
  // Modale Modifica Profilo
  const [showEditModal, setShowEditModal] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newBio, setNewBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;

        if (!isMounted) return;

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
        setEmail(currentUser.email ?? "");
        
        // Recupera profilo reale e dinamico dalla tabella 'profiles'
        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        const currentNick = profData?.nickname || currentUser.user_metadata?.nickname || currentUser.email?.split("@")[0] || "Utente";
        const currentAvatar = profData?.avatar_url || currentUser.user_metadata?.avatar_url || "";
        const currentBio = profData?.bio || currentUser.user_metadata?.bio || "Membro della community di Salvemini Times.";
        
        // Controllo email admin principale + ruolo DB
        const isMainAdmin = currentUser.email?.toLowerCase() === "pierdavide.coppi@gmail.com";
        const rawRole = profData?.role?.toLowerCase()?.trim() || "studente";
        const currentRole = isMainAdmin ? "admin" : (rawRole === "user" ? "studente" : rawRole);

        setNickname(currentNick);
        setAvatarUrl(currentAvatar);
        setBio(currentBio);
        setRole(currentRole);
        
        setNewNickname(currentNick);
        setNewAvatarUrl(currentAvatar);
        setNewBio(currentBio);
        setLoading(false);

        fetchUserArticles(currentUser.id);
      } catch {
        if (isMounted) router.replace("/login");
      }
    }

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Caricamento Articoli da Supabase
  async function fetchUserArticles(userId) {
    setLoadingArticles(true);
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setArticles(data);
      }
    } catch (err) {
      console.error("Errore recupero articoli:", err);
    } finally {
      setLoadingArticles(false);
    }
  }

  // Salvataggio Modifica Profilo dinamico su Supabase
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);

    try {
      // 1. Aggiorna la tabella 'profiles'
      const { error: profError } = await supabase
        .from("profiles")
        .update({
          nickname: newNickname,
          avatar_url: newAvatarUrl,
          bio: newBio,
        })
        .eq("id", user.id);

      // 2. Sincronizza i metadati di autenticazione
      await supabase.auth.updateUser({
        data: {
          nickname: newNickname,
          avatar_url: newAvatarUrl,
          bio: newBio,
        },
      });

      if (profError) {
        alert("⚠️ Errore aggiornamento profilo: " + profError.message);
      } else {
        setNickname(newNickname);
        setAvatarUrl(newAvatarUrl);
        setBio(newBio);
        setShowEditModal(false);
      }
    } catch {
      alert("⚠️ Impossibile salvare le modifiche.");
    } finally {
      setSavingProfile(false);
    }
  }

  // Eliminazione Articolo
  async function handleDeleteArticle(articleId) {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questo articolo?")) return;

    try {
      const { error } = await supabase.from("articles").delete().eq("id", articleId);

      if (error) {
        alert("⚠️ Errore nell'eliminazione: " + error.message);
      } else {
        setArticles((prev) => prev.filter((art) => art.id !== articleId));
      }
    } catch {
      alert("⚠️ Impossibile eliminare l'articolo.");
    }
  }

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (!error) router.replace("/login");
  }

  // Mappatura dinamica delle etichette del ruolo (con supporto per 'user' e 'admin')
  const roleBadgeMap = {
    admin: { label: "Amministratore", icon: "🛡️", color: "bg-red-950/80 text-red-300 border-red-800/80" },
    caporedattore: { label: "Caporedattore", icon: "👑", color: "bg-purple-950/80 text-purple-300 border-purple-800/80" },
    redattore: { label: "Redattore", icon: "✍️", color: "bg-[#C5A46D]/15 text-[#D4B47C] border-[#C5A46D]/30" },
    studente: { label: "Studente", icon: "🎓", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
    user: { label: "Studente", icon: "🎓", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  };

  const currentRoleBadge = roleBadgeMap[role] || roleBadgeMap.studente;

  // Filtro articoli in base a tab e ricerca
  const filteredArticles = articles.filter((art) => {
    const matchesTab =
      filterTab === "all"
        ? true
        : filterTab === "published"
        ? art.status === "published"
        : art.status === "draft";
    const matchesSearch = art.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const publishedCount = articles.filter((a) => a.status === "published").length;
  const draftCount = articles.filter((a) => a.status === "draft").length;
  const initialLetter = nickname ? nickname[0].toUpperCase() : "U";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-zinc-400">
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-2xl shadow-xl">
          <div className="w-5 h-5 border-2 border-[#C5A46D] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Caricamento Area Profilo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      
      {/* BARRA NAVIGAZIONE SUPERIORE */}
      <nav className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
          >
            <span>🏠</span>
            <span>Torna alla Home</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 border-l border-zinc-800 pl-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Profilo Utente Attivo</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-serif italic text-[#C5A46D] tracking-wide hidden sm:inline">
            Salvemini Times Editorial
          </span>
        </div>
      </nav>

      {/* HERO PROFILO EDITORIALE DINAMICO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A46D]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Avatar e Dati Personali */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nickname}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#C5A46D]/40 shadow-xl shadow-[#C5A46D]/10"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#D4B47C] via-[#B89659] to-[#806432] flex items-center justify-center text-black text-4xl font-black shadow-xl shadow-[#C5A46D]/20">
                  {initialLetter}
                </div>
              )}
              
              <button
                onClick={() => setShowEditModal(true)}
                className="absolute -bottom-2 -right-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 p-2 rounded-xl text-xs shadow-lg transition"
                title="Modifica Foto"
              >
                📷
              </button>
            </div>

            <div className="space-y-2 max-w-lg">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {nickname}
                </h1>
                
                {/* Badge Ruolo Dinamico */}
                <span className={`${currentRoleBadge.color} px-3 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 border`}>
                  <span>{currentRoleBadge.icon}</span> {currentRoleBadge.label}
                </span>
              </div>

              <p className="text-xs text-zinc-400 font-mono">{email}</p>
              
              <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2 pt-1">
                {bio}
              </p>
            </div>
          </div>

          {/* Azioni Rapide */}
          <div className="flex flex-wrap lg:flex-col gap-3 self-start lg:self-center w-full lg:w-auto">
            {/* Se Admin, mostra anche l'accesso diretto al Pannello Admin */}
            {role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold px-6 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                <span>🛡️</span>
                <span>Pannello Amministratore</span>
              </button>
            )}

            <button
              onClick={() => router.push("/redazione")}
              className="flex-1 lg:flex-none bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-6 py-3.5 rounded-xl transition-all shadow-xl shadow-[#C5A46D]/15 flex items-center justify-center gap-2 text-sm"
            >
              <span>🚀</span>
              <span>Scrivi Nuovo Articolo</span>
            </button>

            <div className="flex gap-2 flex-1 lg:flex-none">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 px-4 py-2.5 rounded-xl transition text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span>✏️</span> Modifica Profilo
              </button>

              <button
                onClick={handleLogout}
                className="bg-zinc-900 hover:bg-red-500/20 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 text-zinc-400 px-4 py-2.5 rounded-xl transition text-xs font-semibold"
              >
                Logout
              </button>
            </div>
          </div>

        </div>

        {/* BARRA PROGRESSO ESPERIENZA */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <span>⚡</span> Ruolo Attivo: <strong className="text-white">{currentRoleBadge.label}</strong>
            </span>
            <span className="text-[#D4B47C]">{publishedCount} Articoli Pubblicati</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-[#997B45] to-[#D4B47C] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, publishedCount * 10)}%` }}
            />
          </div>
        </div>
      </section>

      {/* METRICHE E STATISTICHE EDITORIALI */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Articoli Pubblicati", value: publishedCount, icon: "📰", trend: "Contenuti approvati", color: "from-amber-500/10" },
          { label: "Bozze in Lavorazione", value: draftCount, icon: "📝", trend: "Pronte da completare", color: "from-blue-500/10" },
          { label: "Visualizzazioni Totali", value: articles.reduce((acc, a) => acc + (a.views || 0), 0), icon: "👁️", trend: "Lettori attivi", color: "from-emerald-500/10" },
          { label: "Tasso Apprezzamento", value: "98%", icon: "❤️", trend: "Feedback della community", color: "from-purple-500/10" },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.color} to-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition-all`}
          >
            <div className="flex justify-between items-start">
              <span className="text-2xl p-2 bg-zinc-950/80 rounded-xl border border-zinc-800">{stat.icon}</span>
              <span className="text-[10px] text-zinc-500 font-medium bg-zinc-950/60 px-2 py-1 rounded-md border border-zinc-800">{stat.trend}</span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</h3>
              <p className="text-xs text-zinc-400 mt-1 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* SEZIONE GESTIONE ARTICOLI PUBBLICATI E BOZZE */}
      <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-md">
        
        {/* Intestazione Sezione e Controlli */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📰</span> Gestione Articoli Personali
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Filtra, cerca e gestisci le tue pubblicazioni su Salvemini Times.
            </p>
          </div>

          {/* Filtri Tab e Barra di Ricerca */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Cerca per titolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A46D]"
              />
            </div>

            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 rounded-lg transition ${
                  filterTab === "all" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tutti ({articles.length})
              </button>
              <button
                onClick={() => setFilterTab("published")}
                className={`px-3 py-1 rounded-lg transition ${
                  filterTab === "published" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Pubblicati ({publishedCount})
              </button>
              <button
                onClick={() => setFilterTab("draft")}
                className={`px-3 py-1 rounded-lg transition ${
                  filterTab === "draft" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Bozze ({draftCount})
              </button>
            </div>

            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs hidden sm:flex">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2 py-1 rounded-lg ${viewMode === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
                title="Vista a Griglia"
              >
                🔲
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-2 py-1 rounded-lg ${viewMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
                title="Vista a Lista"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* LISTA ARTICOLI */}
        {loadingArticles ? (
          <div className="text-center py-12 text-zinc-500 text-sm flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#C5A46D] border-t-transparent rounded-full animate-spin" />
            Caricamento del tuo archivio...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16 bg-zinc-950/40 rounded-3xl border border-zinc-800/80 space-y-4">
            <span className="text-5xl block">✍️</span>
            <div className="space-y-1">
              <h3 className="text-white font-bold text-base">Nessun articolo trovato</h3>
              <p className="text-zinc-500 text-xs">
                {searchQuery
                  ? "Nessun risultato per la ricerca impostata."
                  : "Non hai ancora contenuti in questa sezione."}
              </p>
            </div>
            <button
              onClick={() => router.push("/redazione")}
              className="bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-6 py-2.5 rounded-xl text-xs transition"
            >
              Scrivi un nuovo articolo ora
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map((art) => (
              <div
                key={art.id}
                className="bg-zinc-950/90 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all shadow-lg"
              >
                <div>
                  <div className="relative h-44 bg-zinc-900 border-b border-zinc-800 overflow-hidden">
                    {art.cover_url ? (
                      <img
                        src={art.cover_url}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-700">
                        📄
                      </div>
                    )}

                    <span
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow-md ${
                        art.status === "published"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {art.status === "published" ? "Pubblicato" : "Bozza"}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(art.created_at).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    
                    <h3 className="font-bold text-white text-lg line-clamp-2 group-hover:text-[#D4B47C] transition-colors leading-snug">
                      {art.title || "Senza Titolo"}
                    </h3>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between gap-2 border-t border-zinc-900/80 mt-4">
                  <button
                    onClick={() => router.push(`/redazione?id=${art.id}`)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 py-2 rounded-xl text-xs font-semibold transition text-center"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(art.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl text-xs transition"
                    title="Elimina articolo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((art) => (
              <div
                key={art.id}
                className="bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition"
              >
                <div className="flex items-center gap-4">
                  {art.cover_url ? (
                    <img
                      src={art.cover_url}
                      alt={art.title}
                      className="w-16 h-16 rounded-xl object-cover border border-zinc-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
                      📄
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base line-clamp-1">
                      {art.title || "Senza Titolo"}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{new Date(art.created_at).toLocaleDateString("it-IT")}</span>
                      <span>•</span>
                      <span className={art.status === "published" ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                        {art.status === "published" ? "Pubblicato" : "Bozza"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => router.push(`/redazione?id=${art.id}`)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(art.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl text-xs transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* MODALE DI MODIFICA PROFILO */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProfile}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative"
          >
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Personalizza Profilo
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Nickname / Nome del Redattore
                </label>
                <input
                  type="text"
                  required
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
                  placeholder="Es. Mario Rossi"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  URL Foto Profilo (Avatar)
                </label>
                <input
                  type="url"
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
                  placeholder="https://immagine.com/avatar.jpg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Biografia Personale
                </label>
                <textarea
                  rows={3}
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#C5A46D] resize-none"
                  placeholder="Racconta brevemente di cosa ti piace scrivere..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-[#C5A46D] hover:bg-[#b5935c] text-black px-6 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {savingProfile ? "Salvataggio..." : "Salva Profilo"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}