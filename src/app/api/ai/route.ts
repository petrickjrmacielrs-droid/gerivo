import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ connected: false, error: "OPENAI_API_KEY não configurada." }, { status: 503 });
  try {
    const body = await request.json();
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
    const prompt = [
      "Você é o Assistente Gerivo, analista de uma pequena ou média empresa brasileira.",
      "Responda em português do Brasil, com objetividade, sem inventar dados e sem expor informações de outras empresas.",
      `Empresa: ${String(body.company || "Empresa")}`,
      `Resumo operacional: ${JSON.stringify(body.summary || {})}`,
      `Conhecimento cadastrado: ${JSON.stringify(body.knowledge || [])}`,
      `Pergunta: ${String(body.question || "")}`,
    ].join("\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: prompt, store: false }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ connected: false, error: payload?.error?.message || "Falha na IA online." }, { status: response.status });
    const answer = String(payload.output_text || "").trim();
    if (!answer) return NextResponse.json({ connected: false, error: "A IA não retornou texto." }, { status: 502 });
    return NextResponse.json({ connected: true, answer, model });
  } catch (error) {
    return NextResponse.json({ connected: false, error: error instanceof Error ? error.message : "Falha na IA online." }, { status: 500 });
  }
}
