import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const [profile, ladder, matches, achievements, xp] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("ladder_positions").select("*").eq("profile_id", user.id),
    supabase
      .from("matches")
      .select("*")
      .or(`winner_id.eq.${user.id},loser_id.eq.${user.id}`),
    supabase.from("profile_achievements").select("*").eq("profile_id", user.id),
    supabase.from("xp_events").select("*").eq("profile_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    ladder_positions: ladder.data,
    matches: matches.data,
    achievements: achievements.data,
    xp_events: xp.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="tennis-pyramide-export-${user.id}.json"`,
    },
  });
}
