"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  ShieldAlert, 
  Trash2, 
  Flame, 
  Vote, 
  ArrowLeft, 
  Users, 
  FileText, 
  Eye, 
  PlusCircle, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Search,
  Check,
  Clock,
  Inbox,
  RefreshCw,
  Shield
} from "lucide-react";

export default function AdminPanelPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("articles");

  // Dati
  const [articles, setArticles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [feedbacksList, setFeedbacksList] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [creatingPoll, setCreatingPoll] = useState(false);

  // Filtri e Ricerca
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("all");

  // Statistiche
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalUsers: 0,
    totalFeedbacks: 0,
    unreadFeedbacks: 0,
  });

  const fetchAllData = useCallback(async () => {
    // 1. Articoli con profili autori (alias esplicito profiles:user_id)
    const { data: artData, error: artErr } = await supabase
      .from("articles")
      .select("*, profiles:user_id(id, nickname, avatar_url, role)")
      .order("created_at", { ascending: false });

    if (!artErr && artData) {
      setArticles(artData);
      const views = artData.reduce((acc, curr) => acc + (curr.views || 0), 0);
      setStats((prev) => ({ ...prev, totalArticles: artData.length, totalViews: views }));
    } else {
      const { data: fallbackArts } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (fallbackArts) setArticles(fallbackArts);
    }

    // 2. Utenti e Profili
    const { data: usrData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (usrData) {
      setUsersList(usrData);
      setStats((prev) => ({ ...prev, totalUsers: usrData.length }));
    }

    // 3. Sondaggio Attivo
    const { data: pollData } = await supabase
      .from("vox_populi")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (pollData) setActivePoll(pollData);

    // 4. Feedback
    const { data: fbData } = await supabase
      .from("feedback")
      .select("*, profiles:user_id(nickname, email)")
      .order("created_at", { ascending: false });

    if (fbData) {
      setFeedbacksList(fbData);
      const unread = fbData.filter((f) => !f.is_read).length;
      setStats((prev) => ({ 
        ...prev, 
        totalFeedbacks: fbData.length, 
        unreadFeedbacks: unread 
      }));
    }
  }, []);

  useEffect(() => {
    let channel;

    async function initAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (prof?.role !== "admin") {
        alert("⛔ Accesso riservato esclusivamente all'Amministratore.");
        return router.replace("/");
      }

      setIsAdmin(true);
      await fetchAllData();
      setLoading(false);

      // Nome canale univoco per evitare errori di rinnovo in Next.js Fast Refresh
      const channelName = `admin-live-${Math.random().toString(36).substring(2, 9)}`;

      channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => fetchAllData())
        .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, () => fetchAllData())
        .on("postgres_changes", { event: "*", schema: "public", table: "vox_populi" }, () => fetchAllData())
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAllData())
        .subscribe();
    }

    initAdmin();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router, fetchAllData]);

  // --- GESTIONE ARTICOLI ---
  async function toggleTrending(articleId, currentStatus) {
    await supabase.from("articles").update({ is_trending: false }).neq("id", articleId);
    await supabase.from("articles").update({ is_trending: !currentStatus }).eq("id", articleId);
    fetchAllData();
  }

  async function togglePublishStatus(articleId, currentStatus) {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    await supabase.from("articles").update({ status: newStatus }).eq("id", articleId);
    fetchAllData();
  }

  async function deleteArticle(articleId) {
    if (!confirm("⚠️ Eliminare definitivamente questo articolo?")) return;
    await supabase.from("articles").delete().eq("id", articleId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  }

  // --- GESTIONE UTENTI & RUOLI ---
  async function updateUserRole(userId, userEmail, newRole) {
    if (userEmail === "pierdavide.coppi@gmail.com") {
      alert("⛔ Non è possibile modificare il ruolo dell'Amministratore Principale.");
      return;
    }

    if (!confirm(`Confermi l'assegnazione del ruolo '${newRole.toUpperCase()}'?`)) return;

    // Aggiornamento ottimistico dello stato locale
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      alert("⚠️ Errore aggiornamento ruolo: " + error.message);
      fetchAllData();
    }
  }

  // --- GESTIONE FEEDBACK ---
  async function toggleFeedbackRead(feedbackId, currentStatus) {
    await supabase
      .from("feedback")
      .update({ is_read: !currentStatus })
      .eq("id", feedbackId);

    fetchAllData();
  }

  async function deleteFeedback(feedbackId) {
    if (!confirm("Eliminare definitivamente questo feedback?")) return;
    await supabase.from("feedback").delete().eq("id", feedbackId);
    fetchAllData();
  }

  // --- GESTIONE SONDAGGI ---
  async function createPoll(e) {
    e.preventDefault();
    if (!newPollQuestion.trim()) return;

    setCreatingPoll(true);
    await supabase.from("vox_populi").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");

    const { data, error } = await supabase.from("vox_populi").insert({
      question: newPollQuestion,
      yes_votes: 0,
      no_votes: 0,
      is_active: true,
    }).select().single();

    if (!error) {
      setNewPollQuestion("");
      setActivePoll(data);
      alert("✅ Nuovo sondaggio pubblicato con successo!");
      fetchAllData();
    } else {
      alert("⚠️ Errore creazione sondaggio: " + error.message);
    }
    setCreatingPoll(false);
  }

  const filteredArticles = useMemo(() => {
    return articles.filter((art) =>
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.profiles?.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  const filteredUsers = useMemo(() => {
    return usersList.filter((usr) =>
      usr.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      usr.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      usr.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [usersList, searchQuery]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacksList.filter((fb) => {
      const matchesFilter =
        feedbackFilter === "all"
          ? true
          : feedbackFilter === "unread"
          ? !fb.is_read
          : fb.is_read;
      const matchesSearch =
        fb.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fb.category?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [feedbacksList, feedbackFilter, searchQuery]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-zinc-400 font-mono text-xs">
        🛡️ Verifica credenziali di Amministrazione in corso...
      </div>
    );
  }

  const totalPollVotes = (activePoll?.yes_votes || 0) + (activePoll?.no_votes || 0);
  const yesPercent = totalPollVotes > 0 ? Math.round(((activePoll?.yes_votes || 0) / totalPollVotes) * 100) : 0;
  const noPercent = totalPollVotes > 0 ? 100 - yesPercent : 0;

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-24 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert size={22} className="text-[#C5A46D]" />
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Pannello di Controllo Admin
            </h1>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Realtime Active
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Controllo articoli, ruoli utenti, sondaggi e feedback anonimi sincronizzati in tempo reale.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white p-2 rounded-xl text-xs transition"
            title="Sincronizza Dati"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={() => router.push("/redazione")}
            className="bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
          >
            <PlusCircle size={15} /> ✍️ Scrivi come Admin
          </button>

          <button
            onClick={() => router.push("/")}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <ArrowLeft size={14} /> Home Page
          </button>
        </div>
      </div>

      {/* METRICHE */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Articoli</span>
            <FileText size={16} className="text-[#C5A46D]" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalArticles}</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Letture Totali</span>
            <Eye size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalViews}</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Utenti Registrati</span>
            <Users size={16} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Voti Sondaggio</span>
            <Vote size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalPollVotes}</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1 relative">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Feedback</span>
            <MessageSquare size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white flex items-center gap-2">
            {stats.totalFeedbacks}
            {stats.unreadFeedbacks > 0 && (
              <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {stats.unreadFeedbacks} nuovi
              </span>
            )}
          </p>
        </div>
      </div>

      {/* BARRA RICERCA */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
        <input
          type="text"
          placeholder="🔍 Cerca per titolo, autore, email o contenuto feedback..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900/80 border border-zinc-800 text-white placeholder-zinc-500 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-[#C5A46D] transition"
        />
      </div>

      {/* TABS SEZIONI */}
      <div className="flex border-b border-zinc-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("articles")}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "articles" ? "border-[#C5A46D] text-[#D4B47C]" : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <FileText size={15} /> Tutti gli Articoli ({filteredArticles.length})
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "users" ? "border-[#C5A46D] text-[#D4B47C]" : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Users size={15} /> Utenti & Ruoli ({filteredUsers.length})
        </button>

        <button
          onClick={() => setActiveTab("feedbacks")}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "feedbacks" ? "border-[#C5A46D] text-[#D4B47C]" : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <MessageSquare size={15} /> Feedback Anonimi ({filteredFeedbacks.length})
          {stats.unreadFeedbacks > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
        </button>

        <button
          onClick={() => setActiveTab("polls")}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === "polls" ? "border-[#C5A46D] text-[#D4B47C]" : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Vote size={15} /> Sondaggio Vox Populi
        </button>
      </div>

      {/* TAB 1: ARTICOLI */}
      {activeTab === "articles" && (
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="space-y-3">
            {filteredArticles.map((art) => (
              <div key={art.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-zinc-700 transition">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white text-base">{art.title}</h3>
                    {art.is_trending && (
                      <span className="text-[10px] bg-[#C5A46D]/20 text-[#D4B47C] border border-[#C5A46D]/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Flame size={10} /> In Evidenza
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      art.status === "published" ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/50" : "bg-amber-950/60 text-amber-400 border-amber-800/50"
                    }`}>
                      {art.status === "published" ? "Pubblicato" : "Bozza"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Sezione: <strong className="text-zinc-200">{art.category}</strong> • Autore: <strong className="text-zinc-200">{art.profiles?.nickname || "Redazione"}</strong> • Views: <strong className="text-[#C5A46D]">{art.views || 0}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => toggleTrending(art.id, art.is_trending)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      art.is_trending ? "bg-[#C5A46D] text-black font-bold" : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                    }`}
                  >
                    <Flame size={13} /> {art.is_trending ? "Evidenza Attiva" : "Metti in Evidenza"}
                  </button>

                  <button
                    onClick={() => togglePublishStatus(art.id, art.status)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {art.status === "published" ? <XCircle size={13} className="text-amber-400" /> : <CheckCircle2 size={13} className="text-emerald-400" />}
                    {art.status === "published" ? "Imposta Bozza" : "Pubblica Ora"}
                  </button>

                  <button
                    onClick={() => router.push(`/redazione?id=${art.id}`)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  >
                    Modifica
                  </button>

                  <button
                    onClick={() => deleteArticle(art.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl text-xs transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: UTENTI & RUOLI */}
      {activeTab === "users" && (
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="space-y-3">
            {filteredUsers.map((usr, index) => (
              <div key={usr.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-700 transition">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-zinc-500 w-6">#{index + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {usr.avatar_url ? (
                      <img src={usr.avatar_url} alt={usr.nickname} className="w-full h-full object-cover" />
                    ) : (
                      (usr.nickname || usr.email || "U")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{usr.nickname || "Utente Senza Nome"}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                        usr.role === "admin" ? "bg-red-950/80 text-red-400 border-red-800/80" :
                        usr.role === "caporedattore" ? "bg-purple-950/80 text-purple-300 border-purple-800/80" :
                        usr.role === "redattore" ? "bg-[#C5A46D]/20 text-[#D4B47C] border-[#C5A46D]/40" :
                        "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}>
                        {usr.role || "studente"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono">{usr.email || "Email non presente"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-zinc-500 mr-2">Ruolo:</span>
                  {usr.email === "pierdavide.coppi@gmail.com" ? (
                    <span className="bg-red-950/80 text-red-400 border border-red-800/80 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow">
                      <Shield size={13} /> Admin Principale (Protetto)
                    </span>
                  ) : (
                    <select
                      value={usr.role || "studente"}
                      onChange={(e) => updateUserRole(usr.id, usr.email, e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-xs font-bold text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#C5A46D] transition"
                    >
                      <option value="studente">🎓 Studente</option>
                      <option value="redattore">✍️ Redattore</option>
                      <option value="caporedattore">👑 Caporedattore</option>
                      <option value="admin">🛡️ Admin</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: FEEDBACK */}
      {activeTab === "feedbacks" && (
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-purple-400" /> Feedback Ricevuti in Tempo Reale
            </h2>

            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs self-start sm:self-auto">
              <button
                onClick={() => setFeedbackFilter("all")}
                className={`px-3 py-1 rounded-lg transition ${feedbackFilter === "all" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400 hover:text-white"}`}
              >
                Tutti ({feedbacksList.length})
              </button>
              <button
                onClick={() => setFeedbackFilter("unread")}
                className={`px-3 py-1 rounded-lg transition ${feedbackFilter === "unread" ? "bg-red-500 text-white font-bold" : "text-zinc-400 hover:text-white"}`}
              >
                Nuovi ({stats.unreadFeedbacks})
              </button>
              <button
                onClick={() => setFeedbackFilter("read")}
                className={`px-3 py-1 rounded-lg transition ${feedbackFilter === "read" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-white"}`}
              >
                Letti
              </button>
            </div>
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-zinc-950 rounded-2xl border border-zinc-800/80 space-y-2">
              <Inbox size={32} className="mx-auto text-zinc-600" />
              <p className="text-xs font-medium">Nessun feedback disponibile.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className={`border rounded-2xl p-4 transition space-y-3 ${
                    !fb.is_read ? "bg-purple-950/20 border-purple-800/50" : "bg-zinc-950 border-zinc-800/80 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase bg-[#C5A46D]/15 text-[#D4B47C] px-2.5 py-0.5 rounded-full border border-[#C5A46D]/30">
                        {fb.category || "Generale"}
                      </span>
                      {!fb.is_read && (
                        <span className="text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                          NUOVO
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(fb.created_at).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-200 leading-relaxed">{fb.content}</p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-zinc-500 italic">
                      Inviato da: {fb.profiles?.nickname ? `Studente (${fb.profiles.nickname})` : "Anonimo"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFeedbackRead(fb.id, fb.is_read)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          fb.is_read ? "bg-zinc-800 text-zinc-400 hover:text-white" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        <Check size={13} />
                        {fb.is_read ? "Segna come non letto" : "Segna come letto"}
                      </button>

                      <button
                        onClick={() => deleteFeedback(fb.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: SONDAGGIO */}
      {activeTab === "polls" && (
        <section className="space-y-6">
          {activePoll && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-[#C5A46D] bg-[#C5A46D]/10 px-3 py-1 rounded-full border border-[#C5A46D]/30">
                  Sondaggio Attivo
                </span>
                <span className="text-xs text-zinc-400 font-mono">Totale Voti: {totalPollVotes}</span>
              </div>

              <h3 className="text-xl font-bold text-white">{activePoll.question}</h3>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">SÌ: {activePoll.yes_votes} ({yesPercent}%)</span>
                  <span className="text-red-400">NO: {activePoll.no_votes} ({noPercent}%)</span>
                </div>
                <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
                  <div style={{ width: `${yesPercent}%` }} className="bg-emerald-500 transition-all duration-500" />
                  <div style={{ width: `${noPercent}%` }} className="bg-red-500 transition-all duration-500" />
                </div>
              </div>
            </div>
          )}

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Vote size={18} className="text-[#C5A46D]" /> Lancia un Nuovo Sondaggio
            </h2>

            <form onSubmit={createPoll} className="space-y-3">
              <input
                type="text"
                required
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                placeholder="Inserisci la domanda del sondaggio..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
              />
              <button
                type="submit"
                disabled={creatingPoll}
                className="bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-6 py-2.5 rounded-xl text-xs transition disabled:opacity-50"
              >
                {creatingPoll ? "Pubblicazione..." : "🚀 Pubblica Sondaggio"}
              </button>
            </form>
          </div>
        </section>
      )}

    </div>
  );
}