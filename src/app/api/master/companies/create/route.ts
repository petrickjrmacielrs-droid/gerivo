import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

const ALLOWED_SEGMENTS = new Set([
  "OFICINA",
  "CONCESSIONARIA",
  "VAREJO",
  "CONFEITARIA",
  "SALAO_BELEZA",
  "ESTETICA_AUTOMOTIVA",
  "DELIVERY",
  "SERVICOS",
  "OUTRO",
]);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "empresa";
}

export async function POST(request: Request) {
  let createdCompanyId = "";

  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Sessão inválida. Entre novamente no Gerivo." }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sessão expirada. Entre novamente no Gerivo." }, { status: 401 });
    }

    const { data: requesterProfile, error: profileError } = await admin
      .from("profiles")
      .select("platform_role, active")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (requesterProfile?.platform_role !== "MASTER" || !requesterProfile.active) {
      return NextResponse.json({ error: "Somente o MASTER Gerivo pode cadastrar empresas." }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const requestedSegment = String(body.segment || "OUTRO").trim().toUpperCase();
    const segment = ALLOWED_SEGMENTS.has(requestedSegment) ? requestedSegment : "OUTRO";

    if (name.length < 2) {
      return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "O nome da empresa deve ter no máximo 120 caracteres." }, { status: 400 });
    }

    const companySlug = `${slugify(name)}-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const storeSlug = slugify(name);

    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({
        name,
        slug: companySlug,
        segment,
        status: "AWAITING_ACTIVATION",
        active: false,
        created_by: authData.user.id,
      })
      .select("id, name")
      .single();

    if (companyError || !company) {
      throw new Error(companyError?.message || "Não foi possível registrar a empresa.");
    }
    createdCompanyId = company.id;

    const { data: store, error: storeError } = await admin
      .from("stores")
      .insert({
        company_id: company.id,
        name,
        slug: storeSlug,
        active: false,
        created_by: authData.user.id,
      })
      .select("id, public_code, name")
      .single();

    if (storeError || !store) {
      throw new Error(storeError?.message || "Não foi possível registrar a unidade principal.");
    }

    const operations = await Promise.all([
      admin.from("company_members").upsert({
        company_id: company.id,
        user_id: authData.user.id,
        role: "MASTER",
        active: true,
      }),
      admin.from("store_members").upsert({
        store_id: store.id,
        company_id: company.id,
        user_id: authData.user.id,
        role: "MASTER",
        active: true,
      }),
      admin.from("store_settings").upsert({
        store_id: store.id,
        company_id: company.id,
        display_name: name,
        updated_by: authData.user.id,
      }),
      admin.from("company_subscriptions").insert({
        company_id: company.id,
        status: "AWAITING_ACTIVATION",
        contracted_months: 12,
      }),
    ]);

    const operationError = operations.find((result) => result.error)?.error;
    if (operationError) throw new Error(operationError.message);

    await admin.from("audit_logs").insert({
      company_id: company.id,
      user_id: authData.user.id,
      action: "COMPANY_CREATED",
      entity: "company",
      entity_id: company.id,
      new_value: {
        name,
        segment,
        store_id: store.id,
        public_code: store.public_code,
        status: "AWAITING_ACTIVATION",
      },
    });

    return NextResponse.json({
      company_id: company.id,
      store_id: store.id,
      public_code: store.public_code,
      name,
      segment,
    });
  } catch (error) {
    console.error("Gerivo create company:", error);

    if (createdCompanyId) {
      try {
        const admin = getSupabaseAdminClient();
        await admin.from("companies").delete().eq("id", createdCompanyId);
      } catch (rollbackError) {
        console.error("Gerivo create company rollback:", rollbackError);
      }
    }

    const message = error instanceof Error && error.message
      ? error.message
      : "Não foi possível criar a empresa.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
