import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient, normalizeUsername } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");
    if (!identifier || !password) {
      return NextResponse.json({ error: "Informe o usuário e a senha." }, { status: 400 });
    }

    let email = identifier;
    if (!identifier.includes("@")) {
      const admin = getSupabaseAdminClient();
      const username = normalizeUsername(identifier);
      const { data: profile } = await admin
        .from("profiles")
        .select("email, active")
        .eq("username_normalized", username)
        .maybeSingle();
      if (!profile?.email || !profile.active) {
        return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
      }
      email = profile.email;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) throw new Error("Supabase público não configurado.");
    const authClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error("Gerivo login:", error);
    return NextResponse.json({ error: "Não foi possível acessar o Gerivo." }, { status: 500 });
  }
}
