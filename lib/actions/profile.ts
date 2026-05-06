"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const nickname = (formData.get("nickname") as string | null)?.trim() ?? "";
  const initials = (formData.get("initials") as string | null)?.trim().toUpperCase() ?? "";

  if (nickname.length < 3 || nickname.length > 16) {
    return { ok: false, error: "Nickname muss 3–16 Zeichen lang sein." };
  }
  if (!/^[a-zA-Z0-9_\-. äöüÄÖÜ]+$/.test(nickname)) {
    return { ok: false, error: "Nickname enthält unerlaubte Zeichen." };
  }
  if (initials && (initials.length > 3 || !/^[A-ZÄÖÜ]+$/.test(initials))) {
    return { ok: false, error: "Initialen: max. 3 Großbuchstaben." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht eingeloggt." };

  const { error } = await supabase
    .from("profiles")
    .update({ nickname, initials: initials || null })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Dieser Nickname ist im Verein bereits vergeben." };
    }
    return { ok: false, error: "Speichern fehlgeschlagen." };
  }

  revalidatePath("/me");
  revalidatePath("/me/settings");
  return { ok: true };
}
