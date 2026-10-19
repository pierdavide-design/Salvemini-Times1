"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  Menu,
  Search,
  Flame,
  Globe,
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
  ThumbsUp,
  Share2,
  Eye,
} from "lucide-react";

function Logo({ className = "h-9 w-auto" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="200" fill="#0A0A0A" rx="32" />
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  
  // Dati da Supabase
  const [articles, setArticles] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  
  // Oroscopo Scolastico
  const [horoscope, setHoroscope] = useState([]);
  const [loadingHoroscope, setLoadingHoroscope] = useState(true);
  const [examMode, setExamMode] = useState(null);
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
      const res = await fetch(`/api/horoscope?verifica=${hasExam}`);
      const data = await res.json();
      if (Array.isArray(data)) setHoroscope(data);
    } catch {
      console.warn("Errore caricamento oroscopo");
    } finally {
      setLoadingHoroscope(false);
    }
  };

  const handleExamToggle = (hasExam) => {
    setExamMode(hasExam ? "yes" : "no");
    fetchHoroscopeData(hasExam);
  };

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
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        art.title?.toLowerCase().includes(q) ||
        art.subtitle?.toLowerCase().includes(q) ||
        art.summary?.toLowerCase().includes(q) ||
        art.content?.toLowerCase().includes(q) ||
        art.profiles?.nickname?.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [textOnlyArticles, selectedCategory, searchQuery]);

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

  const handleToggleLikeVideo = (videoId) => {
    setUserLikedVideos((prev) => {
      const isLiked = prev[videoId];
      return { ...prev, [videoId]: !isLiked };
    });
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
      title: "IN EVIDENZA",
      items: [
        { icon: Flame, label: "Gossip", category: "Gossip" },
        { icon: Zap, label: "Hot Topics", category: "Hot" },
        { icon: School, label: "Vita scolastica", category: "Vita scolastica" },
        { icon: Newspaper, label: "Attualità", category: "Attualità" },
        { icon: Cpu, label: "Tecnologia", category: "Tecnologia" },
      ],
    },
    {
      title: "COMMUNITY & EDICOLA",
      items: [
        { icon: Newspaper, label: "Giornalino PDF", href: "/edicola" },
        { icon: Vote, label: "Vox Populi", href: "#vox-populi" },
        { icon: Video, label: "Video & Reels", href: "#salvemini-tv" },
        { icon: MessageSquare, label: "Feedback Anonimo", href: "/feedback" },
        { icon: Heart, label: "Interviste", category: "Interviste" },
        { icon: Calendar, label: "Eventi", category: "Eventi" },
      ],
    },
    {
      title: "INTRATTENIMENTO",
      items: [
        { icon: Gamepad2, label: "Gaming", category: "Gaming" },
        { icon: Music, label: "Musica", category: "Musica" },
        { icon: Film, label: "Cinema", category: "Cinema" },
        { icon: Trophy, label: "Sport", category: "Sport" },
      ],
    },
    {
      title: "ACCOUNT & PANNELLO",
      items: [
        { icon: User, label: "Profilo", href: "/profilo" },
        { icon: Medal, label: "Classifica", href: "/classifica" },
        ...(profile?.role === "admin"
          ? [{ icon: ShieldCheck, label: "Pannello Admin", href: "/admin" }]
          : []),
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
      
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-50 bg-[#111111] border-r border-zinc-800/80 transition-all duration-300 flex flex-col shrink-0 self-start ${
          sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20"
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-800/60 h-16">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition"
          >
            <Menu size={22} />
          </button>

          {sidebarOpen ? (
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-8 w-auto" />
            </Link>
          ) : (
            <Link href="/" className="hidden md:block">
              <Logo className="h-7 w-auto" />
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navigationSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {sidebarOpen && (
                <h4 className="px-3 text-[10px] font-mono tracking-[0.2em] uppercase text-[#C5A46D] font-bold mb-2">
                  {section.title}
                </h4>
              )}

              {section.items.map((item) => {
                const isCat = !!item.category;
                const isActive = isCat && selectedCategory === item.category;

                const content = (
                  <div
                    onClick={() => {
                      if (isCat) setSelectedCategory(item.category);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-[#C5A46D]/15 text-[#C5A46D] border border-[#C5A46D]/30"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                    }`}
                  >
                    <item.icon size={18} className={isActive ? "text-[#C5A46D]" : "text-zinc-400"} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </div>
                );

                return item.href ? (
                  <Link key={item.label} href={item.href} onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}>
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

      {/* CONTENUTO PRINCIPALE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* NAVBAR (mostra solo il titolo in testo Serif per evitare doppi loghi con la Sidebar) */}
        <header className="h-16 border-b border-zinc-800/80 flex items-center justify-between px-4 sm:px-8 bg-[#0A0A0A]/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition"
            >
              <Menu size={22} />
            </button>

            <Link href="/" className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#C5A46D] tracking-wide">
                Salvemini Times
              </h1>
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  className="bg-[#C5A46D]/20 text-[#D4B47C] border border-[#C5A46D]/40 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 hover:bg-[#C5A46D]/30 transition"
                >
                  <ShieldCheck size={14} /> Admin
                </Link>
              )}
              <Link href="/profilo">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#C5A46D] text-black font-serif font-bold flex items-center justify-center hover:scale-105 transition shadow-sm">
                  {profile?.nickname?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-xs sm:text-sm font-medium transition border border-zinc-700/50"
            >
              Accedi
            </Link>
          )}
        </header>

        {/* BARRA DI RICERCA */}
        <div className="px-4 sm:px-8 pt-6 pb-2">
          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="🔍 Cerca articoli di testo, gossip, sondaggi, redattori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151515] border border-zinc-800 text-white placeholder-zinc-500 rounded-2xl pl-12 pr-10 py-3.5 text-sm focus:outline-none focus:border-[#C5A46D]/80 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* HERO TRENDING + VOX POPULI */}
        <section className="px-4 sm:px-8 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-stretch">
            
            {trendingArticle ? (
              <Link href={`/articolo/${trendingArticle.id}`} className="group block h-full">
                <div className="h-full rounded-3xl bg-[#151515] border border-zinc-800 p-5 sm:p-8 flex flex-col justify-between hover:border-[#C5A46D]/60 transition-all duration-300 shadow-xl relative overflow-hidden">
                  <div>
                    <div className="relative w-full h-52 sm:h-72 rounded-2xl overflow-hidden mb-6 bg-zinc-900 border border-zinc-800/80">
                      {trendingArticle.cover_url ? (
                        <img
                          src={trendingArticle.cover_url}
                          alt={trendingArticle.title}
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-700">📰</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-black/40" />

                      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-[#C5A46D] text-black font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                          <Flame size={14} className="fill-black" />
                          #1 In Evidenza
                        </span>
                        <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur text-white text-xs px-3 py-1 rounded-full font-mono border border-white/10">
                          <TrendingUp size={12} className="text-[#C5A46D]" />
                          {trendingArticle.views || 0} letture
                        </span>
                      </div>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-serif leading-tight group-hover:text-[#C5A46D] transition-colors duration-300">
                      {trendingArticle.title}
                    </h1>
                    {trendingArticle.subtitle && (
                      <h2 className="text-[#C5A46D] text-base sm:text-lg font-serif mt-2 italic">
                        {trendingArticle.subtitle}
                      </h2>
                    )}
                    <p className="mt-3 text-zinc-400 text-sm sm:text-base leading-relaxed line-clamp-2">
                      {trendingArticle.summary || trendingArticle.content?.replace(/<[^>]*>?/gm, '')?.substring(0, 160) + "..."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-2">
                      <span className="text-zinc-300 font-medium">{trendingArticle.category || "Generale"}</span>
                      <span>•</span>
                      <span>Di {trendingArticle.profiles?.nickname || "Redazione"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#C5A46D] font-semibold group-hover:translate-x-1 transition-transform">
                      Leggi ora <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="h-full rounded-3xl bg-[#151515] border border-zinc-800 p-8 flex items-center justify-center text-zinc-500">
                Nessun articolo di testo in evidenza disponibile.
              </div>
            )}

            <div id="vox-populi" className="rounded-3xl bg-[#151515] border border-zinc-800 p-5 sm:p-8 flex flex-col justify-between shadow-md">
              {activePoll ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="uppercase tracking-[0.25em] text-xs font-bold text-[#C5A46D]">
                        Vox Populi
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">Sondaggio Ufficiale</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif font-medium leading-snug mb-6 text-zinc-100">
                      {activePoll.question}
                    </h3>

                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-zinc-200">SÌ</span>
                          <span className="text-[#C5A46D]">{pollStats.yesPercent}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C5A46D] rounded-full transition-all duration-500"
                            style={{ width: `${pollStats.yesPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-zinc-200">NO</span>
                          <span className="text-zinc-400">{pollStats.noPercent}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-600 rounded-full transition-all duration-500"
                            style={{ width: `${pollStats.noPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-800/80">
                    <div className="text-xs text-zinc-500 mb-4 flex items-center justify-between">
                      <span>🗳 {pollStats.total} voti unici</span>
                      <span className="text-[10px] text-zinc-600">Dispositivo Protetto</span>
                    </div>

                    {hasVoted ? (
                      <div className="text-center text-xs text-[#C5A46D] font-medium py-3 bg-[#C5A46D]/10 rounded-xl border border-[#C5A46D]/20">
                        ✓ Voto salvato su questo dispositivo ({votedOption === "yes" ? "SÌ" : "NO"})
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleVote("yes")}
                          className="flex-1 bg-[#C5A46D] hover:bg-[#b3925c] text-black py-2.5 rounded-xl font-semibold text-sm transition shadow"
                        >
                          Vota SÌ
                        </button>
                        <button
                          onClick={() => handleVote("no")}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl font-semibold text-sm transition"
                        >
                          Vota NO
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-zinc-500 text-sm">Nessun sondaggio attivo.</div>
              )}
            </div>

          </div>
        </section>

        {/* WIDGET OROSCOPO SCOLASTICO */}
        <section className="px-4 sm:px-8 pt-6">
          <div className="bg-[#151515] border border-zinc-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A46D] flex items-center gap-2">
                  <Sparkles size={15} /> Oroscopo Scolastico della Settimana
                </h3>
                <p className="text-[11px] text-zinc-500 font-serif italic mt-0.5">Tarato in tempo reale sulle tue verifiche scolastiche</p>
              </div>

              <div className="flex bg-[#111111] p-1 rounded-xl border border-zinc-800 text-xs self-start sm:self-auto">
                <button
                  onClick={() => handleExamToggle(true)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    examMode === "yes"
                      ? "bg-[#C5A46D] text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  😱 Ho verifiche
                </button>
                <button
                  onClick={() => handleExamToggle(false)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    examMode === "no"
                      ? "bg-[#C5A46D] text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  😮‍💨 Settimana liscia
                </button>
              </div>
            </div>

            {loadingHoroscope ? (
              <div className="text-center py-8 text-xs text-zinc-500 flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#C5A46D] border-t-transparent rounded-full animate-spin" />
                Consultando gli astri della ricreazione...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {horoscope.map((item, idx) => (
                  <div key={idx} className="bg-[#111111] border border-zinc-800/80 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-[#C5A46D]/40 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-[10px] font-mono bg-[#C5A46D]/15 text-[#D4B47C] px-2 py-0.5 rounded-md font-bold">{item.voto}</span>
                      </div>
                      <h4 className="font-bold text-white text-xs">{item.tribu}</h4>
                      <p className="text-zinc-400 text-[11px] leading-relaxed mt-1">{item.previsione}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SALVEMINI TV */}
        <section id="salvemini-tv" className="px-4 sm:px-8 pt-6">
          <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-red-950/80 text-red-400 border border-red-800/60 rounded-lg">
                  <Video size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#C5A46D] tracking-wide flex items-center gap-1.5">
                    Salvemini TV & Reels
                    <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase border border-red-500/30">
                      YouTube Engine
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">Sezione video e filmati reali caricati dalla Redazione</p>
                </div>
              </div>

              {rankedVideoArticles.length > 0 && (
                <div className="flex bg-[#0A0A0C] p-1 rounded-xl border border-zinc-800 text-xs self-start sm:self-auto">
                  <button
                    onClick={() => setVideoFilter("algo")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                      videoFilter === "algo" ? "bg-[#C5A46D] text-black shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Sparkles size={12} /> Per Te
                  </button>
                  <button
                    onClick={() => setVideoFilter("popular")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                      videoFilter === "popular" ? "bg-[#C5A46D] text-black shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <TrendingUp size={12} /> Più Visti
                  </button>
                  <button
                    onClick={() => setVideoFilter("latest")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                      videoFilter === "latest" ? "bg-[#C5A46D] text-black shadow" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Clock size={12} /> Ultimi
                  </button>
                </div>
              )}
            </div>

            {rankedVideoArticles.length === 0 ? (
              <div className="py-12 px-4 text-center bg-[#0A0A0C] border border-zinc-800/80 rounded-xl space-y-3">
                <Video size={32} className="mx-auto text-zinc-600" />
                <p className="text-xs text-zinc-400 font-medium">
                  Nessun video attualmente presente nel database.
                </p>
                <Link
                  href="/redazione"
                  className="inline-block text-xs font-bold bg-[#C5A46D]/15 text-[#D4B47C] border border-[#C5A46D]/30 px-4 py-2 rounded-xl hover:bg-[#C5A46D]/25 transition"
                >
                  🎬 Carica il primo video dalla Redazione
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rankedVideoArticles.slice(0, 4).map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => handleOpenVideoPlayer(vid)}
                    className="bg-[#18181C] border border-zinc-800/80 rounded-xl overflow-hidden group hover:border-[#C5A46D]/60 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                      {vid.cover_url ? (
                        <img
                          src={vid.cover_url}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85 group-hover:opacity-100"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                          <Video size={28} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#C5A46D] text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play size={15} className="fill-black ml-0.5" />
                        </div>
                      </div>

                      <span className="absolute top-2 left-2 text-[9px] font-mono bg-[#C5A46D]/20 text-[#D4B47C] backdrop-blur px-1.5 py-0.5 rounded font-bold border border-[#C5A46D]/30">
                        {vid.category || "Video"}
                      </span>

                      <span className="absolute bottom-2 right-2 text-[9px] font-mono text-zinc-300 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                        <Eye size={10} /> {vid.views || 0}
                      </span>
                    </div>

                    <div className="p-2.5 space-y-1">
                      <h4 className="font-serif font-bold text-xs line-clamp-1 text-zinc-200 group-hover:text-[#C5A46D] transition">
                        {vid.title}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Di {vid.profiles?.nickname || "Redazione"}</span>
                        <span className="text-[#C5A46D] font-mono font-bold">★ {Math.round(vid.algoScore || 10)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </section>

        {/* CINEMA PLAYER MODAL */}
        {selectedVideoModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
            <div className="bg-[#121215] border border-zinc-800 rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl relative my-auto">
              
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#16161A]">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-red-950/80 text-red-400 border border-red-800/60 rounded-md">
                    <Video size={16} />
                  </span>
                  <span className="text-xs font-mono font-bold text-[#C5A46D] uppercase tracking-wider">
                    Salvemini TV Cinema Player
                  </span>
                </div>

                <button
                  onClick={() => setSelectedVideoModal(null)}
                  className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
                
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-inner relative">
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

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                      <div>
                        <span className="text-[10px] font-mono bg-[#C5A46D]/15 text-[#D4B47C] px-2 py-0.5 rounded font-bold uppercase">
                          {selectedVideoModal.category || "Video"}
                        </span>
                        <h2 className="text-lg sm:text-2xl font-serif font-bold text-white mt-1">
                          {selectedVideoModal.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => handleToggleLikeVideo(selectedVideoModal.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                            userLikedVideos[selectedVideoModal.id]
                              ? "bg-red-950/80 text-red-400 border-red-800/80"
                              : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
                          }`}
                        >
                          <ThumbsUp size={14} className={userLikedVideos[selectedVideoModal.id] ? "fill-red-400" : ""} />
                          <span>{(selectedVideoModal.likesCount || 0) + (userLikedVideos[selectedVideoModal.id] ? 1 : 0)}</span>
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("🔗 Link del video copiato negli appunti!");
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-bold transition"
                        >
                          <Share2 size={14} />
                          <span>Condividi</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 bg-[#16161A] p-3 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#C5A46D] text-black font-bold flex items-center justify-center font-serif text-xs">
                          {selectedVideoModal.profiles?.nickname?.charAt(0).toUpperCase() || "R"}
                        </div>
                        <div>
                          <p className="font-bold text-white">{selectedVideoModal.profiles?.nickname || "Redazione Salvemini"}</p>
                          <p className="text-[10px] text-zinc-500">Autore Creatore</p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px]">
                        <p className="text-[#C5A46D] font-bold">{selectedVideoModal.views || 0} visualizzazioni</p>
                        <p className="text-zinc-500">{new Date(selectedVideoModal.created_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {selectedVideoModal.subtitle && (
                      <p className="text-xs text-zinc-300 leading-relaxed bg-[#16161A]/50 p-3 rounded-xl border border-zinc-800/60">
                        {selectedVideoModal.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3 bg-[#101013]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#C5A46D] flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                    <Sparkles size={14} /> Consigliati dall'Algoritmo
                  </h4>

                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                    {rankedVideoArticles
                      .filter((v) => v.id !== selectedVideoModal.id)
                      .map((nextVid) => (
                        <div
                          key={nextVid.id}
                          onClick={() => handleOpenVideoPlayer(nextVid)}
                          className="flex gap-2.5 p-2 rounded-xl bg-[#16161A] hover:bg-zinc-800/80 border border-zinc-800/60 transition cursor-pointer group"
                        >
                          <div className="relative w-24 h-16 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
                            {nextVid.cover_url ? (
                              <img
                                src={nextVid.cover_url}
                                alt={nextVid.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-85"
                              />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                                <Video size={16} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play size={12} className="fill-white text-white" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <h5 className="font-serif font-bold text-xs text-zinc-200 line-clamp-2 group-hover:text-[#C5A46D] transition leading-snug">
                              {nextVid.title}
                            </h5>
                            <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-1">
                              <span>Di {nextVid.profiles?.nickname || "Redazione"}</span>
                              <span className="text-[#C5A46D] font-bold">{nextVid.views || 0} views</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* GRIGLIA ARTICOLI */}
        <section className="px-4 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-serif text-[#C5A46D] font-bold">
              Tutti gli Articoli ({filteredArticles.length})
            </h2>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-[#C5A46D] text-black font-semibold shadow-sm"
                      : "bg-[#151515] border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 bg-[#151515] rounded-3xl border border-zinc-800">
              Nessun articolo di testo disponibile per la categoria selezionata.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Link key={article.id} href={`/articolo/${article.id}`}>
                  <div className="bg-[#151515] rounded-3xl overflow-hidden border border-zinc-800 hover:border-[#C5A46D]/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col group">
                    <div className="h-48 relative overflow-hidden bg-zinc-900">
                      {article.cover_url ? (
                        <img
                          src={article.cover_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-700">📄</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-black/20" />
                      
                      <span className="absolute top-3 left-3 text-[11px] font-semibold uppercase tracking-wider text-[#C5A46D] bg-[#111111]/80 backdrop-blur px-3 py-1 rounded-full border border-zinc-800">
                        {article.category || "Generale"}
                      </span>
                      <span className="absolute bottom-3 right-3 text-zinc-300 text-xs flex items-center gap-1 bg-black/60 backdrop-blur px-2.5 py-1 rounded-md font-mono border border-white/10">
                        <Clock size={12} /> {article.views || 0} views
                      </span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold mb-3 group-hover:text-[#C5A46D] transition line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed mb-4">
                          {article.summary || article.content?.replace(/<[^>]*>?/gm, '')?.substring(0, 140) + "..."}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                        <span>Di {article.profiles?.nickname || "Redazione"}</span>
                        <span className="text-[#C5A46D] opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center gap-1">
                          Leggi <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}