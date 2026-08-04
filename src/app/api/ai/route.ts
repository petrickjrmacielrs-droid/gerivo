import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../lib/supabase-admin";

export const runtime = "nodejs";

const ACTIVE_SUBSCRIPTION_STATUS = new Set(["ACTIVE", "GRACE", "READ_ONLY", "DEMO"]);

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function safeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function safeKnowledge(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((item: any) => ({
    title: safeText(item?.title, 180),
    content: safeText(item?.content, 3500),
  })).filter((item) => item.title || item.content);
}

function responseText(payload: any) {
  const sdkConvenienceText = safeText(payload?.output_text, 12000);
  if (sdkConvenienceText) return sdkConvenienceText;
  if (!Array.isArray(payload?.output)) return "";
  return payload.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === "output_text" && typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim()
    .slice(0, 12000);
}

async function authorizeAi(request: Request, companyId: string, storeId: string) {
  const token = bearerToken(request);
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");

  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");

  const userId = authData.user.id;
  const [{ data: profile }, { data: company }, { data: store }, { data: companyMember }, { data: storeMember }] = await Promise.all([
    admin.from("profiles").select("platform_role, active").eq("id", userId).maybeSingle(),
    admin.from("companies").select("id, name, active, status").eq("id", companyId).maybeSingle(),
    admin.from("stores").select("id, company_id, name, active").eq("id", storeId).eq("company_id", companyId).maybeSingle(),
    admin.from("company_members").select("active, role").eq("company_id", companyId).eq("user_id", userId).maybeSingle(),
    admin.from("store_members").select("active, role").eq("company_id", companyId).eq("store_id", storeId).eq("user_id", userId).maybeSingle(),
  ]);

  if (!profile?.active) throw new Error("Seu usuário está inativo.");
  const platformMaster = profile.platform_role === "MASTER";
  if (!company || !store) throw new Error("Empresa ou unidade não encontrada.");
  if (!platformMaster && (!companyMember?.active || !storeMember?.active)) {
    throw new Error("Você não possui acesso a esta empresa e unidade.");
  }
  if (!platformMaster && (!company.active || !store.active)) {
    throw new Error("A empresa ou unidade está suspensa.");
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("company_subscriptions")
    .select("id, status, modules, ai_queries_monthly, contract_end, grace_until")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) throw new Error(`Não foi possível validar a contratação: ${subscriptionError.message}`);

  if (!platformMaster) {
    if (!subscription || !ACTIVE_SUBSCRIPTION_STATUS.has(String(subscription.status || ""))) {
      throw new Error("A contratação da empresa não permite consultas à IA.");
    }
    if (!Boolean(subscription.modules?.ASSISTANT)) {
      throw new Error("O Assistente Gerivo não está contratado para esta empresa.");
    }
  }

  const monthlyLimit = platformMaster ? Number.MAX_SAFE_INTEGER : Math.max(0, Number(subscription?.ai_queries_monthly) || 0);
  if (!platformMaster && monthlyLimit <= 0) {
    throw new Error("A contratação não possui franquia de consultas à IA online.");
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("action", "AI_ONLINE_QUERY")
    .gte("created_at", startOfMonth.toISOString());
  if (countError) throw new Error(`Não foi possível verificar a franquia da IA: ${countError.message}`);

  const used = Number(count) || 0;
  if (!platformMaster && used >= monthlyLimit) {
    throw new Error(`A franquia mensal de ${monthlyLimit} consultas à IA foi atingida.`);
  }

  return {
    admin,
    userId,
    company,
    store,
    subscription,
    platformMaster,
    quota: {
      used,
      limit: platformMaster ? null : monthlyLimit,
      remaining: platformMaster ? null : Math.max(0, monthlyLimit - used),
    },
  };
}

export async function POST(request: Request) {
  let auditContext: Awaited<ReturnType<typeof authorizeAi>> | null = null;
  try {
    const body = await request.json();
    const companyId = safeText(body.companyId, 80);
    const storeId = safeText(body.storeId, 80);
    const question = safeText(body.question, 2000);
    if (!companyId || !storeId || !question) {
      return NextResponse.json({ connected: false, error: "Informe empresa, unidade e pergunta." }, { status: 400 });
    }

    auditContext = await authorizeAi(request, companyId, storeId);

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ connected: false, error: "OPENAI_API_KEY não configurada. O motor local continua disponível." }, { status: 503 });
    }

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
    const knowledge = safeKnowledge(body.knowledge);
    const summary = body.summary && typeof body.summary === "object" ? JSON.stringify(body.summary).slice(0, 16000) : "{}";
    const prompt = [
      "Você é o Assistente Gerivo, analista operacional de uma empresa brasileira.",
      "Responda em português do Brasil, de forma objetiva, comercialmente responsável e sem inventar dados.",
      "Use apenas os dados e conhecimentos fornecidos. Quando faltar confirmação, sinalize claramente.",
      "Nunca invente preço, desconto, prazo, estoque, diagnóstico, garantia, aprovação ou condição de pagamento.",
      `Empresa validada: ${auditContext.company.name}`,
      `Unidade validada: ${auditContext.store.name}`,
      `Resumo operacional autorizado: ${summary}`,
      `Conhecimentos autorizados: ${JSON.stringify(knowledge)}`,
      `Pergunta: ${question}`,
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: prompt, store: false, max_output_tokens: 900 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      await auditContext.admin.from("audit_logs").insert({
        company_id: companyId,
        store_id: storeId,
        user_id: auditContext.userId,
        action: "AI_ONLINE_ERROR",
        entity: "assistant",
        entity_id: auditContext.subscription?.id || null,
        new_value: { model, status: response.status, error_code: payload?.error?.code || null },
      });
      return NextResponse.json({ connected: false, error: payload?.error?.message || "Falha na IA online." }, { status: response.status });
    }

    const answer = responseText(payload);
    if (!answer) return NextResponse.json({ connected: false, error: "A IA não retornou texto." }, { status: 502 });

    const usage = {
      inputTokens: Number(payload?.usage?.input_tokens) || 0,
      outputTokens: Number(payload?.usage?.output_tokens) || 0,
      totalTokens: Number(payload?.usage?.total_tokens) || 0,
    };
    await auditContext.admin.from("audit_logs").insert({
      company_id: companyId,
      store_id: storeId,
      user_id: auditContext.userId,
      action: "AI_ONLINE_QUERY",
      entity: "assistant",
      entity_id: auditContext.subscription?.id || null,
      new_value: { model, usage },
    });

    const nextUsed = auditContext.quota.used + 1;
    const limit = auditContext.quota.limit;
    return NextResponse.json({
      connected: true,
      answer,
      model,
      usage,
      quota: {
        used: nextUsed,
        limit,
        remaining: limit === null ? null : Math.max(0, limit - nextUsed),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na IA online.";
    console.error("Gerivo AI:", error);
    const status = message.includes("Sessão") ? 401
      : message.includes("acesso") || message.includes("contrat") || message.includes("franquia") || message.includes("inativo") || message.includes("suspens") ? 403
      : 500;
    return NextResponse.json({ connected: false, error: message }, { status });
  }
}
