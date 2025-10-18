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
         
        </div>
        <LoginForm displayName={displayName} />
      
      </div>
    </main>
  )
}
