"use client";

import { useEffect, useState } from "react";
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
  BarChart3, 
  CheckCircle2, 
  XCircle,
  Award,
  UserCheck,
  UserX
} from "lucide-react";

export default function AdminPanelPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("articles"); // 'articles' | 'users' | 'polls' | 'stats'

  // Dati
  const [articles, setArticles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [creatingPoll, setCreatingPoll] = useState(false);

  // Statistiche
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    async function checkAdmin() {
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
    }

    checkAdmin();
  }, [router]);

  async function fetchAllData() {
    // 1. Articoli con profili autori
    const { data: artData } = await supabase
      .from("articles")
      .select("*, profiles(id, nickname, avatar_url, role)")
      .order("created_at", { ascending: false });

    if (artData) {
      setArticles(artData);
      const views = artData.reduce((acc, curr) => acc + (curr.views || 0), 0);
      setStats((prev) => ({ ...prev, totalArticles: artData.length, totalViews: views }));
    }

    // 2. Utenti e Classifica
    const { data: usrData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (usrData) {
      setUsersList(usrData);
      setStats((prev) => ({ ...prev, totalUsers: usrData.length }));
    }

    // 3. Sondaggio Attivo Vox Populi
    const { data: pollData } = await supabase
      .from("vox_populi")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (pollData) setActivePoll(pollData);
  }

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
    if (!confirm("⚠️ Amministratore: eliminare definitivamente questo articolo?")) return;
    await supabase.from("articles").delete().eq("id", articleId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  }

  // --- GESTIONE UTENTI E RUOLI ---
  async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === "admin" ? "student" : "admin";
    if (!confirm(`Cambiare il ruolo dell'utente in '${newRole.toUpperCase()}'?`)) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (!error) {
      fetchAllData();
    } else {
      alert("⚠️ Errore aggiornamento ruolo: " + error.message);
    }
  }

  // --- GESTIONE SONDAGGI VOX POPULI ---
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
    } else {
      alert("⚠️ Errore creazione sondaggio: " + error.message);
    }
    setCreatingPoll(false);
  }

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
      
      {/* HEADER PANNELLO ADMIN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-[#C5A46D]" />
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Pannello di Controllo Caporedattore
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Gestisci articoli, moderazione contenuti, sondaggi della scuola e ruoli degli utenti.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/redazione")}
            className="bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-[#C5A46D]/15 transition"
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

      {/* METRICHE E ANALYTICS DI BORDO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Articoli Pubblicati</span>
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
            <span>Autori & Utenti</span>
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
      </div>

      {/* TABS SEZIONI ADMIN */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("articles")}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "articles"
              ? "border-[#C5A46D] text-[#D4B47C]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <FileText size={15} /> Tutti gli Articoli ({articles.length})
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "users"
              ? "border-[#C5A46D] text-[#D4B47C]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Users size={15} /> Utenti & Classifica ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab("polls")}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "polls"
              ? "border-[#C5A46D] text-[#D4B47C]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Vote size={15} /> Sondaggio Vox Populi
        </button>
      </div>

      {/* TAB 1: GESTIONE COMPLETA ARTICOLI */}
      {activeTab === "articles" && (
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Gestione e Moderazione Articoli
            </h2>
            <span className="text-xs text-zinc-500">I tuoi articoli prodotti da Admin sono regolarmente pubblicati nei feed.</span>
          </div>

          <div className="space-y-3">
            {articles.map((art) => (
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
                      art.status === "published"
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
                        : "bg-amber-950/60 text-amber-400 border-amber-800/50"
                    }`}>
                      {art.status === "published" ? "Pubblicato" : "Bozza"}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400">
                    Sezione: <strong className="text-zinc-200">{art.category}</strong> • Autore: <strong className="text-zinc-200">{art.profiles?.nickname || "Caporedattore"}</strong> ({art.profiles?.role || "user"}) • Views: <strong className="text-[#C5A46D]">{art.views || 0}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  {/* METTI / TOGLI IN EVIDENZA */}
                  <button
                    onClick={() => toggleTrending(art.id, art.is_trending)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      art.is_trending
                        ? "bg-[#C5A46D] text-black font-bold"
                        : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Flame size={13} /> {art.is_trending ? "Evidenza Attiva" : "Metti in Evidenza"}
                  </button>

                  {/* PUBBLICA / NASCONDI */}
                  <button
                    onClick={() => togglePublishStatus(art.id, art.status)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {art.status === "published" ? <XCircle size={13} className="text-amber-400" /> : <CheckCircle2 size={13} className="text-emerald-400" />}
                    {art.status === "published" ? "Imposta Bozza" : "Pubblica Ora"}
                  </button>

                  {/* MODIFICA */}
                  <button
                    onClick={() => router.push(`/redazione?id=${art.id}`)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  >
                    Modifica
                  </button>

                  {/* ELIMINA */}
                  <button
                    onClick={() => deleteArticle(art.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl text-xs transition"
                    title="Elimina articolo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: GESTIONE UTENTI & CLASSIFICA */}
      {activeTab === "users" && (
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-[#C5A46D]" /> Utenti Registrati e Ruoli
            </h2>
            <span className="text-xs text-zinc-500">I tuoi articoli da Admin incrementano la tua presenza in Classifica.</span>
          </div>

          <div className="space-y-3">
            {usersList.map((usr, index) => (
              <div key={usr.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-zinc-500 w-6">#{index + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center font-bold text-white text-sm">
                    {usr.avatar_url ? (
                      <img src={usr.avatar_url} alt={usr.nickname} className="w-full h-full object-cover" />
                    ) : (
                      (usr.nickname || "U")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{usr.nickname || "Utente Senza Nome"}</p>
                      {usr.role === "admin" && (
                        <span className="text-[9px] bg-[#C5A46D]/20 text-[#D4B47C] border border-[#C5A46D]/30 px-2 py-0.5 rounded-full font-bold">
                          Caporedattore Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">ID: {usr.id.slice(0, 8)}... • Ruolo attuale: <span className="text-zinc-300 font-mono">{usr.role}</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleUserRole(usr.id, usr.role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      usr.role === "admin"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {usr.role === "admin" ? <UserX size={13} /> : <UserCheck size={13} />}
                    {usr.role === "admin" ? "Retrocedi a Studente" : "Promuovi ad Admin"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: SONDAGGIO VOX POPULI */}
      {activeTab === "polls" && (
        <section className="space-y-6">
          {/* STATO SONDAGGIO CORRENTE */}
          {activePoll && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-[#C5A46D] bg-[#C5A46D]/10 px-3 py-1 rounded-full border border-[#C5A46D]/30">
                  Sondaggio Attualmente Attivo
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

          {/* CREA NUOVO SONDAGGIO */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Vote size={18} className="text-[#C5A46D]" /> Lancia un Nuovo Sondaggio Vox Populi
            </h2>
            <p className="text-xs text-zinc-400">
              La creazione di un nuovo sondaggio disattiverà automaticamente quello precedente.
            </p>

            <form onSubmit={createPoll} className="space-y-3">
              <input
                type="text"
                required
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                placeholder="Es. Siete d'accordo con l'orario prolungato della biblioteca scolastica?"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#C5A46D]"
              />
              <button
                type="submit"
                disabled={creatingPoll}
                className="bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-6 py-2.5 rounded-xl text-xs transition disabled:opacity-50"
              >
                {creatingPoll ? "Pubblicazione..." : "🚀 Pubblica Nuovo Sondaggio"}
              </button>
            </form>
          </div>
        </section>
      )}

    </div>
  );
}