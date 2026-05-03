import { CoachSignInForm } from "./sign-in-form";

export default function CoachSignInPage() {
  return (
    <main className="mx-auto max-w-md px-5 pt-12">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">👨‍🏫</div>
        <h1 className="font-display text-3xl">Trainer-Login</h1>
        <p className="text-sm text-muted mt-2">
          Trainer/-innen melden sich per E-Mail-Magic-Link an. Spieler nutzen Einladungscodes.
        </p>
      </div>
      <CoachSignInForm />
    </main>
  );
}
