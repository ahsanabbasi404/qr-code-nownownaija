import { redirect } from "next/navigation"
import { HomeClient } from "@/components/home/home-client"
import { getDisplayName, getSessionFromCookies } from "@/lib/auth"

export default async function HomePage() {
  const isAuthenticated = await getSessionFromCookies()

  if (!isAuthenticated) {
    redirect("/login")
  }

  const adminName = getDisplayName()

  return <HomeClient adminName={adminName} />
}
