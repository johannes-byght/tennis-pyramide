import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Root() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboard");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboard");
  redirect((profile as { role: "player" | "coach" }).role === "coach" ? "/coach" : "/feed");
}
