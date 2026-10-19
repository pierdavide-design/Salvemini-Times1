import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const maxDuration = 60;

// Estrattore di immagini dal PDF per ricavare la copertina e le illustrazioni interne
function extractValidRgbJpegsFromPdf(pdfBuffer) {
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
    pos = end + 2;

    // Soglia a 5KB per catturare sia le immagini di copertina del PDF che le foto interne
    if (imgBuffer.length < 5000 || seenSizes.has(imgBuffer.length)) continue;

    let isRgbPhoto = false;
    for (let p = 2; p < Math.min(imgBuffer.length - 10, 500); p++) {
      if (imgBuffer[p] === 0xff && (imgBuffer[p + 1] === 0xc0 || imgBuffer[p + 1] === 0xc2)) {
        if (imgBuffer[p + 9] === 3) { // 3 canali colore RGB
          isRgbPhoto = true;
        }
        break;
      }
    }

    if (isRgbPhoto) {
      seenSizes.add(imgBuffer.length);
      images.push(`data:image/jpeg;base64,${imgBuffer.toString("base64")}`);
    }
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
      actionType = "custom",
      existingContent = "",
      fileData = null,
      mimeType = "application/pdf",
      keepAllInfo = true,
      customTone = "Dinamico e Giovanile per studenti",
    } = body;

    // ==========================================
    // 1. MODERAZIONE CONTENUTI SCOLASTICI
    // ==========================================
    if (type === "moderate") {
      const moderationModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        },
      });

      const moderationPrompt = `Sei il filtro di moderazione del giornale scolastico 'Salvemini Times'.
Analizza il seguente contenuto per verificare che non contenga incitamento all'odio, violenza, materiale esplicito o diffamazione.

TITOLO: "${prompt}"
TESTO: "${existingContent}"

Rispondi TASSATIVAMENTE con questo JSON: {"safe": true/false, "reason": "Motivazione breve se non sicuro..."}`;

      const modResult = await moderationModel.generateContent(moderationPrompt);
      const modText = modResult.response.text();
      try {
        return NextResponse.json(JSON.parse(modText), { status: 200 });
      } catch {
        return NextResponse.json({ safe: true, reason: "" }, { status: 200 });
      }
    }

    // ==========================================
    // 2. REDAZIONE ED EDITING DOCUMENTI (PDF/WORD/TXT)
    // ==========================================
    if (type === "from_file" && fileData) {
      let pdfImages = [];

      if (mimeType.includes("pdf")) {
        try {
          const pdfBuffer = Buffer.from(fileData, "base64");
          pdfImages = extractValidRgbJpegsFromPdf(pdfBuffer);
        } catch (err) {
          console.warn("⚠️ Estrazione immagini dal PDF saltata:", err);
        }
      }

      const fileModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: { 
          temperature: keepAllInfo ? 0.0 : 0.35,
          maxOutputTokens: 8192,
          responseMimeType: "application/json" 
        },
      });

      const filePart = {
        inlineData: {
          data: fileData,
          mimeType: mimeType || "application/pdf",
        },
      };

      const textHandlingInstruction = keepAllInfo
        ? `MODALITÀ COPIA E INCOLLA (VERBATIM E FORMATTAZIONE EDITORIALE):
- DEVI RIPORTARE LE STESSE ED IDENTICHE PAROLE del testo del documento originale. Non riassumere, non parafrasare e non cambiare la struttura delle frasi.
- Il tuo unico compito è adattarle al nostro editor grafico per rendere l'articolo attraente: organizza il testo originale con paragrafi HTML, titoli di sezione e parti in grassetto.
- Rimuovi solo diciture tecniche di slide e metadati esterni (es: "Slide 1/20", "www.didatticarte.it", numeri di pagina).
- Genera un NUOVO TITOLO e NUOVO SOTTOTITOLO d'impatto ed eleganti per l'intestazione.`
        : `MODALITÀ RIELABORAZIONE EDITORIALE:
- Rielabora il contenuto del documento in un articolo di giornale fluido, completo e coinvolgente con tono: ${customTone}.
- Crea un'intestazione e un sottotitolo nuovi e accattivanti.`;

      const systemPrompt = `Sei il Caporedattore del giornale scolastico 'Salvemini Times'.

${textHandlingInstruction}

REGOLE DI IMPAGINAZIONE HTML PER RENDERE IL TESTO ATTRAENTE (campo 'content'):
- Dividi il testo in paragrafi leggibili con <p>...</p>.
- Inserisci titoli di sezione con <h2>...</h2> e <h3>...</h3> nei punti di stacco logico.
- Evidenzia in <strong>...</strong> le parole e i concetti chiave.
- Usa <blockquote>...</blockquote> per citazioni o frasi di rilievo.
- Usa <ul> e <li> se sono presenti elenchi puntati.

RESTITUISCI TASSATIVAMENTE UN JSON CON QUESTE CHIAVI:
{
  "title": "Nuova intestazione / Titolo attraente per l'articolo",
  "subtitle": "Sottotitolo o sommario elegante di 1-2 frasi",
  "content": "Codice HTML del testo (fedele parola per parola se in modalità copia-incolla, ma ben formattato)"
}`;

      const result = await fileModel.generateContent([filePart, systemPrompt]);
      let rawResponse = result.response.text().replace(/```json|```/gi, "").trim();
      const jsonOutput = JSON.parse(rawResponse);

      let finalContent = jsonOutput.content || "";
      
      // La copertina viene presa DIRETTAMENTE dalla prima immagine estratta dal PDF
      let coverUrl = pdfImages.length > 0 ? pdfImages[0] : null;

      // Le eventuali immagini successive del PDF vengono impaginate lungo il testo
      if (pdfImages.length > 1) {
        pdfImages.slice(1).forEach((imgDataUrl, index) => {
          const imgHtml = `<figure style="margin: 24px 0; text-align: center;"><img src="${imgDataUrl}" style="max-width: 100%; border-radius: 12px; display: block; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);" /><figcaption style="font-size: 12px; opacity: 0.7; margin-top: 8px; font-style: italic;">Figura dal PDF (${index + 1})</figcaption></figure><p><br></p>`;
          finalContent += imgHtml;
        });
      }

      return NextResponse.json({
        title: jsonOutput.title || "Articolo Redazione",
        subtitle: jsonOutput.subtitle || "",
        cover_url: coverUrl, // Copertina estratta dal PDF
        content: finalContent,
      }, { status: 200 });
    }

    // ==========================================
    // 3. CO-PILOTA IA SCRITTURA ED EDITORIALE
    // ==========================================
    if (type === "custom") {
      const customModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: { 
          temperature: 0.6,
          maxOutputTokens: 8192
        },
      });

      let systemPrompt = "";

      if (actionType === "summary" || actionType === "titles") {
        systemPrompt = `Sei l'Art Director del giornale 'Salvemini Times'.
Genera quanto richiesto mantenendo un tono: "${customTone}".
RISPONDI SOLO ED ESCLUSIVAMENTE CON IL TESTO RICHIESTO, SENZA PREMESSE, SENZA CODICE HTML E SENZA VIRGOLETTE.`;
      } else {
        systemPrompt = `Sei un abile redattore e giornalista per il giornale scolastico 'Salvemini Times'.
Il tuo compito è aiutare l'autore a scrivere, espandere o rielaborare il testo con alta qualità editoriale.

REGOLE ESSENZIALI:
1. NATURALEZZA E STILE UMANO: Scrivi in modo fluido, coinvolgente ed espressivo. Evita frasi fatte da IA.
2. SVILUPPO APPROFONDITO: Non limitarti a riassunti striminziti.
3. TONO EDITORIALE: ${customTone}.
4. FORMATO HTML PULITO: Restituisci ESCLUSIVAMENTE tag HTML validi (<p>, <h2>, <h3>, <strong>, <blockquote>, <ul>, <li>). NON includere \`\`\`html o tag <html>/<body>.`;
      }

      const finalPrompt = `ISTRUZIONE O PROMPT: ${prompt}\n\nCONTESTO/TESTO ATTUALE:\n${existingContent}`;

      const result = await customModel.generateContent([systemPrompt, finalPrompt]);
      let generatedText = result.response.text().replace(/```html|```/gi, "").trim();

      return NextResponse.json({ text: generatedText }, { status: 200 });
    }

  } catch (error) {
    console.error("❌ Errore API Generate:", error);
    return NextResponse.json(
      { error: error.message || "Errore durante l'elaborazione con l'IA" },
      { status: 500 }
    );
  }
}