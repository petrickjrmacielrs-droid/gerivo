import { NextResponse } from "next/server";
import { getSupabaseAdminClient, normalizeUsername } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
const RESERVED = new Set(["admin", "master", "gerivo", "suporte", "root", "sistema"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = normalizeUsername(String(body.username || ""));
    if (username.length < 4 || username.length > 40 || RESERVED.has(username)) {
      return NextResponse.json({ available: false, username, reason: "Nome de usuário indisponível." });
    }
    const admin = getSupabaseAdminClient();
    const { count, error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("username_normalized", username);
    if (error) throw error;
    return NextResponse.json({ available: (count || 0) === 0, username });
  } catch (error) {
    console.error("Gerivo username availability:", error);
    return NextResponse.json({ available: false, reason: "Falha ao verificar usuário." }, { status: 500 });
  }
}
