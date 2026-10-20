import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const hasExam = searchParams.get("verifica") === "true";

  try {
    if (!apiKey || !genAI) {
      throw new Error("GEMINI_API_KEY non configurata nell'ambiente.");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
      },
    });

    const contextInstruction = hasExam
      ? "GLI STUDENTI HANNO VERIFICHE E INTERROGAZIONI IMMINENTI: focalizza le previsioni su tattiche di sopravvivenza, bigliettini, sguardi d'intesa con i compagni, vuoti di memoria improvvisi, scene di panico muto e tentativi disperati di depistare il professore."
      : "GLI STUDENTI NON HANNO VERIFICHE QUESTA SETTIMANA: focalizza le previsioni su relax totale, recupero ore di sonno arretrato, ricreazioni prolungate oltre il limite ed il terrore latente che un professore decida improvvisamente di spiegare 5 capitoli di fila.";

    const prompt = `Sei uno studente irriverente dell'ultimo anno di liceo che cura l'Oroscopo Scolastico della settimana per il giornale 'Salvemini Times'.
CONTESTO SETTIMANALE: ${contextInstruction}

Genera le previsioni per le 5 "Tribù Scolastiche":
1. "I Pendolari" (Bus delle 7:00)
2. "Gli Impreparati" (Gli esperti del volontariato strategico)
3. "I Primo Banco" (I secchioni di prima fila)
4. "I Rappresentanti" (Sempre in riunione d'istituto)
5. "Quelli dell'Ultimo Banco" (I filosofi della ricreazione)

Restituisci TASSATIVAMENTE un array JSON valido con questa struttura esatta:
[
  {
    "tribu": "Nome Tribù",
    "icon": "Emoji",
    "previsione": "Testo ironico, tagliente e realistico (max 25 parole)",
    "voto": "Voto (es. '4/10', '9/10')"
  }
]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawText = response.text().trim();

    // Pulizia da blocchi di codice markdown per un parsing sicuro
    rawText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const jsonOutput = JSON.parse(rawText);

    return NextResponse.json(jsonOutput, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("⚠️ Errore API Oroscopo Gemini:", error);

    const fallbackData = hasExam
      ? [
          { tribu: "I Pendolari", icon: "🚌", previsione: "Ripasso disperato sul bus fermo al semaforo. La prima ora sarà una prova di sopravvivenza.", voto: "4/10" },
          { tribu: "Gli Impreparati", icon: "🫣", previsione: "Sguardo fisso verso il basso e penna in bocca per sembrare concentrati. Buona fortuna.", voto: "3/10" },
          { tribu: "I Primo Banco", icon: "🤓", previsione: "Avete ripassato 14 volte. Prenderete 9, ma vi lamenterete comunque per quel mezzo punto perso.", voto: "9/10" },
          { tribu: "I Rappresentanti", icon: "🗳️", previsione: "Invocate una riunione urgente d'istituto proprio durante l'ora della verifica. Geni assoluti.", voto: "10/10" },
          { tribu: "Ultimo Banco", icon: "🛋️", previsione: "L'arte del depistaggio raggiunge livelli epici. Mettete lo zaino a muro per schermarvi.", voto: "5/10" }
        ]
      : [
          { tribu: "I Pendolari", icon: "🚌", previsione: "Nessuna verifica all'orizzonte: il viaggio in bus delle 7:00 si trasforma in un sonno terapeutico.", voto: "8/10" },
          { tribu: "Gli Impreparati", icon: "🫣", previsione: "Nessun pericolo imminente. Potete finalmente respirare e godervi il bar alla ricreazione.", voto: "9/10" },
          { tribu: "I Primo Banco", icon: "🤓", previsione: "Ansia da prestazione pure senza verifiche. Trovatevi un hobby per il pomeriggio.", voto: "6/10" },
          { tribu: "I Rappresentanti", icon: "🗳️", previsione: "Oggi si discute del torneo di calcetto. Settimana di relax istituzionale.", voto: "10/10" },
          { tribu: "Ultimo Banco", icon: "🛋️", previsione: "Torneo di carte clandestino e chiacchiere: la ricreazione dura praticamente 5 ore.", voto: "10/10" }
        ];

    return NextResponse.json(fallbackData, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  }
}