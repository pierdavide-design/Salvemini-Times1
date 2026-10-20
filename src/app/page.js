"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  Menu,
  Search,
  Flame,
  School,
  Cpu,
  Vote,
  MessageSquare,
  Heart,
  Calendar,
  Gamepad2,
  Music,
  Film,
  Trophy,
  User,
  Medal,
  Newspaper,
  ChevronRight,
  Clock,
  X,
  Play,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";

// Componente SafeImage per il caricamento sicuro con fallback
function SafeImage({ src, alt, className, fallbackIcon = "📰" }) {
  const [imgError, setImgError] = useState(false);

  const isValidUrl = src && typeof src === "string" && src.trim() !== "" && src !== "EMPTY";

  if (!isValidUrl || imgError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-600 bg-[#161618] border border-zinc-800 font-mono">
        {fallbackIcon}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Copertina"}
      className={className}
      onError={() => {
        console.warn("⚠️ Immagine non caricata:", src);
        setImgError(true);
      }}
    />
  );
}

function Logo({ className = "h-8 w-auto" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="200" fill="#0A0A0A" rx="8" />
      <text
        x="100"
        y="95"
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="92"
        fontWeight="bold"
        fill="#C5A46D"
        textAnchor="middle"
        dominantBaseline="central"
      >
        S.
      </text>
      <text
        x="104"
        y="152"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="20"
        fontWeight="700"
        letterSpacing="9"
        fill="#A1A1AA"
        textAnchor="middle"
      >
        TIMES
      </text>
    </svg>
  );
}

function getDeviceId() {
  if (typeof window === "undefined") return "server-id";
  let deviceId = localStorage.getItem("salvemini_device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("salvemini_device_id", deviceId);
  }
  return deviceId;
}

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  
  // Ricerca con invio
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [widgetTab, setWidgetTab] = useState("vox"); // 'vox' | 'horoscope'
  
  // Dati da Supabase
  const [articles, setArticles] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  
  // Oroscopo Scolastico
  const [horoscope, setHoroscope] = useState([]);
  const [loadingHoroscope, setLoadingHoroscope] = useState(true);
  const [examMode, setExamMode] = useState("no");
  const [loading, setLoading] = useState(true);

  // Algoritmo YouTube & Player Video
  const [videoFilter, setVideoFilter] = useState("algo");
  const [selectedVideoModal, setSelectedVideoModal] = useState(null);
  const [userLikedVideos, setUserLikedVideos] = useState({});

  const categories = [
    "Tutti",
    "Gossip",
    "Hot",
    "Vita scolastica",
    "Attualità",
    "Tecnologia",
    "Sport",
    "Cultura",
    "Interviste",
    "Eventi",
    "Gaming",
    "Musica",
    "Cinema",
  ];

  // Gestione sicura data lato client per Next.js SSR
  useEffect(() => {
    setCurrentDateStr(
      new Date().toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();
          setProfile(profData);
        }

        let { data: artData, error: artError } = await supabase
          .from("articles")
          .select("*, profiles(nickname, email)")
          .ilike("status", "published")
          .order("created_at", { ascending: false });

        if (artError || !artData) {
          const { data: fallbackArts } = await supabase
            .from("articles")
            .select("*")
            .ilike("status", "published")
            .order("created_at", { ascending: false });

          artData = fallbackArts || [];
        }

        setArticles(artData || []);

        const { data: pollData } = await supabase
          .from("vox_populi")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pollData) setActivePoll(pollData);

        fetchHoroscopeData(false);

      } catch (err) {
        console.warn("⚠️ Errore inizializzazione HomePage:", err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  useEffect(() => {
    async function checkVoteForActivePoll() {
      if (!activePoll?.id) {
        setHasVoted(false);
        setVotedOption(null);
        return;
      }

      const deviceId = getDeviceId();
      const { data: voteCheck } = await supabase
        .from("poll_votes")
        .select("voted_option")
        .eq("poll_id", activePoll.id)
        .eq("device_id", deviceId)
        .maybeSingle();

      if (voteCheck) {
        setHasVoted(true);
        setVotedOption(voteCheck.voted_option);
      } else {
        setHasVoted(false);
        setVotedOption(null);
      }
    }

    checkVoteForActivePoll();
  }, [activePoll?.id]);

  const fetchHoroscopeData = async (hasExam) => {
    setLoadingHoroscope(true);
    try {
      const res = await fetch(`/api/horoscope?verifica=${hasExam}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setHoroscope(data);
      }
    } catch (err) {
      console.warn("Errore caricamento oroscopo:", err);
    } finally {
      setLoadingHoroscope(false);
    }
  };

  const handleExamToggle = (hasExam) => {
    const isExam = hasExam === true || hasExam === "yes";
    setExamMode(isExam ? "yes" : "no");
    fetchHoroscopeData(isExam);
  };

  // Gestione ricerca su ENTER
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim() !== "") {
      setSubmittedQuery(searchQuery.trim());
    } else {
      setSubmittedQuery("");
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSubmittedQuery("");
  };

  // Risultati della ricerca stilizzati tipo YouTube
  const searchResults = useMemo(() => {
    if (!submittedQuery || submittedQuery.trim() === "") return [];
    const q = submittedQuery.toLowerCase().trim();
    return articles.filter((art) => {
      return (
        art.title?.toLowerCase().includes(q) ||
        art.subtitle?.toLowerCase().includes(q) ||
        art.summary?.toLowerCase().includes(q) ||
        art.content?.toLowerCase().includes(q) ||
        art.category?.toLowerCase().includes(q) ||
        art.profiles?.nickname?.toLowerCase().includes(q)
      );
    });
  }, [articles, submittedQuery]);

  const textOnlyArticles = useMemo(() => {
    return articles.filter(
      (a) => !a.is_video && a.category !== "Video" && !a.video_url
    );
  }, [articles]);

  const trendingArticle = useMemo(() => {
    if (textOnlyArticles.length === 0) return null;
    return (
      textOnlyArticles.find((a) => a.is_trending) ||
      [...textOnlyArticles].sort((a, b) => (b.views || 0) - (a.views || 0))[0]
    );
  }, [textOnlyArticles]);

  const filteredArticles = useMemo(() => {
    return textOnlyArticles.filter((art) => {
      const matchesCat = selectedCategory === "Tutti" || art.category === selectedCategory;
      return matchesCat;
    });
  }, [textOnlyArticles, selectedCategory]);

  const rankedVideoArticles = useMemo(() => {
    const realVideos = articles.filter(
      (a) => (a.is_video || a.category === "Video" || a.video_url) && a.video_url
    );

    if (realVideos.length === 0) return [];

    const calculated = realVideos.map((vid) => {
      const views = vid.views || 0;
      const likes = vid.likes || 0;
      const createdAt = vid.created_at ? new Date(vid.created_at) : new Date();
      const hoursOld = Math.max(0.5, (new Date() - createdAt) / (1000 * 60 * 60));
      
      const engagementScore = (views * 1.0) + (likes * 4.0) + (vid.is_trending ? 100 : 0);
      const timeDecay = Math.pow(hoursOld + 2, 1.15);
      const algoScore = engagementScore / timeDecay;

      return { ...vid, algoScore, likesCount: likes };
    });

    if (videoFilter === "popular") {
      return calculated.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (videoFilter === "latest") {
      return calculated.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return calculated.sort((a, b) => b.algoScore - a.algoScore);
  }, [articles, videoFilter]);

  const handleOpenVideoPlayer = async (video) => {
    setSelectedVideoModal(video);

    if (video?.id) {
      try {
        await supabase.rpc("increment_article_views", { p_article_id: video.id });
        setArticles((prev) =>
          prev.map((a) => (a.id === video.id ? { ...a, views: (a.views || 0) + 1 } : a))
        );
      } catch (err) {
        console.warn("⚠️ Impossibile aggiornare visualizzazione Supabase:", err);
      }
    }
  };

  const handleVote = async (option) => {
    if (hasVoted || !activePoll) return;

    const deviceId = getDeviceId();
    try {
      const { data, error } = await supabase.rpc("vote_vox_populi", {
        p_poll_id: activePoll.id,
        p_device_id: deviceId,
        p_option: option,
      });

      if (!error && data?.success) {
        setHasVoted(true);
        setVotedOption(option);
        setActivePoll((prev) => ({
          ...prev,
          yes_votes: option === "yes" ? (prev.yes_votes || 0) + 1 : prev.yes_votes,
          no_votes: option === "no" ? (prev.no_votes || 0) + 1 : prev.no_votes,
        }));
      } else {
        alert(data?.message || "Errore durante la registrazione del voto.");
      }
    } catch {
      alert("⚠️ Impossibile registrare il voto.");
    }
  };

  const pollStats = useMemo(() => {
    if (!activePoll) return { yesPercent: 50, noPercent: 50, total: 0 };
    const total = (activePoll.yes_votes || 0) + (activePoll.no_votes || 0);
    if (total === 0) return { yesPercent: 50, noPercent: 50, total: 0 };
    const yesPercent = Math.round((activePoll.yes_votes / total) * 100);
    return {
      yesPercent,
      noPercent: 100 - yesPercent,
      total,
    };
  }, [activePoll]);

  const navigationSections = [
    {
      title: "SEZIONI REDAZIONALI",
      items: [
        { icon: Flame, label: "Gossip", category: "Gossip" },
        { icon: Zap, label: "Hot Topics", category: "Hot" },
        { icon: School, label: "Vita scolastica", category: "Vita scolastica" },
        { icon: Newspaper, label: "Attualità", category: "Attualità" },
        { icon: Cpu, label: "Tecnologia", category: "Tecnologia" },
      ],
    },
    {
      title: "EDICOLA & PARTECIPAZIONE",
      items: [
        { icon: Newspaper, label: "Giornalino PDF", href: "/edicola" },
        { icon: Vote, label: "Vox Populi", href: "#vox-populi" },
        { icon: Video, label: "Salvemini TV", href: "#salvemini-tv" },
        { icon: MessageSquare, label: "Feedback Anonimo", href: "/feedback" },
        { icon: Heart, label: "Interviste", category: "Interviste" },
        { icon: Calendar, label: "Eventi", category: "Eventi" },
      ],
    },
    {
      title: "CULTURA & MEDIA",
      items: [
        { icon: Gamepad2, label: "Gaming", category: "Gaming" },
        { icon: Music, label: "Musica", category: "Musica" },
        { icon: Film, label: "Cinema", category: "Cinema" },
        { icon: Trophy, label: "Sport", category: "Sport" },
      ],
    },
    {
      title: "AREA PERSONALE",
      items: [
        { icon: User, label: "Profilo", href: "/profilo" },
        { icon: Medal, label: "Classifica Autori", href: "/classifica" },
        ...(profile?.role === "admin"
          ? [{ icon: ShieldCheck, label: "Pannello Admin", href: "/admin" }]
          : []),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans selection:bg-[#C5A46D] selection:text-black">
      
      {/* DRAWER MENU LATERALE */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-[#111114] border-r border-zinc-800 z-50 transition-transform duration-300 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-auto" />
            <span className="font-serif font-black text-lg text-[#C5A46D]">SALVEMINI TIMES</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-mono tracking-[0.2em] uppercase text-[#C5A46D] font-bold mb-2">
                {section.title}
              </h4>

              {section.items.map((item) => {
                const isCat = !!item.category;
                const isActive = isCat && selectedCategory === item.category;

                const content = (
                  <div
                    onClick={() => {
                      if (isCat) {
                        setSelectedCategory(item.category);
                        setSubmittedQuery("");
                        setSearchQuery("");
                      }
                      setSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-[#C5A46D]/15 text-[#C5A46D] border border-[#C5A46D]/30"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                    }`}
                  >
                    <item.icon size={16} className={isActive ? "text-[#C5A46D]" : "text-zinc-400"} />
                    <span>{item.label}</span>
                  </div>
                );

                return item.href ? (
                  <Link key={item.label} href={item.href} onClick={() => setSidebarOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.label}>{content}</div>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* HEADER PRINCIPALE */}
      <header className="border-b border-zinc-800 bg-[#0F0F12]">
        
        {/* TOP BAR METADATI */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b border-zinc-800/60 flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 hover:text-[#C5A46D] transition"
            >
              <Menu size={16} /> <span className="font-bold">SEZIONI</span>
            </button>
            <span>•</span>
            <span className="text-zinc-300 capitalize">{currentDateStr || "Liceo Salvemini"}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-zinc-500">Bari, Italia</span>
            {user ? (
              <div className="flex items-center gap-2">
                {profile?.role === "admin" && (
                  <Link href="/admin" className="text-[#C5A46D] font-bold hover:underline flex items-center gap-1">
                    <ShieldCheck size={12} /> ADMIN
                  </Link>
                )}
                <Link href="/profilo" className="text-zinc-200 font-bold hover:text-[#C5A46D] transition">
                  @{profile?.nickname || user.email?.split("@")[0]}
                </Link>
              </div>
            ) : (
              <Link href="/login" className="text-[#C5A46D] font-bold hover:underline">
                ACCEDI REDAZIONE
              </Link>
            )}
          </div>
        </div>

        {/* LOGO BRAND E BARRA RICERCA STYLE YOUTUBE */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link
            href="/"
            onClick={() => handleClearSearch()}
            className="text-center md:text-left group"
          >
            <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-white uppercase leading-none group-hover:text-[#C5A46D] transition-colors">
              SALVEMINI <span className="text-[#C5A46D]">TIMES</span>
            </h1>
            <p className="text-xs font-serif italic text-zinc-400 mt-2">
              Giornale Digitale d'Inchiesta e Cultura del Liceo Scientifico Salvemini
            </p>
          </Link>

          {/* FORM RICERCA CON INVIO */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <button
              type="submit"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#C5A46D] transition"
              title="Cerca"
            >
              <Search size={16} />
            </button>

            <input
              type="text"
              placeholder="Cerca e premi Invio..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value === "") {
                  setSubmittedQuery("");
                }
              }}
              className="w-full bg-[#16161a] border border-zinc-800 text-white placeholder-zinc-500 rounded-xl pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:border-[#C5A46D] transition"
            />

            {(searchQuery || submittedQuery) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                title="Cancella ricerca"
              >
                <X size={14} />
              </button>
            )}
          </form>
        </div>

        {/* NASTRO CATEGORIE */}
        <nav className="border-t border-zinc-800 bg-[#0A0A0C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-2 no-scrollbar text-xs font-mono">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSubmittedQuery("");
                  setSearchQuery("");
                }}
                className={`px-3.5 py-1.5 rounded-md uppercase tracking-wider whitespace-nowrap transition ${
                  selectedCategory === cat && !submittedQuery
                    ? "bg-[#C5A46D] text-black font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* CONTENUTO PRINCIPALE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {submittedQuery ? (
          /* ========================================================= */
          /* VISTA RISULTATI DI RICERCA (YOUTUBE-STYLE)                 */
          /* ========================================================= */
          <section className="space-y-6 min-h-[60vh]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <button
                  onClick={handleClearSearch}
                  className="text-xs font-mono text-[#C5A46D] hover:underline flex items-center gap-1 mb-1 font-bold"
                >
                  ← Torna alla Home
                </button>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                  Risultati della ricerca per: <span className="text-[#C5A46D]">"{submittedQuery}"</span>
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  {searchResults.length} {searchResults.length === 1 ? "risultato trovato" : "risultati trovati"}
                </p>
              </div>

              <button
                onClick={handleClearSearch}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <X size={14} /> Cancella Ricerca
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-16 text-center text-zinc-500 font-mono text-xs border border-zinc-800 rounded-2xl bg-[#111114]">
                Nessun articolo o video trovato per "{submittedQuery}". Prova con parole chiave differenti.
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((item) => {
                  const isVid = item.is_video || item.category === "Video" || !!item.video_url;

                  return (
                    <div
                      key={item.id}
                      className="bg-[#111114] border border-zinc-800/80 hover:border-[#C5A46D]/60 transition rounded-2xl p-4 sm:p-5 group"
                    >
                      {isVid ? (
                        <div
                          onClick={() => handleOpenVideoPlayer(item)}
                          className="flex flex-col sm:flex-row gap-5 cursor-pointer"
                        >
                          <div className="w-full sm:w-64 aspect-video shrink-0 bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-800">
                            <SafeImage
                              src={item.cover_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-85"
                              fallbackIcon="🎥"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-[#C5A46D] text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play size={16} className="fill-black ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute top-2.5 left-2.5 text-[9px] font-mono uppercase bg-red-950/90 text-red-400 px-2 py-0.5 rounded border border-red-800/80 font-bold flex items-center gap-1">
                              <Video size={10} /> Video
                            </span>
                            <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono bg-black/80 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                              {item.views || 0} views
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono font-bold text-[#C5A46D] uppercase">
                                  {item.category || "Video"}
                                </span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  Di {item.profiles?.nickname || "Redazione"}
                                </span>
                              </div>
                              <h3 className="font-serif font-bold text-lg sm:text-xl text-white group-hover:text-[#C5A46D] transition line-clamp-2 leading-snug">
                                {item.title}
                              </h3>
                              {item.subtitle && (
                                <p className="text-xs font-serif italic text-zinc-400 mt-1">{item.subtitle}</p>
                              )}
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-2 font-sans">
                                {item.summary || item.content?.replace(/<[^>]*>?/gm, "")?.substring(0, 160) + "..."}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                              <span>Pubblicato il {new Date(item.created_at || Date.now()).toLocaleDateString("it-IT")}</span>
                              <span className="text-[#C5A46D] font-bold flex items-center gap-1">
                                Riproduci Video <Play size={12} className="fill-[#C5A46D]" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Link href={`/articolo/${item.id}`} className="flex flex-col sm:flex-row gap-5">
                          <div className="w-full sm:w-64 aspect-video sm:aspect-[16/10] shrink-0 bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-800">
                            <SafeImage
                              src={item.cover_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-85"
                              fallbackIcon="📰"
                            />
                            <span className="absolute top-2.5 left-2.5 text-[9px] font-mono uppercase bg-black/80 text-[#C5A46D] px-2 py-0.5 rounded border border-zinc-700 font-bold">
                              {item.category || "Articolo"}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono font-bold text-[#C5A46D] uppercase">
                                  {item.category || "Articolo"}
                                </span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  Di {item.profiles?.nickname || "Redazione"}
                                </span>
                              </div>
                              <h3 className="font-serif font-bold text-lg sm:text-xl text-white group-hover:text-[#C5A46D] transition line-clamp-2 leading-snug">
                                {item.title}
                              </h3>
                              {item.subtitle && (
                                <p className="text-xs font-serif italic text-zinc-400 mt-1">{item.subtitle}</p>
                              )}
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-2 font-sans">
                                {item.summary || item.content?.replace(/<[^>]*>?/gm, "")?.substring(0, 160) + "..."}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                              <span>{item.views || 0} letture</span>
                              <span className="text-[#C5A46D] font-bold flex items-center gap-1">
                                Leggi Articolo <ChevronRight size={14} />
                              </span>
                            </div>
                          </div>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* ========================================================= */
          /* HOMEPAGE NORMALE BROADSHEET                               */
          /* ========================================================= */
          <>
            {/* ROW 1: ARTICOLO DI COPERTINA + WIDGET SONDAGGIO/OROSCOPO */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* PRIMA PAGINA (COLONNE 1-2) */}
              <div className="lg:col-span-2 space-y-6">
                {trendingArticle ? (
                  <Link href={`/articolo/${trendingArticle.id}`} className="group block space-y-4">
                    <div className="relative aspect-[16/9] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800">
                      <SafeImage
                        src={trendingArticle.cover_url}
                        alt={trendingArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                      <span className="absolute top-3 left-3 bg-[#C5A46D] text-black font-mono font-bold text-[10px] px-2.5 py-1 uppercase tracking-wider rounded">
                        In Primo Piano
                      </span>
                      <span className="absolute bottom-3 right-3 bg-black/80 text-zinc-300 font-mono text-[10px] px-2 py-1 border border-zinc-700/80 rounded flex items-center gap-1">
                        <Clock size={11} /> {trendingArticle.views || 0} letture
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-mono font-bold text-[#C5A46D] uppercase tracking-widest">
                        {trendingArticle.category || "Inchiesta"}
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-serif font-black leading-tight group-hover:text-[#C5A46D] transition-colors">
                        {trendingArticle.title}
                      </h2>
                      {trendingArticle.subtitle && (
                        <p className="text-sm sm:text-base font-serif italic text-zinc-400">
                          {trendingArticle.subtitle}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed line-clamp-3 font-sans">
                        {trendingArticle.summary || trendingArticle.content?.replace(/<[^>]*>?/gm, '')?.substring(0, 180) + "..."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                      <span>Redattore: <strong className="text-zinc-200">{trendingArticle.profiles?.nickname || "Redazione"}</strong></span>
                      <span className="text-[#C5A46D] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Leggi Articolo Integrale <ChevronRight size={14} />
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="p-12 text-center text-zinc-500 font-mono text-xs border border-zinc-800 rounded-2xl">
                    Nessun articolo disponibile in prima pagina.
                  </div>
                )}
              </div>

              {/* COLONNA LATERALE: WIDGET INTERATTIVO (COLONNA 3) */}
              <div id="vox-populi" className="bg-[#111114] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
                
                {/* SWITCHER TABS WIDGET */}
                <div className="flex bg-[#0A0A0C] p-1 rounded-xl border border-zinc-800 text-xs font-mono">
                  <button
                    onClick={() => setWidgetTab("vox")}
                    className={`flex-1 py-1.5 rounded-lg transition font-bold ${
                      widgetTab === "vox" ? "bg-[#C5A46D] text-black shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Vox Populi
                  </button>
                  <button
                    onClick={() => setWidgetTab("horoscope")}
                    className={`flex-1 py-1.5 rounded-lg transition font-bold ${
                      widgetTab === "horoscope" ? "bg-[#C5A46D] text-black shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Oroscopo
                  </button>
                </div>

                {widgetTab === "vox" ? (
                  activePoll ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-[#C5A46D] uppercase font-bold tracking-widest">Sondaggio Ufficiale</span>
                        <h4 className="font-serif font-bold text-sm text-zinc-100 mt-1 leading-snug">{activePoll.question}</h4>
                      </div>

                      <div className="space-y-3 font-mono text-xs">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-zinc-300">SÌ</span>
                            <span className="text-[#C5A46D] font-bold">{pollStats.yesPercent}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#C5A46D]" style={{ width: `${pollStats.yesPercent}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-zinc-300">NO</span>
                            <span className="text-zinc-400 font-bold">{pollStats.noPercent}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-600" style={{ width: `${pollStats.noPercent}%` }} />
                          </div>
                        </div>
                      </div>

                      {hasVoted ? (
                        <div className="text-center text-[11px] font-mono text-[#C5A46D] py-2 bg-[#C5A46D]/10 rounded-lg border border-[#C5A46D]/20">
                          Voto salvato ({votedOption === "yes" ? "SÌ" : "NO"})
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVote("yes")}
                            className="flex-1 bg-[#C5A46D] hover:bg-[#b3925c] text-black py-2 rounded-lg font-mono font-bold text-xs transition"
                          >
                            SÌ
                          </button>
                          <button
                            onClick={() => handleVote("no")}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg font-mono font-bold text-xs transition"
                          >
                            NO
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs font-mono text-zinc-500">Nessun sondaggio attivo.</div>
                  )
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                      <span className="text-[10px] font-mono text-[#C5A46D] font-bold uppercase">Astri Scolastici</span>
                      <div className="flex bg-[#0A0A0C] p-0.5 border border-zinc-800 rounded-lg text-[10px] font-mono">
                        <button
                          onClick={() => handleExamToggle(true)}
                          className={`px-2 py-0.5 rounded transition ${
                            examMode === "yes" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          😱 Verifiche
                        </button>
                        <button
                          onClick={() => handleExamToggle(false)}
                          className={`px-2 py-0.5 rounded transition ${
                            examMode === "no" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          😮‍💨 Liscia
                        </button>
                      </div>
                    </div>

                    {loadingHoroscope ? (
                      <div className="text-center py-8 text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#C5A46D] border-t-transparent rounded-full animate-spin" />
                        Elaborazione oroscopo...
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                        {horoscope.map((item, idx) => (
                          <div key={idx} className="bg-[#0A0A0C] p-3 rounded-xl border border-zinc-800 text-xs hover:border-[#C5A46D]/40 transition">
                            <div className="flex justify-between items-center font-mono font-bold text-[#C5A46D] mb-1">
                              <span className="flex items-center gap-1.5 text-white text-xs">
                                <span>{item.icon}</span> {item.tribu}
                              </span>
                              <span className="bg-[#C5A46D]/20 text-[#D4B47C] px-1.5 py-0.5 rounded text-[10px]">
                                {item.voto}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{item.previsione}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

            </section>

            {/* ROW 2: SALVEMINI TV */}
            <section id="salvemini-tv" className="bg-[#111114] border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-950/80 text-red-400 border border-red-800/80 rounded-xl">
                    <Video size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      SALVEMINI <span className="text-[#C5A46D]">TV</span>
                    </h3>
                    <p className="text-xs text-zinc-400">Servizi multimediali e inchieste video</p>
                  </div>
                </div>

                {rankedVideoArticles.length > 0 && (
                  <div className="flex bg-[#0A0A0C] p-1 rounded-xl border border-zinc-800 text-xs font-mono">
                    <button
                      onClick={() => setVideoFilter("algo")}
                      className={`px-3 py-1 rounded-lg transition ${videoFilter === "algo" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400"}`}
                    >
                      Per Te
                    </button>
                    <button
                      onClick={() => setVideoFilter("popular")}
                      className={`px-3 py-1 rounded-lg transition ${videoFilter === "popular" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400"}`}
                    >
                      Più Visti
                    </button>
                    <button
                      onClick={() => setVideoFilter("latest")}
                      className={`px-3 py-1 rounded-lg transition ${videoFilter === "latest" ? "bg-[#C5A46D] text-black font-bold" : "text-zinc-400"}`}
                    >
                      Ultimi
                    </button>
                  </div>
                )}
              </div>

              {rankedVideoArticles.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                  Nessun video presente nell'archivio.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {rankedVideoArticles.slice(0, 4).map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => handleOpenVideoPlayer(vid)}
                      className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl overflow-hidden group hover:border-[#C5A46D] transition cursor-pointer flex flex-col justify-between"
                    >
                      <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                        <SafeImage
                          src={vid.cover_url}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-85"
                          fallbackIcon="🎥"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[#C5A46D] text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play size={16} className="fill-black ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 text-[9px] font-mono bg-black/80 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                          {vid.views || 0} views
                        </span>
                      </div>

                      <div className="p-3 space-y-1">
                        <h4 className="font-serif font-bold text-xs line-clamp-1 group-hover:text-[#C5A46D] transition">
                          {vid.title}
                        </h4>
                        <p className="text-[10px] font-mono text-zinc-500">
                          Di {vid.profiles?.nickname || "Redazione"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ROW 3: TUTTI GLI ARTICOLI */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="text-xl font-serif font-bold uppercase text-[#C5A46D]">
                  Tutti gli Articoli ({filteredArticles.length})
                </h3>
                <span className="text-xs font-mono text-zinc-500">Filtro: {selectedCategory}</span>
              </div>

              {filteredArticles.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-mono text-xs border border-zinc-800 rounded-2xl">
                  Nessun articolo disponibile per la categoria selezionata.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArticles.map((article) => (
                    <Link key={article.id} href={`/articolo/${article.id}`} className="group block h-full">
                      <div className="bg-[#111114] border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-[#C5A46D]/60 transition h-full flex flex-col justify-between">
                        <div>
                          <div className="h-44 bg-zinc-950 overflow-hidden relative border-b border-zinc-800">
                            <SafeImage
                              src={article.cover_url}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-85"
                            />
                            <span className="absolute top-2.5 left-2.5 text-[9px] font-mono uppercase bg-black/80 text-[#C5A46D] px-2 py-0.5 rounded border border-zinc-700 font-bold">
                              {article.category || "Generale"}
                            </span>
                          </div>

                          <div className="p-5 space-y-2">
                            <h4 className="font-serif font-bold text-lg group-hover:text-[#C5A46D] transition line-clamp-2 leading-snug">
                              {article.title}
                            </h4>
                            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                              {article.summary || article.content?.replace(/<[^>]*>?/gm, '')?.substring(0, 140) + "..."}
                            </p>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                          <span>Di {article.profiles?.nickname || "Redazione"}</span>
                          <span>{article.views || 0} letture</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

      </main>

      {/* MODALE CINEMA PLAYER PER VIDEO */}
      {selectedVideoModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111114] border border-zinc-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative my-auto">
            
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0A0A0C]">
              <span className="text-xs font-mono font-bold text-[#C5A46D] uppercase">
                Salvemini TV Cinema Player
              </span>
              <button
                onClick={() => setSelectedVideoModal(null)}
                className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 relative">
                {selectedVideoModal.video_url?.includes("youtube.com") || selectedVideoModal.video_url?.includes("youtu.be") ? (
                  <iframe
                    src={selectedVideoModal.video_url.replace("watch?v=", "embed/")}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={selectedVideoModal.video_url}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                  {selectedVideoModal.title}
                </h2>
                <p className="text-xs font-mono text-zinc-400">
                  Autore: {selectedVideoModal.profiles?.nickname || "Redazione Salvemini"} • {selectedVideoModal.views || 0} visualizzazioni
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}