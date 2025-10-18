import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { getDisplayName, getSessionFromCookies } from "@/lib/auth"

export default async function LoginPage() {
  const isAuthenticated = await getSessionFromCookies()

  if (isAuthenticated) {
    redirect("/")
  }

  const displayName = getDisplayName()

  return (
    <main className="min-h-screen bg-grid-slate-900/[0.04] bg-gradient-to-br from-background via-secondary/20 to-background py-16 px-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Admin Portal
          </p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            Welcome back, {displayName}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Access the QR code management dashboard securely. Authentication is required to create new codes,
            monitor performance, and review analytics.
          </p>
        </div>
        <LoginForm displayName={displayName} />
        <p className="text-xs text-muted-foreground">
          Tip: Update your administrator credentials in `.env.local` using `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
          and `AUTH_SESSION_SECRET`.
        </p>
      </div>
    </main>
  )
}
