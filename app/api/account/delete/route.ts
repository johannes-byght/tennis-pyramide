import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
