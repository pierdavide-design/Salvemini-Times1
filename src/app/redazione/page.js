"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  ArrowLeft, PenLine, FileText, Download, LayoutTemplate,
  Bold, Italic, Underline, Highlighter, Palette, 
  AlignLeft, AlignCenter, List, Quote, Image as ImageIcon, Sparkles,
  Video, UploadCloud, Loader2, RefreshCw
} from "lucide-react";

function RedazioneWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  // Riferimenti Articolo & Video
  const [articleId, setArticleId] = useState(editId || null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("Vita scolastica");
  const [contentHtml, setContentHtml] = useState("");
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Stato Video / Reel
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Configurazione Pagina & Layout
  const [pageLayout, setPageLayout] = useState("dynamic");
  const [fontFamily, setFontFamily] = useState("font-sans");
  const [fontSize, setFontSize] = useState("16px");
  const [editorTheme, setEditorTheme] = useState("dark");

  // Stato Interfaccia
  const [mode, setMode] = useState("editor"); // 'editor' | 'video' | 'preview' | 'import'
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  // Canvas ContentEditable
  const editorRef = useRef(null);

  // Modale Immagine Inline
  const [showImageModal, setShowImageModal] = useState(false);
  const [inlineImageUrl, setInlineImageUrl] = useState("");
  const [inlineImageCaption, setInlineImageCaption] = useState("");
  const inlineImageInputRef = useRef(null);

  // Modale IA Co-pilota
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiActionType, setAiActionType] = useState("custom");
  const [aiPrompt, setAiPrompt] = useState("");
  const [customTone, setCustomTone] = useState("Dinamico e Giovanile per studenti");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Modale Importazione File
  const [docFile, setDocFile] = useState(null);
  const [keepAllInfo, setKeepAllInfo] = useState(true);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);

  const categoriesList = [
    "Vita scolastica", "Gossip", "Hot", "Attualità", "Tecnologia",
    "Sport", "Cultura", "Interviste", "Eventi", "Mondo", "Politica",
    "Gaming", "Musica", "Cinema",
  ];

  const themeClasses = {
    dark: { bg: "bg-[#141417]", text: "text-zinc-100", border: "border-zinc-800", placeholder: "text-zinc-500" },
    light: { bg: "bg-white", text: "text-zinc-900", border: "border-zinc-200", placeholder: "text-zinc-400" },
    sepia: { bg: "bg-[#FAF3E0]", text: "text-[#3D3228]", border: "border-[#E4D5B7]", placeholder: "text-[#A8987E]" },
  };

  const currentTheme = themeClasses[editorTheme];

  // Upload file su Supabase Storage (Bucket 'article-covers')
  const uploadImageToStorage = async (file) => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("article-covers")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      throw new Error("Impossibile caricare l'immagine nel cloud: " + uploadError.message);
    }

    const { data } = supabase.storage
      .from("article-covers")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  useEffect(() => {
    if (mode === "editor" && editorRef.current && contentHtml !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = contentHtml;
      updateMetrics();
    }
  }, [mode, contentHtml]);

  useEffect(() => {
    async function loadArticle() {
      if (!editId) return;

      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", editId)
        .single();

      if (!error && data) {
        setArticleId(data.id);
        setTitle(data.title || "");
        setSubtitle(data.subtitle || "");
        setCategory(data.category || "Vita scolastica");
        setCoverPreview(data.cover_url || null);
        setContentHtml(data.content || "");
        setVideoUrl(data.video_url || "");
        if (data.is_video) setMode("video");
        if (data.updated_at) {
          setLastSavedTime(new Date(data.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    }

    loadArticle();
  }, [editId]);

  const handleDirectVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('videos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      setVideoUrl(publicUrl);
    } catch (err) {
      alert("⚠️ Errore caricamento video: " + err.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const readTextFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const insertHTMLBlock = (htmlContent) => {
    executeCommand("insertHTML", htmlContent);
  };

  const handleInsertInlineImage = (url, caption = "") => {
    if (!url) return;
    const imgHtml = `
      <figure style="margin: 20px 0; text-align: center;">
        <img src="${url}" alt="${caption}" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: block; margin: 0 auto;" />
        ${caption ? `<figcaption style="font-size: 12px; opacity: 0.7; margin-top: 6px; font-style: italic;">${caption}</figcaption>` : ""}
      </figure>
      <p><br></p>
    `;
    insertHTMLBlock(imgHtml);
    setShowImageModal(false);
    setInlineImageUrl("");
    setInlineImageCaption("");
  };

  const handleInlineImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const publicUrl = await uploadImageToStorage(file);
      handleInsertInlineImage(publicUrl, file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      alert("⚠️ " + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // SALVATAGGIO BOZZA
  const handleSaveDraft = async () => {
    setIsDrafting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("⚠️ Accedi per salvare la bozza.");
        router.push("/login");
        return;
      }

      const payload = {
        user_id: user.id,
        title: title.trim() || "Bozza Senza Titolo",
        subtitle: subtitle.trim() || null,
        category: category,
        content: contentHtml,
        cover_url: coverPreview || null,
        video_url: videoUrl || null,
        is_video: !!videoUrl || category === "Video",
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      if (articleId) payload.id = articleId;

      const { data, error } = await supabase
        .from("articles")
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      if (data?.id) setArticleId(data.id);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      alert("⚠️ Errore salvataggio: " + err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  // PUBBLICAZIONE
  const handlePublish = async () => {
    if (!title.trim()) {
      alert("⚠️ Inserisci un titolo prima di pubblicare.");
      return;
    }

    if (!videoUrl && !contentHtml.trim()) {
      alert("⚠️ Inserisci il testo dell'articolo o carica un video prima di pubblicare.");
      return;
    }

    setIsPublishing(true);

    try {
      const modRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "moderate",
          prompt: title,
          existingContent: contentHtml || subtitle || "Contenuto Video",
        }),
      });

      const modData = await modRes.json();

      if (!modData.safe) {
        alert(`⛔ CONTENUTO RESPINTO DALLA MODERAZIONE:\n\n${modData.reason || "Contenuto non idoneo alla pubblicazione scolastica."}`);
        setIsPublishing(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("⚠️ Accedi per pubblicare l'articolo.");
        router.push("/login");
        return;
      }

      const payload = {
        user_id: user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        category: category,
        content: contentHtml,
        cover_url: coverPreview || null,
        video_url: videoUrl || null,
        is_video: !!videoUrl || category === "Video",
        status: "published",
        updated_at: new Date().toISOString(),
      };

      if (articleId) payload.id = articleId;

      const { error } = await supabase.from("articles").upsert(payload);
      if (error) throw error;

      setPublishedSuccess(true);
      setTimeout(() => router.push("/profilo"), 1200);
    } catch (err) {
      alert("⚠️ Errore pubblicazione: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // EXECUTE IA COPILOT
  const handleRunAiCopilot = async () => {
    setIsAiGenerating(true);

    try {
      let finalPrompt = aiPrompt;
      if (aiActionType === "rewrite") {
        finalPrompt = `Riformula e arricchisci questo testo mantenendo un registro accattivante e scorrevole. Correggi la grammatica e formattalo in modo magistrale:\n\n"${contentHtml}"`;
      } else if (aiActionType === "expand") {
        finalPrompt = `Espandi e approfondisci le idee contenute in questo testo fornendo dettagli, contesto e nuove chiavi di lettura articolate:\n\n"${contentHtml}"`;
      } else if (aiActionType === "summary") {
        finalPrompt = `Crea un sottotitolo o sommario efficace in 2 frasi ad impatto basato su questo testo:\n\n"${contentHtml}"`;
      } else if (aiActionType === "titles") {
        finalPrompt = `Genera 3 titoli ad alto impatto per questo articolo:\n\n"${contentHtml}"`;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          type: "custom",
          actionType: aiActionType,
          existingContent: contentHtml,
          customTone: customTone,
        }),
      });

      const data = await res.json();

      if (res.ok && data.text) {
        let generated = data.text;

        if (aiActionType === "summary") {
          setSubtitle(generated.replace(/^"+|"+$/g, '').replace(/<[^>]*>?/gm, ''));
        } else if (aiActionType === "titles") {
          const firstTitle = generated.split('\n')[0].replace(/^[\d.-]+\s*/, '').replace(/^"+|"+$/g, '').replace(/<[^>]*>?/gm, '');
          if (firstTitle) setTitle(firstTitle);
        } else if (aiActionType === "rewrite" || aiActionType === "expand") {
          setContentHtml(generated);
        } else {
          setContentHtml((prev) => prev + (prev ? "<br/><br/>" : "") + generated);
        }

        setShowAiModal(false);
        setAiPrompt("");
      } else {
        alert(`⚠️ Errore IA: ${data.error || "Impossibile elaborare"}`);
      }
    } catch {
      alert("⚠️ Impossibile contattare il server AI.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // ANALISI E CONVERSIONE DOCUMENTI
  const handleAnalyzeFileWithAi = async () => {
    if (!docFile) return;
    setIsAnalyzingFile(true);

    try {
      const fileName = docFile.name.toLowerCase();

      // File di testo semplice
      if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
        const textRaw = await readTextFile(docFile);
        const lines = textRaw.split('\n');
        let extractedTitle = docFile.name.replace(/\.[^/.]+$/, "");
        let bodyContent = textRaw;

        if (lines[0] && (lines[0].startsWith("# ") || lines[0].length < 80)) {
          extractedTitle = lines[0].replace("# ", "").trim();
          bodyContent = lines.slice(1).join('\n').trim();
        }

        setTitle(extractedTitle);
        setContentHtml(`<p>${bodyContent.replace(/\n\n/g, '</p><p>')}</p>`);
        setDocFile(null);
        setMode("editor");
        setIsAnalyzingFile(false);
        return;
      }

      // Analisi avanzata PDF / Word
      const base64File = await convertFileToBase64(docFile);
      
      let mimeType = docFile.type;
      if (!mimeType) {
        if (fileName.endsWith(".pdf")) mimeType = "application/pdf";
        else if (fileName.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (fileName.endsWith(".doc")) mimeType = "application/msword";
        else mimeType = "application/pdf";
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "from_file",
          fileData: base64File,
          mimeType: mimeType,
          keepAllInfo,
          customTone,
        }),
      });

      const data = await res.json();

      if (res.ok && data) {
        if (data.title) setTitle(data.title);
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.cover_url) setCoverPreview(data.cover_url);
        if (data.content) setContentHtml(data.content);

        setDocFile(null);
        setMode("editor");
      } else {
        alert(`⚠️ Errore nell'analisi del file: ${data.error || "Formato non supportato"}`);
      }
    } catch (err) {
      alert("⚠️ Impossibile analizzare il file: " + err.message);
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  const onDropCover = useCallback(async (acceptedFiles) => {
    if (acceptedFiles[0]) {
      setIsUploadingImage(true);
      try {
        const publicUrl = await uploadImageToStorage(acceptedFiles[0]);
        setCoverPreview(publicUrl);
      } catch (err) {
        alert("⚠️ " + err.message);
      } finally {
        setIsUploadingImage(false);
      }
    }
  }, []);

  const { getRootProps: getCoverRP, getInputProps: getCoverIP, isDragActive: isCoverDA } = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
    onDrop: onDropCover,
  });

  const onDropDoc = useCallback((acc) => { if (acc[0]) setDocFile(acc[0]) }, []);
  const { getRootProps: getDocRP, getInputProps: getDocIP, isDragActive: isDocDA } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles: 1,
    onDrop: onDropDoc,
  });

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const updateMetrics = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    setCharCount(text.length);
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans antialiased">
      <header className="bg-[#111115] border-b border-zinc-800/80 sticky top-0 z-40 shadow-xl">
        <div className="px-6 py-2 flex items-center justify-between border-b border-zinc-800/60">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/profilo")} className="text-xs text-zinc-400 hover:text-white transition font-medium">← Profilo</button>
            <span className="text-zinc-700">|</span>
            <span className="font-serif font-bold text-[#C5A46D] text-sm tracking-wide">Salvemini Studio Pro</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#0A0A0C] border border-zinc-800 p-0.5 rounded-xl text-xs">
              <button onClick={() => setPageLayout("dynamic")} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${pageLayout === "dynamic" ? "bg-[#C5A46D] text-black" : "text-zinc-400 hover:text-white"}`}>📜 Pagina Singola</button>
              <button onClick={() => setPageLayout("a4")} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${pageLayout === "a4" ? "bg-[#C5A46D] text-black" : "text-zinc-400 hover:text-white"}`}>📄 Fogli A4</button>
            </div>

            <div className="text-xs font-mono">
              {lastSavedTime ? (
                <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/50">✓ Salvato alle {lastSavedTime}</span>
              ) : (
                <span className="text-zinc-500">Bozza non salvata</span>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-2 flex flex-wrap items-center justify-between gap-3 bg-[#16161C] overflow-x-auto no-scrollbar">
          <div className="flex bg-[#0A0A0C] border border-zinc-800 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button onClick={() => setMode("editor")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${mode === "editor" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"}`}><PenLine size={14} /> Scrittura</button>
            <button onClick={() => setMode("video")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${mode === "video" ? "bg-red-950/80 text-red-400 border border-red-800/60 shadow" : "text-zinc-400 hover:text-white"}`}><Video size={14} /> Video / Reel</button>
            <button onClick={() => setMode("preview")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${mode === "preview" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"}`}><LayoutTemplate size={14} /> Anteprima</button>
            <button onClick={() => setMode("import")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${mode === "import" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"}`}><Download size={14} /> Importa File</button>
          </div>

          {mode === "editor" && (
            <div className="flex items-center gap-1 bg-[#0A0A0C] border border-zinc-800 p-1.5 rounded-xl shrink-0">
              <button onClick={() => executeCommand("bold")} className="p-1.5 text-zinc-400 hover:text-white rounded-md" title="Grassetto"><Bold size={15} /></button>
              <button onClick={() => executeCommand("italic")} className="p-1.5 text-zinc-400 hover:text-white rounded-md" title="Corsivo"><Italic size={15} /></button>
              <button onClick={() => executeCommand("underline")} className="p-1.5 text-zinc-400 hover:text-white rounded-md" title="Sottolineato"><Underline size={15} /></button>
              <div className="w-px h-5 bg-zinc-800 mx-1.5" />
              <button onClick={() => setShowImageModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-zinc-900 text-zinc-300 hover:text-white rounded-lg border border-zinc-700"><ImageIcon size={14} /> Immagine</button>
              <button onClick={() => { setAiActionType("custom"); setShowAiModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 ml-1 text-[11px] font-bold bg-[#1A1A1A] text-[#C5A46D] hover:bg-[#222] rounded-lg border border-[#C5A46D]/30 shadow transition"><Sparkles size={14} /> Co-pilota IA</button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs ml-auto shrink-0 bg-[#0A0A0C] border border-zinc-800 px-3 py-1.5 rounded-xl">
            <span className="text-zinc-500 font-medium">Sezione:</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-transparent text-white font-medium focus:outline-none cursor-pointer">
              {categoriesList.map((cat) => (
                <option key={cat} value={cat} className="bg-[#111115] text-white">{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 overflow-y-auto flex flex-col items-center bg-[#070709]">
        {/* MODALITÀ EDITOR SCRITTURA */}
        {mode === "editor" && (
          <div className={`w-full max-w-4xl ${currentTheme.bg} ${currentTheme.text} rounded-2xl shadow-2xl border ${currentTheme.border} p-8 sm:p-14 transition-all duration-300 min-h-[400px]`}>
            <div className="space-y-4 mb-6 border-b border-current/15 pb-6">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo dell'Articolo..."
                className={`w-full text-3xl sm:text-4xl font-serif font-bold ${currentTheme.text} ${currentTheme.placeholder} border-b border-current/20 pb-2 focus:outline-none bg-transparent`}
              />

              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Sottotitolo o sommario dell'articolo..."
                className={`w-full text-lg font-serif italic text-[#C5A46D] ${currentTheme.placeholder} border-b border-current/10 pb-2 focus:outline-none bg-transparent`}
              />

              {isUploadingImage ? (
                <div className="h-40 rounded-xl border border-dashed border-[#C5A46D] bg-[#C5A46D]/10 flex items-center justify-center gap-2 text-xs font-bold text-[#C5A46D]">
                  <Loader2 className="animate-spin" size={18} /> Caricamento immagine su Supabase Cloud...
                </div>
              ) : coverPreview ? (
                <div className="relative rounded-xl overflow-hidden h-56 border border-current/20 group my-4">
                  <img src={coverPreview} alt="Copertina" className="w-full h-full object-cover" />
                  <button onClick={() => setCoverPreview(null)} className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-lg text-xs shadow-lg hover:bg-red-700 transition">🗑️ Rimuovi Copertina</button>
                </div>
              ) : (
                <div {...getCoverRP()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${isCoverDA ? "border-[#C5A46D] bg-[#C5A46D]/10" : "border-current/20 hover:bg-black/5"}`}>
                  <input {...getCoverIP()} />
                  <p className="text-xs opacity-70 font-medium flex items-center justify-center gap-2"><ImageIcon size={16} /> Clicca o trascina per caricare la copertina dal PC</p>
                </div>
              )}
            </div>

            <div
              ref={editorRef}
              contentEditable
              onInput={() => { updateMetrics(); if (editorRef.current) setContentHtml(editorRef.current.innerHTML); }}
              style={{ fontSize: fontSize }}
              className={`w-full min-h-[250px] focus:outline-none leading-relaxed ${fontFamily}`}
            />
          </div>
        )}

        {/* MODALITÀ UPLOAD VIDEO */}
        {mode === "video" && (
          <div className="w-full max-w-2xl bg-[#141417] border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl self-center my-auto">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white flex justify-center items-center gap-2">
                <Video size={24} className="text-red-400" /> Carica Video / Reel
              </h2>
              <p className="text-xs text-zinc-400">Pubblica un filmato per la sezione Salvemini TV.</p>
            </div>

            <div className="space-y-4">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo del Video..." className="w-full bg-[#0A0A0C] border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#C5A46D]" />
              <textarea rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Descrizione breve..." className="w-full bg-[#0A0A0C] border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#C5A46D]" />
              <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 text-center space-y-3 bg-[#0D0D10]">
                <UploadCloud size={32} className="mx-auto text-[#C5A46D]" />
                <input type="file" accept="video/*" onChange={handleDirectVideoUpload} className="hidden" id="video-file-input" />
                <label htmlFor="video-file-input" className="inline-block bg-[#C5A46D] text-black px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition">
                  {isUploadingVideo ? "Caricamento in corso..." : "📁 Sfoglia File Video"}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* MODALITÀ ANTEPRIMA */}
        {mode === "preview" && (
          <div className={`w-full max-w-4xl ${currentTheme.bg} ${currentTheme.text} rounded-2xl shadow-2xl border ${currentTheme.border} p-8 sm:p-12 min-h-[600px] space-y-6`}>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4B47C] bg-[#C5A46D]/15 px-3 py-1 rounded-full border border-[#C5A46D]/30">{category}</span>
            <h1 className="text-4xl font-serif font-bold leading-tight">{title || "Senza Titolo"}</h1>
            {subtitle && <p className="text-xl font-serif italic text-[#C5A46D]">{subtitle}</p>}
            {coverPreview && <div className="w-full h-80 rounded-2xl overflow-hidden border border-current/20"><img src={coverPreview} alt="Copertina" className="w-full h-full object-cover" /></div>}
            <div className={`leading-relaxed ${fontFamily}`} style={{ fontSize: fontSize }} dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </div>
        )}

        {/* MODALITÀ IMPORTAZIONE DOCUMENTO */}
        {mode === "import" && (
          <div className="w-full max-w-2xl bg-[#141417] border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl self-center my-auto">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white flex justify-center items-center gap-2">
                <FileText size={24} /> Importa Documento (PDF / Word)
              </h2>
              <p className="text-xs text-zinc-400">
                Converti e impagina automaticamente file PDF, Word (.docx), TXT o Markdown in un articolo completo.
              </p>
            </div>

            <div {...getDocRP()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${isDocDA ? "border-[#C5A46D] bg-[#C5A46D]/10" : "border-zinc-800 hover:bg-zinc-900"}`}>
              <input {...getDocIP()} />
              <FileText size={40} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-bold text-white">{docFile ? docFile.name : "Trascina qui il file PDF o Word"}</p>
            </div>

            {docFile && (
              <div className="bg-[#0A0A0C] border border-zinc-800 p-5 rounded-2xl space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={keepAllInfo} onChange={(e) => setKeepAllInfo(e.target.checked)} className="mt-1 accent-[#C5A46D]" />
                  <div>
                    <p className="text-xs font-bold text-white">Conserva integralmente tutto il contenuto originale</p>
                    <p className="text-[11px] text-zinc-500">Mantiene l'esattezza e la completezza delle informazioni nel documento.</p>
                  </div>
                </label>

                <button onClick={handleAnalyzeFileWithAi} disabled={isAnalyzingFile} className="w-full bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold py-3 rounded-xl text-xs transition disabled:opacity-50 shadow">
                  {isAnalyzingFile ? "Analisi ed elaborazione del documento in corso..." : "🚀 Converti e Apri nell'Editor"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-[#111115] border-t border-zinc-800 px-6 py-3 sticky bottom-0 z-40 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
          <span>Parole: <strong className="text-white">{wordCount}</strong></span>
          <span>Caratteri: <strong className="text-white">{charCount}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSaveDraft} disabled={isDrafting} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50">
            {isDrafting ? "Salvataggio..." : "💾 Salva Bozza"}
          </button>
          <button onClick={handlePublish} disabled={isPublishing || publishedSuccess} className="bg-[#C5A46D] hover:bg-[#b5935c] text-black px-6 py-2 rounded-xl text-xs font-bold transition shadow-lg disabled:opacity-50">
            {isPublishing ? "Verifica AI..." : publishedSuccess ? "✅ Pubblicato!" : "🚀 Pubblica Ora"}
          </button>
        </div>
      </footer>

      {/* MODALE IMMAGINE INLINE */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><ImageIcon size={18} className="text-[#C5A46D]" /> Inserisci Immagine nel Foglio</h3>
              <button onClick={() => setShowImageModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium block">Da file locale:</label>
              <input type="file" ref={inlineImageInputRef} accept="image/*" onChange={handleInlineImageFileUpload} className="hidden" />
              <button onClick={() => inlineImageInputRef.current?.click()} disabled={isUploadingImage} className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2">
                {isUploadingImage ? <Loader2 className="animate-spin" size={16} /> : "📁 Sfoglia e Carica nel Cloud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CO-PILOTA IA */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#C5A46D]" /> Co-pilota IA Redazione
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "custom", label: "Prompt Libero" },
                { id: "rewrite", label: "Riformula Testo" },
                { id: "expand", label: "Espandi Concetto" },
                { id: "summary", label: "Crea Sottotitolo" },
                { id: "titles", label: "Genera Titoli" },
              ].map((act) => (
                <button
                  key={act.id}
                  onClick={() => setAiActionType(act.id)}
                  className={`p-2.5 rounded-xl border text-left transition font-semibold ${
                    aiActionType === act.id
                      ? "bg-[#C5A46D]/20 text-[#D4B47C] border-[#C5A46D]"
                      : "bg-[#0A0A0C] border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>

            {aiActionType === "custom" && (
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Cosa desideri generare?</label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Es. Scrivi un approfondimento sui recenti sviluppi tecnologici..."
                  className="w-full bg-[#0A0A0C] border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#C5A46D]"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Tono Editoriale</label>
              <select
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-zinc-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-[#C5A46D]"
              >
                <option value="Dinamico e Giovanile per studenti" className="bg-[#111115] text-white">Dinamico e Giovanile (Studenti)</option>
                <option value="Formale e Informativo" className="bg-[#111115] text-white">Formale e Informativo</option>
                <option value="Creativo e Narrativo" className="bg-[#111115] text-white">Creativo e Narrativo</option>
                <option value="Oggettivo e Giornalistico" className="bg-[#111115] text-white">Oggettivo e Giornalistico</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button onClick={() => setShowAiModal(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-white">Annulla</button>
              <button
                onClick={handleRunAiCopilot}
                disabled={isAiGenerating}
                className="bg-[#C5A46D] hover:bg-[#b5935c] text-black font-bold px-5 py-2 rounded-xl text-xs transition disabled:opacity-50"
              >
                {isAiGenerating ? "Elaborazione..." : "Genera con Gemini"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RedazionePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070709] flex items-center justify-center text-zinc-400">Caricamento Studio...</div>}>
      <RedazioneWorkspace />
    </Suspense>
  );
}