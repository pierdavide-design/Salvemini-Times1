import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const maxDuration = 60;

function extractImagesFromPdf(pdfBuffer) {
  const images = [];
  const seenSizes = new Set();
  const startMarker = Buffer.from([0xff, 0xd8, 0xff]);
  const endMarker = Buffer.from([0xff, 0xd9]);

  let pos = 0;
  while (pos < pdfBuffer.length && images.length < 8) {
    const start = pdfBuffer.indexOf(startMarker, pos);
    if (start === -1) break;

    const end = pdfBuffer.indexOf(endMarker, start + 3);
    if (end === -1) break;

    const imgBuffer = pdfBuffer.subarray(start, end + 2);
    if (imgBuffer.length > 8000 && !seenSizes.has(imgBuffer.length)) {
      seenSizes.add(imgBuffer.length);
      images.push(`data:image/jpeg;base64,${imgBuffer.toString("base64")}`);
    }
    pos = end + 2;
  }
  return images;
}

export async function POST(req) {
  try {
    if (!apiKey || !genAI) {
      return NextResponse.json(
        { error: "Chiave GEMINI_API_KEY mancante nel file di configurazione." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
    }

    const {
      prompt = "",
      type = "custom",
      actionType = "custom", // Passato dal frontend per capire cosa chiede l'utente
      existingContent = "",
      fileData = null,
      mimeType = "application/pdf",
      keepAllInfo = false,
      customTone = "Dinamico e Giovanile per studenti",
    } = body;

    // ==========================================
    // 1. MODALITÀ MODERAZIONE CONTENUTI
    // ==========================================
    if (type === "moderate") {
      const moderationModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: { temperature: 0.0, responseMimeType: "application/json" },
      });

      const moderationPrompt = `Analizza questo articolo:
TITOLO: "${prompt}"
TESTO: "${existingContent}"

Rispondi esclusivamente con un JSON: {"safe": true/false, "reason": "Spiegazione..."}`;

      const modResult = await moderationModel.generateContent(moderationPrompt);
      const modResponse = await modResult.response;
      try {
        return NextResponse.json(JSON.parse(modResponse.text()), { status: 200 });
      } catch {
        return NextResponse.json({ safe: true, reason: "" }, { status: 200 });
      }
    }

    // ==========================================
    // 2. ANALISI E IMPAGINAZIONE DOCUMENTI (PDF/WORD)
    // ==========================================
    if (type === "from_file" && fileData) {
      const pdfModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: { temperature: keepAllInfo ? 0.0 : 0.3, responseMimeType: "application/json" },
      });

      let pdfImages = [];
      try {
        const pdfBuffer = Buffer.from(fileData, "base64");
        pdfImages = extractImagesFromPdf(pdfBuffer);
      } catch (err) {
        console.warn("⚠️ Errore estrazione immagini PDF:", err);
      }

      const filePart = { inlineData: { data: fileData, mimeType: mimeType || "application/pdf" } };

      const systemPrompt = `Sei il Caporedattore del giornale 'Salvemini Times'.
Il tuo compito è prendere il documento ed impaginarlo.

REGOLE DI CONTENUTO E TESTO:
${keepAllInfo ? "TRASCRIZIONE TOTALE (VERBATIM): Non eliminare nulla." : `RIELABORAZIONE: Mantieni un tono ${customTone}.`}

REGOLE DI IMPAGINAZIONE HTML OBBIGATORIE:
- Spezza il testo in paragrafi brevi avvolti in <p>...</p>.
- Inserisci sottotitoli di sezione con <h2>...</h2>.
- Metti in <strong>...</strong> parole chiave e frasi ad effetto.
- Usa <blockquote>...</blockquote> per citazioni.
- Usa [PDF_IMAGE_1], [PDF_IMAGE_2] per i segnaposto immagini.

Restituisci TASSATIVAMENTE un oggetto JSON con: title, subtitle, content, cover_query.`;

      const result = await pdfModel.generateContent([filePart, systemPrompt]);
      const jsonOutput = JSON.parse(result.response.text());

      let finalContent = jsonOutput.content || "";
      let coverUrl = null;

      if (pdfImages.length > 0) {
        coverUrl = pdfImages[0];
        pdfImages.forEach((imgDataUrl, index) => {
          const imgHtml = `<figure style="margin: 24px 0; text-align: center;"><img src="${imgDataUrl}" style="max-width: 100%; border-radius: 12px; display: block; margin: 0 auto;" /><figcaption style="font-size: 12px; opacity: 0.7; margin-top: 8px; font-style: italic;">Figura ${index + 1}</figcaption></figure><p><br></p>`;
          finalContent = finalContent.replace(new RegExp(`\\[PDF_IMAGE_${index + 1}\\]`, "g"), imgHtml);
        });
        finalContent = finalContent.replace(/\[PDF_IMAGE_\d+\]/g, "");
      } else if (jsonOutput.cover_query) {
        const query = encodeURIComponent(jsonOutput.cover_query.trim());
        coverUrl = `https://image.pollinations.ai/prompt/${query}?model=flux&width=1200&height=600&nologo=true`;
      }

      return NextResponse.json({
        title: jsonOutput.title || "Articolo Redazione",
        subtitle: jsonOutput.subtitle || "",
        cover_url: coverUrl,
        content: finalContent,
      }, { status: 200 });
    }

    // ==========================================
    // 3. CO-PILOTA IA SCRITTURA (ORA CON REGOLE HTML EDITORIALI!)
    // ==========================================
    if (type === "custom") {
      const customModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: { temperature: 0.6 },
      });

      let systemPrompt = "";

      // Se l'utente chiede un Sottotitolo o Titoli, diamo solo testo semplice
      if (actionType === "summary" || actionType === "titles") {
        systemPrompt = `Sei l'Art Director del giornale 'Salvemini Times'. Usa tono: "${customTone}".
RISPONDI SOLO CON IL TESTO RICHIESTO, SENZA NESSUN CODICE HTML E SENZA PREMESSE.`;
      } else {
        // Se chiede di Scrivere, Riformulare o Espandere, forziamo il formato editoriale
        systemPrompt = `Sei il Caporedattore del giornale scolastico 'Salvemini Times'.
Devi scrivere, elaborare o riformulare il testo con questo tono: "${customTone}".

REGOLE DI FORMATTAZIONE HTML OBBIGATORIE (TASSATIVE):
- Restituisci ESCLUSIVAMENTE codice HTML pronto per essere iniettato nell'editor. NON USARE blocchi markdown (non scrivere \`\`\`html all'inizio).
- Usa <p> per isolare i paragrafi. Dividi i muri di testo in paragrafi ariosi.
- Usa <h2> e <h3> per evidenziare i cambi di argomento o sottotitoli interni.
- Usa <strong> per enfatizzare concetti chiave, dati, frasi salienti.
- Usa <blockquote> per citazioni o dichiarazioni importanti.
- Usa <ul> e <li> per elenchi.
- Non inserire tag <body> o <html>. Inizia direttamente con i tag di contenuto.`;
      }

      const finalPrompt = `Richiesta: ${prompt}\n\nContesto attuale dell'articolo su cui lavorare:\n${existingContent}`;

      const result = await customModel.generateContent([systemPrompt, finalPrompt]);
      
      // Pulizia dei backtick markdown nel caso l'IA si sbagli
      let generatedText = result.response.text().replace(/```html|```/gi, "").trim();

      return NextResponse.json({ text: generatedText }, { status: 200 });
    }

  } catch (error) {
    console.error("❌ Errore API Generate:", error);
    return NextResponse.json({ error: error.message || "Errore generazione" }, { status: 500 });
  }
}