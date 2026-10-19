import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function GET(req) {
  try {
    if (!apiKey || !genAI) {
      return NextResponse.json({ error: "API Key mancante" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const hasExam = searchParams.get("verifica") === "true";

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        temperature: 0.85,
        responseMimeType: "application/json",
      },
    });

    const contextInstruction = hasExam
      ? "GLI STUDENTI HANNO VERIFICHE/INTERROGAZIONI IMMINENTI: focalizza le previsioni su tattiche di sopravvivenza, bigliettini, sguardi d'intesa, vuoti di memoria e tentativi di depistaggio."
      : "GLI STUDENTI NON HANNO VERIFICHE QUESTA SETTIMANA: focalizza le previsioni sul relax, sonno arretrato, ricreazioni prolungate e la costante paranoia che il professore decida improvvisamente di spiegare 5 capitoli.";

    const prompt = `Sei uno studente irriverente dell'ultimo anno che cura l'Oroscopo Scolastico per 'Salvemini Times'.
CONTESTO ATTUALE: ${contextInstruction}

Genera le previsioni per le 5 "Tribù Scolastiche":
1. "I Pendolari" (Bus delle 7:00)
2. "Gli Impreparati" (Gli esperti del volontariato strategico)
3. "I Primo Banco" (I secchioni di prima fila)
4. "I Rappresentanti" (Sempre in riunione)
5. "Quelli dell'Ultimo Banco" (I filosofi della ricreazione)

Restituisci TASSATIVAMENTE un array JSON:
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
    const jsonOutput = JSON.parse(response.text());

    return NextResponse.json(jsonOutput, { status: 200 });
  } catch (error) {
    console.error("Errore oroscopo:", error);
    return NextResponse.json(
      [
        { tribu: "I Pendolari", icon: "🚌", previsione: "Il bus in ritardo ti salverà la prima ora. Approfittane per ripassare o dormire sul finestrino.", voto: "6/10" },
        { tribu: "Gli Impreparati", icon: "🫣", previsione: "Il professore scorrerà il registro col dito. Mantieni un contatto visivo fermo per fingere sicurezza.", voto: "4/10" },
        { tribu: "I Primo Banco", icon: "🤓", previsione: "Ricordare al prof che c'erano i compiti potrebbe costarti la stima di tutta la classe.", voto: "8/10" },
        { tribu: "I Rappresentanti", icon: "🗳️", previsione: "Riunione d'emergenza sul prezzo delle merendine. Ore saltate: 2. Vittoria totale.", voto: "10/10" },
        { tribu: "Ultimo Banco", icon: "🛋️", previsione: "Il torneo clandestino di tris raggiungerà vette agonistiche mai viste prima.", voto: "7/10" }
      ],
      { status: 200 }
    );
  }
}