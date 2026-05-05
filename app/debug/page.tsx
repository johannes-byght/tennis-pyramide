import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const sbCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

  let userResult: unknown = null;
  let userError: unknown = null;
  let profileResult: unknown = null;
  let profileError: unknown = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    userResult = data.user
      ? { id: data.user.id, is_anonymous: data.user.is_anonymous, aud: data.user.aud }
      : null;
    userError = error;

    if (data.user) {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, nickname, role, is_admin, club_id")
        .eq("id", data.user.id)
        .maybeSingle();
      profileResult = profile;
      profileError = pErr;
    }
  } catch (e) {
    userError = String(e);
  }

  const env = {
    SUPABASE_URL_set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_URL_host: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").split(".")[0],
    ANON_KEY_set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ANON_KEY_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 18),
    SERVICE_KEY_set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  return (
    <main className="mx-auto max-w-2xl p-5 font-mono text-xs space-y-4">
      <h1 className="font-bold text-base">Auth Debug</h1>

      <section>
        <div className="font-bold mb-1">Env</div>
        <pre className="bg-black/5 p-3 rounded overflow-auto">{JSON.stringify(env, null, 2)}</pre>
      </section>

      <section>
        <div className="font-bold mb-1">getUser()</div>
        <pre className="bg-black/5 p-3 rounded overflow-auto">
          {JSON.stringify({ user: userResult, error: userError }, null, 2)}
        </pre>
      </section>

      <section>
        <div className="font-bold mb-1">profile lookup</div>
        <pre className="bg-black/5 p-3 rounded overflow-auto">
          {JSON.stringify({ profile: profileResult, error: profileError }, null, 2)}
        </pre>
      </section>

      <section>
        <div className="font-bold mb-1">cookies (count={allCookies.length}, sb-*={sbCookies.length})</div>
        <pre className="bg-black/5 p-3 rounded overflow-auto">
          {JSON.stringify(
            sbCookies.map((c) => ({ name: c.name, length: c.value.length })),
            null,
            2,
          )}
        </pre>
      </section>
    </main>
  );
}
