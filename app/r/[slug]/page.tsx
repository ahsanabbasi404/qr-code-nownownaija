import { redirect } from "next/navigation"
import { getSupabaseServer } from "@/lib/supabase-server"

export default async function RedirectPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = getSupabaseServer()

  try {
    // Get QR code and target URL
    const { data: qrCode, error: fetchError } = await supabase
      .from("qr_codes")
      .select("id, target_url")
      .eq("slug", params.slug)
      .single()

    if (fetchError || !qrCode) {
      return <div className="p-8 text-center">QR code not found</div>
    }

    // Record the scan
    await supabase.from("qr_scans").insert({
      qr_code_id: qrCode.id,
      user_agent: "user-agent",
      ip_address: "0.0.0.0",
    })

    // Redirect to target URL
    redirect(qrCode.target_url)
  } catch (error) {
    console.error("Redirect error:", error)
    return <div className="p-8 text-center">Error processing QR code</div>
  }
}
