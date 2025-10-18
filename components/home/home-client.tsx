"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Clock,
  LineChart,
  Loader2,
  LogOut,
  MousePointerClick,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QRGenerator from "@/components/qr-generator"
import DownloadButtons from "@/components/download-buttons"
import { QRCodeSVG } from "qrcode.react"
import { encodeUrlForRedirect } from "@/lib/utils"

type DeviceCategory = "Desktop" | "Mobile" | "Tablet" | "Bot" | "Unknown"

type RawQRCode = {
  id: string
  slug: string
  target_url: string
  base_url?: string | null
  created_at: string
  qr_scans?: { count: number }[]
}

type RawScan = {
  id: string
  qr_code_id: string
  scanned_at: string
  user_agent: string | null
  ip_address: string | null
}

type DailyPoint = {
  date: string
  label: string
  count: number
}

type DeviceDistribution = Record<DeviceCategory, number>

type QRCodeAnalytics = {
  id: string
  slug: string
  targetUrl: string
  baseUrl?: string | null
  createdAt: string
  redirectUrl: string
  totalScans: number
  scansLast7Days: number
  uniqueVisitors: number
  lastScanAt: string | null
  firstScanAt: string | null
  dailySeries: DailyPoint[]
  deviceDistribution: DeviceDistribution
}

type RecentScan = {
  id: string
  createdAt: string
  slug: string
  targetUrl: string
  redirectUrl: string
  device: DeviceCategory
  ip: string | null
}

type DashboardTotals = {
  totalCodes: number
  totalScans: number
  activeCodes: number
  averagePerCode: number
  uniqueVisitors: number
  topPerformer?: { slug: string; totalScans: number }
}

type DashboardData = {
  codes: QRCodeAnalytics[]
  recentScans: RecentScan[]
  dailyTotals: DailyPoint[]
  totals: DashboardTotals
  lastUpdated: string
}

export function HomeClient({ adminName }: { adminName: string }) {
  const router = useRouter()
  const [supabaseError, setSupabaseError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<"analytics" | "generator">("analytics")
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  React.useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setSupabaseError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to unlock analytics.",
      )
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.replace("/login")
      router.refresh()
    } catch (err) {
      console.error("Failed to log out", err)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Secure Admin
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              QR Intelligence Dashboard
            </h1>
            <p className="text-sm text-white/60">
              Monitor performance, download assets, and generate new QR experiences from a unified console.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-white/50">Signed in</p>
              <p className="text-sm font-medium text-white">{adminName}</p>
            </div>
            <Separator orientation="vertical" className="h-10 bg-white/10" />
            <Button variant="outline" className="border-white/20 bg-white/[0.03] text-white hover:bg-white/10" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Control Center
              </p>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                {activeTab === "analytics" ? "Performance insights" : "Generate a new QR code"}
              </h2>
            </div>
            <TabsList className="bg-white/10 p-1">
              <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                <LineChart className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="generator" className="data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                <QrCode className="mr-2 h-4 w-4" />
                Generator
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="space-y-6">
            <DashboardContent supabaseError={supabaseError} />
          </TabsContent>

          <TabsContent value="generator">
            <GeneratorPanel supabaseError={supabaseError} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function GeneratorPanel({ supabaseError }: { supabaseError: string | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col items-center justify-center">
        <QRGenerator />
      </div>
      <Card className="border-white/10 bg-white/[0.04] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Best practices
          </CardTitle>
          <CardDescription className="text-white/70">
            Keep your campaigns organized and trackable. You can override the redirect base for localized rollouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-white/70">
          <div>
            <p className="font-medium text-white">Campaign hygiene</p>
            <p>Use descriptive slugs or maintain a mapping to ensure quick identification during reporting.</p>
          </div>
          <div>
            <p className="font-medium text-white">Custom domains</p>
            <p>
              Configure `NEXT_PUBLIC_URL` or specify a redirect base per QR to align with localized landing funnels and maintain brand consistency.
            </p>
          </div>
          <div>
            <p className="font-medium text-white">High-res downloads</p>
            <p>
              Download both PNG and SVG assets and store them alongside campaign documentation to streamline handoffs to design or print vendors.
            </p>
          </div>
          {supabaseError && (
            <Alert variant="destructive" className="border-red-400 bg-red-500/20 text-white">
              <AlertDescription>{supabaseError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardContent({ supabaseError }: { supabaseError: string | null }) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [data, setData] = React.useState<DashboardData | null>(null)
  const redirectBase = React.useMemo(() => getRedirectBase(), [])

  React.useEffect(() => {
    if (supabaseError) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        const { getSupabaseClient } = await import("@/lib/supabase-client")
        const supabase = getSupabaseClient()

        const { data: qrCodes, error: qrError } = await supabase
          .from("qr_codes")
          .select(
            `
            id,
            slug,
            target_url,
            base_url,
            created_at,
            qr_scans(count)
          `,
          )
          .order("created_at", { ascending: false })

        if (qrError) throw qrError

        const identifiers = (qrCodes ?? []).map((item: RawQRCode) => item.id)

        let scans: RawScan[] = []
        if (identifiers.length > 0) {
          const { data: scansData, error: scansError } = await supabase
            .from("qr_scans")
            .select("id, qr_code_id, scanned_at, user_agent, ip_address")
            .in("qr_code_id", identifiers)
            .order("scanned_at", { ascending: false })
            .limit(500)

          if (scansError) throw scansError
          scans = scansData ?? []
        }

        const dashboardData = buildDashboardData(qrCodes ?? [], scans, redirectBase)
        setData(dashboardData)
      } catch (err) {
        console.error("Failed to load dashboard data", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [redirectBase, supabaseError])

  if (supabaseError) {
    return (
      <Alert variant="destructive" className="border-red-400 bg-red-500/20 text-white">
        <AlertDescription>{supabaseError}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard className="md:col-span-2" />
      </div>
    )
  }

  if (!data || data.codes.length === 0) {
    return (
      <Card className="border-dashed border-white/20 bg-white/[0.03] py-16 text-center text-white/70">
        <CardHeader className="space-y-2">
          <CardTitle className="flex flex-col items-center gap-3 text-xl">
            <MousePointerClick className="h-8 w-8 text-white/60" />
            No QR codes yet
          </CardTitle>
          <CardDescription className="text-white/60">
            Generate your first QR code to start capturing campaign activity and visitor insights.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { totals, dailyTotals, recentScans, codes, lastUpdated } = data

  return (
    <div className="space-y-6">
      <OverviewSection totals={totals} updatedAt={lastUpdated} />
      <ActivitySection dailyTotals={dailyTotals} />
      <div className="grid gap-6 2xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4 min-w-0">
          {codes.map((code, index) => (
            <QRCodeAnalyticsCard key={code.id} code={code} position={index + 1} />
          ))}
        </div>
        <RecentScansPanel scans={recentScans} />
      </div>
    </div>
  )
}

function OverviewSection({ totals, updatedAt }: { totals: DashboardTotals; updatedAt: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
        label="Total scans"
        value={totals.totalScans}
        subtitle={`${totals.averagePerCode.toFixed(1)} avg per code`}
      />
      <MetricCard
        icon={<Users className="h-5 w-5 text-sky-400" />}
        label="Unique visitors"
        value={totals.uniqueVisitors}
        subtitle="Approximate unique IPs"
      />
      <MetricCard
        icon={<TrendingUp className="h-5 w-5 text-violet-400" />}
        label="Active QR codes"
        value={totals.activeCodes}
        subtitle="Scanned in the past 7 days"
      />
      <MetricCard
        icon={<QrCode className="h-5 w-5 text-amber-400" />}
        label="Total QR codes"
        value={totals.totalCodes}
        subtitle={`Updated ${formatRelativeTime(updatedAt)}`}
      />
      {totals.topPerformer && (
        <div className="md:col-span-2 xl:col-span-4">
          <Card className="border-white/10 bg-white/[0.05] text-white shadow-lg backdrop-blur">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                  Top performer
                </Badge>
                <p className="text-sm text-white/80">
                  /r/{totals.topPerformer.slug} with {totals.topPerformer.totalScans.toLocaleString()} scans to date
                </p>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/50">
                Insights refreshed {formatRelativeTime(updatedAt)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function ActivitySection({ dailyTotals }: { dailyTotals: DailyPoint[] }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] text-white shadow-xl">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <LineChart className="h-5 w-5 text-sky-300" />
            14-day scan trend
          </CardTitle>
          <CardDescription className="text-white/60">
            Normalized daily volume across all QR experiences. Hover to inspect exact counts.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex h-48 items-end gap-2">
          {dailyTotals.map((point) => (
            <div key={point.date} className="group flex-1">
              <div
                className="relative flex w-full items-end justify-center rounded-md bg-gradient-to-t from-white/10 to-white/30 transition-all group-hover:from-emerald-300/30 group-hover:to-emerald-300/60"
                style={{ height: `${point.count === 0 ? 6 : normalizeHeight(point.count, dailyTotals)}%` }}
                title={`${point.count.toLocaleString()} scans on ${point.label}`}
              >
                <div className="absolute bottom-full mb-2 hidden rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-md group-hover:block">
                  <p className="font-medium">{point.count.toLocaleString()} scans</p>
                  <p className="text-white/70">{point.label}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-center text-white/60">{point.label.split(" ").slice(0, 2).join(" ")}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function QRCodeAnalyticsCard({ code, position }: { code: QRCodeAnalytics; position: number }) {
  const qrRef = React.useRef<HTMLDivElement>(null)
  const deviceTotal = Object.values(code.deviceDistribution).reduce((acc, value) => acc + value, 0)

  return (
    <Card className="border-white/10 bg-white/[0.03] text-white shadow-lg min-w-0">
      <CardHeader className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/20 bg-white/5 text-xs uppercase tracking-wide text-white/70">
              #{position.toString().padStart(2, "0")}
            </Badge>
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-100">
              {code.slug}
            </Badge>
          </div>
          <CardTitle className="text-lg font-semibold text-white break-words">
            {code.targetUrl}
          </CardTitle>
          <CardDescription className="text-white/60 break-words">
            Redirects via{" "}
            <a
              href={code.redirectUrl}
              className="font-medium text-emerald-300 underline-offset-4 hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {code.redirectUrl}
            </a>
          </CardDescription>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 shrink-0">
          <div
            ref={qrRef}
            className="rounded-md border border-white/10 bg-white p-2 shadow-inner"
            aria-label={`QR preview for ${code.slug}`}
          >
            <QRCodeSVG
              value={code.redirectUrl}
              size={512}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#000000"
              style={{ width: 160, height: 160, imageRendering: "crisp-edges" }}
            />
          </div>
          <DownloadButtons qrRef={qrRef} url={code.redirectUrl} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="grid gap-4 sm:grid-cols-2 min-w-0">
          <MetricBlock label="Total scans" value={code.totalScans} icon={<BarChart3 className="h-4 w-4 text-emerald-300" />} />
          <MetricBlock
            label="Scans (last 7 days)"
            value={code.scansLast7Days}
            icon={<TrendingUp className="h-4 w-4 text-violet-300" />}
          />
          <MetricBlock label="Unique visitors" value={code.uniqueVisitors} icon={<Users className="h-4 w-4 text-sky-300" />} />
          <MetricBlock
            label="Last scanned"
            value={code.lastScanAt ? formatRelativeTime(code.lastScanAt) : "Not yet scanned"}
            icon={<Clock className="h-4 w-4 text-white/70" />}
            hint={code.lastScanAt ? new Date(code.lastScanAt).toLocaleString() : undefined}
          />
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Device mix</p>
          <DeviceDistributionBar distribution={code.deviceDistribution} />
          <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
            {Object.entries(code.deviceDistribution).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                <span>{category}</span>
                <span className="font-mono text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeviceDistributionBar({ distribution }: { distribution: DeviceDistribution }) {
  const total = Object.values(distribution).reduce((acc, value) => acc + value, 0) || 1
  const colors: Record<DeviceCategory, string> = {
    Desktop: "bg-emerald-400/80",
    Mobile: "bg-sky-400/80",
    Tablet: "bg-violet-400/80",
    Bot: "bg-amber-400/80",
    Unknown: "bg-white/30",
  }

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
      {Object.entries(distribution).map(([category, value]) => {
        const percentage = Math.max((value / total) * 100, value > 0 ? 4 : 0)
        return (
          <div
            key={category}
            className={`relative flex items-center justify-center text-[10px] font-semibold text-slate-900 ${colors[category as DeviceCategory]}`}
            style={{ width: `${percentage}%` }}
            title={`${value.toLocaleString()} scans from ${category}`}
          >
            {percentage > 10 ? `${Math.round((value / total) * 100)}%` : null}
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode
  label: string
  value: number
  subtitle?: string
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04] text-white shadow-lg">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2 text-sm font-medium text-white/70">
          {icon}
          {label}
        </div>
        <p className="text-3xl font-semibold">{value.toLocaleString()}</p>
        {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function MetricBlock({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {hint && <p className="mt-1 text-xs text-white/60">{hint}</p>}
    </div>
  )
}

function RecentScansPanel({ scans }: { scans: RecentScan[] }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] text-white shadow-lg min-w-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MousePointerClick className="h-5 w-5 text-emerald-300" />
          Recent activity
        </CardTitle>
        <CardDescription className="text-white/60">
          Most recent scans across campaigns. IPs are partially masked for privacy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scans.slice(0, 10).map((scan) => (
          <div
            key={scan.id}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <a
                href={scan.redirectUrl}
                className="font-medium text-emerald-300 underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                /r/{scan.slug}
              </a>
              <span className="text-xs text-white/50">{formatRelativeTime(scan.createdAt)}</span>
            </div>
            <p className="mt-1 truncate text-xs text-white/60">{scan.targetUrl}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-white/50">
              <span>{scan.device}</span>
              <span>{scan.ip ? maskIp(scan.ip) : "IP unavailable"}</span>
            </div>
          </div>
        ))}
        {scans.length === 0 && (
          <p className="text-sm text-white/60">No recent scans captured yet. Check back after your campaign launches.</p>
        )}
      </CardContent>
    </Card>
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-6 ${className ?? ""}`}>
      <div className="mb-4 h-6 w-32 rounded bg-white/10" />
      <div className="mb-2 h-4 w-full rounded bg-white/10" />
      <div className="mb-2 h-4 w-5/6 rounded bg-white/10" />
      <div className="h-4 w-2/3 rounded bg-white/10" />
    </div>
  )
}

function buildDashboardData(qrCodes: RawQRCode[], scans: RawScan[], redirectBase: string): DashboardData {
  const scanMap = new Map<string, RawScan[]>()
  const codeMap = new Map<string, RawQRCode>()

  qrCodes.forEach((code) => {
    codeMap.set(code.id, code)
    scanMap.set(code.id, [])
  })

  scans.forEach((scan) => {
    const list = scanMap.get(scan.qr_code_id)
    if (list) {
      list.push(scan)
    } else {
      scanMap.set(scan.qr_code_id, [scan])
    }
  })

  const codes: QRCodeAnalytics[] = qrCodes.map((code) => {
    const codeScans = scanMap.get(code.id) ?? []
    const totalScans = code.qr_scans?.[0]?.count ?? codeScans.length
    const lastScanAt = codeScans[0]?.scanned_at ?? null
    const firstScanAt = codeScans.length > 0 ? codeScans[codeScans.length - 1].scanned_at : null
    const redirectUrl = buildRedirectUrl(code.target_url, code.slug, code.base_url || redirectBase)
    const dailySeries = buildDailySeries(codeScans)
    const scansLast7Days = dailySeries.slice(-7).reduce((acc, point) => acc + point.count, 0)
    const uniqueVisitors = countUniqueVisitors(codeScans)
    const deviceDistribution = buildDeviceDistribution(codeScans)

    return {
      id: code.id,
      slug: code.slug,
      targetUrl: code.target_url,
      baseUrl: code.base_url,
      createdAt: code.created_at,
      redirectUrl,
      totalScans,
      scansLast7Days,
      uniqueVisitors,
      lastScanAt,
      firstScanAt,
      dailySeries,
      deviceDistribution,
    }
  })

  const allDailySeries = buildDailySeries(scans)
  const recentScans: RecentScan[] = scans.slice(0, 20).map((scan) => {
    const code = codeMap.get(scan.qr_code_id)
    return {
      id: scan.id,
      createdAt: scan.scanned_at,
      slug: code?.slug ?? "unknown",
      targetUrl: code?.target_url ?? "",
      redirectUrl: code ? buildRedirectUrl(code.target_url, code.slug, code.base_url || redirectBase) : "",
      device: detectDevice(scan.user_agent),
      ip: scan.ip_address,
    }
  })

  const totals = computeTotals(codes, scans)

  return {
    codes,
    recentScans,
    dailyTotals: allDailySeries,
    totals,
    lastUpdated: new Date().toISOString(),
  }
}

function computeTotals(codes: QRCodeAnalytics[], scans: RawScan[]): DashboardTotals {
  const totalScans = codes.reduce((acc, code) => acc + code.totalScans, 0)
  const totalCodes = codes.length
  const uniqueVisitors = countUniqueVisitors(scans)
  const activeCodes = codes.filter((code) => code.lastScanAt && withinDays(code.lastScanAt, 7)).length
  const averagePerCode = totalCodes > 0 ? totalScans / totalCodes : 0
  const topPerformer = codes
    .slice()
    .sort((a, b) => b.totalScans - a.totalScans)[0]

  return {
    totalCodes,
    totalScans,
    activeCodes,
    averagePerCode,
    uniqueVisitors,
    topPerformer: topPerformer ? { slug: topPerformer.slug, totalScans: topPerformer.totalScans } : undefined,
  }
}

function buildDailySeries(scans: RawScan[], days = 14): DailyPoint[] {
  const today = new Date()
  const map = new Map<string, number>()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const key = date.toISOString().slice(0, 10)
    map.set(key, 0)
  }

  scans.forEach((scan) => {
    const key = scan.scanned_at.slice(0, 10)
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  })

  return Array.from(map.entries()).map(([date, count]) => ({
    date,
    count,
    label: new Date(date + "T00:00:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }))
}

function buildDeviceDistribution(scans: RawScan[]): DeviceDistribution {
  const distribution: DeviceDistribution = {
    Desktop: 0,
    Mobile: 0,
    Tablet: 0,
    Bot: 0,
    Unknown: 0,
  }

  scans.forEach((scan) => {
    const device = detectDevice(scan.user_agent)
    distribution[device] += 1
  })

  return distribution
}

function detectDevice(userAgent: string | null): DeviceCategory {
  if (!userAgent) return "Unknown"
  const ua = userAgent.toLowerCase()
  if (ua.includes("bot") || ua.includes("crawl") || ua.includes("spider")) return "Bot"
  if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet"
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) return "Mobile"
  if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) return "Desktop"
  return "Unknown"
}

function countUniqueVisitors(scans: RawScan[]): number {
  const unique = new Set(scans.map((scan) => scan.ip_address).filter(Boolean))
  return unique.size
}

function getRedirectBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_URL?.trim() ?? ""
  const normalized = fromEnv.replace(/\/+$/, "")
  return normalized || "https://qr.nownownaija.com"
}

function buildRedirectUrl(targetUrl: string, slug: string, base: string): string {
  const encodedTarget = encodeUrlForRedirect(targetUrl)
  const normalizedBase = base.replace(/\/+$/, "")
  return `${normalizedBase}/r/redirect?slug=${encodeURIComponent(slug)}&url=${encodedTarget}`
}

function withinDays(dateString: string, days: number) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return diff <= days * 24 * 60 * 60 * 1000
}

function formatRelativeTime(dateString: string) {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  const date = new Date(dateString)
  const diffMs = date.getTime() - Date.now()
  const diffSeconds = Math.round(diffMs / 1000)

  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "seconds"],
    [60, "minutes"],
    [24, "hours"],
    [7, "days"],
    [4.34524, "weeks"],
    [12, "months"],
    [Number.POSITIVE_INFINITY, "years"],
  ]

  let duration = diffSeconds
  let unit: Intl.RelativeTimeFormatUnit = "seconds"

  for (const [amount, nextUnit] of divisions) {
    if (Math.abs(duration) < amount) {
      unit = nextUnit
      break
    }
    duration /= amount
  }

  return formatter.format(Math.round(duration), unit)
}

function maskIp(ip: string) {
  if (ip.includes(":")) {
    const segments = ip.split(":")
    return segments.slice(0, 3).join(":") + ":****"
  }
  const segments = ip.split(".")
  if (segments.length === 4) {
    return `${segments[0]}.${segments[1]}.***.${segments[3]}`
  }
  return ip
}

function normalizeHeight(value: number, series: DailyPoint[]) {
  const max = Math.max(...series.map((point) => point.count), 1)
  const percentage = Math.round((value / max) * 100)
  return Math.min(Math.max(percentage, value > 0 ? 10 : 6), 100)
}
