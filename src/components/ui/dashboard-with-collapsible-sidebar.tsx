"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  ChevronsLeft,
  CircleDollarSign,
  CreditCard,
  FolderHeart,
  FolderKanban,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getStrictLocalizedPath } from "@/lib/locale-path"
import { cn } from "@/lib/utils"

type AdminSidebarItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const ADMIN_NAV_ITEMS: AdminSidebarItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/cases", label: "Cases", icon: FolderKanban },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/referrals", label: "Referrals", icon: FolderHeart },
  { href: "/admin/specialists", label: "Specialists", icon: ShieldCheck },
  { href: "/admin/sentiment", label: "Sentiment flags", icon: TriangleAlert },
]

function normalizePath(pathname: string) {
  const match = pathname.match(/^\/(en|pl|ro|ar|es|fr|de)(\/.*)?$/)
  return match ? match[2] || "/" : pathname
}

function getLocalizedWorkspaceHref(locale: string, href: string) {
  return getStrictLocalizedPath(locale, href)
}

function AdminSidebarBody({
  brand,
  locale,
  userName,
  userEmail,
  initials,
  normalizedPath,
  open,
  mobile = false,
  onNavigate,
  backToSiteLabel,
  backToSiteHref,
  navItems,
  badgeLabel,
  accessLabel,
  accessBody,
  mobileHint,
}: {
  brand: string
  locale: string
  userName: string
  userEmail: string
  initials: string
  normalizedPath: string
  open: boolean
  mobile?: boolean
  onNavigate?: () => void
  backToSiteLabel: string
  backToSiteHref: string
  navItems: AdminSidebarItem[]
  badgeLabel: string
  accessLabel: string
  accessBody: string
  mobileHint?: string
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-line/80 px-2 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[1.25rem] bg-brand-soft text-brand-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <ShieldCheck className="size-5" />
          </div>
          {open ? (
            <div className="min-w-0">
              <p className="font-display text-xl leading-none text-ink">{brand}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-brand">{badgeLabel}</p>
            </div>
          ) : null}
        </div>

        {open ? <ChevronDown className="size-4 text-ink-soft" /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-5">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const href = getLocalizedWorkspaceHref(locale, item.href)
            const isActive =
              normalizedPath === item.href ||
              (item.href !== "/admin" && normalizedPath.startsWith(`${item.href}/`))

            return (
              <Link
                key={item.href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-[1.1rem] border px-3 transition-all duration-200",
                  isActive
                    ? "border-brand/18 bg-brand-soft text-brand-strong shadow-[0_16px_30px_rgba(13,148,136,0.12)]"
                    : "border-transparent text-ink-soft hover:border-brand/10 hover:bg-surface-soft hover:text-ink",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-current">
                  <Icon className="size-4" />
                </span>
                {open ? <span className="truncate text-sm font-medium">{item.label}</span> : null}
              </Link>
            )
          })}
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-line/80 bg-surface-soft/75 p-4">
          {open ? (
            <div className="space-y-3">
              <p className="app-kicker">{accessLabel}</p>
              <p className="text-sm leading-6 text-ink-soft">{accessBody}</p>
            </div>
          ) : (
            <div className="flex justify-center text-brand">
              <BarChart3 className="size-5" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-line/80 px-2 pt-4">
        <Link
          href={getLocalizedWorkspaceHref(locale, backToSiteHref)}
          onClick={onNavigate}
          className={cn(
            "mb-3 flex items-center gap-3 rounded-[1.1rem] border border-transparent px-3 py-2.5 text-sm text-ink-soft transition-colors hover:border-brand/10 hover:bg-surface-soft hover:text-ink",
            !open && "justify-center px-2",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            <ArrowLeft className="size-4" />
          </span>
          {open ? <span className="font-medium">{backToSiteLabel}</span> : null}
        </Link>

        <div
          className={cn(
            "flex items-center gap-3 rounded-[1.2rem] px-2 py-2.5",
            open ? "bg-surface-soft/75" : "justify-center",
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
            {initials || "A"}
          </div>

          {open ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{userName || "Workspace user"}</p>
              <p className="truncate text-xs text-ink-soft">{userEmail}</p>
            </div>
          ) : null}
        </div>

        {mobile && mobileHint ? (
          <p className="mt-3 px-3 text-xs leading-5 text-ink-soft">
            {mobileHint}
          </p>
        ) : null}
      </div>
    </>
  )
}

export function DashboardWorkspaceShell({
  brand,
  locale,
  userName,
  userEmail,
  backToSiteLabel,
  backToSiteHref = "/dashboard",
  navItems,
  badgeLabel,
  accessLabel,
  accessBody,
  mobileTitle,
  mobileHint,
  children,
}: {
  brand: string
  locale: string
  userName: string
  userEmail: string
  backToSiteLabel: string
  backToSiteHref?: string
  navItems: AdminSidebarItem[]
  badgeLabel: string
  accessLabel: string
  accessBody: string
  mobileTitle: string
  mobileHint?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const normalizedPath = normalizePath(pathname)
  const initials = useMemo(() => {
    const source = userName || userEmail || "A"
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }, [userEmail, userName])

  return (
    <div className="flex min-h-[calc(100vh-2rem)] gap-6">
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="fixed inset-x-4 top-4 z-40 xl:hidden">
          <div className="flex items-center justify-between rounded-[1.65rem] border border-line/85 bg-surface-elevated px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="min-w-0">
              <p className="app-kicker">{brand}</p>
              <p className="truncate font-display text-2xl leading-none text-ink">{mobileTitle}</p>
            </div>

            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Menu data-icon="inline-start" />
                Menu
              </Button>
            </DialogTrigger>
          </div>
        </div>

        <DialogContent
          className="left-0 top-0 h-screen max-w-[22rem] translate-x-0 translate-y-0 rounded-none rounded-r-[2rem] border-r border-line/85 bg-surface-elevated p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:max-w-[24rem]"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Admin navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Open the workspace sidebar and switch between dashboard sections.
          </DialogDescription>

          <div className="flex min-h-full flex-col">
            <AdminSidebarBody
              brand={brand}
              locale={locale}
              userName={userName}
              userEmail={userEmail}
              initials={initials}
              normalizedPath={normalizedPath}
              open
              mobile
              onNavigate={() => setMobileOpen(false)}
              backToSiteLabel={backToSiteLabel}
              backToSiteHref={backToSiteHref}
              navItems={navItems}
              badgeLabel={badgeLabel}
              accessLabel={accessLabel}
              accessBody={accessBody}
              mobileHint={mobileHint}
            />
          </div>
        </DialogContent>
      </Dialog>

      <aside
        className={cn(
          "sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 self-start overflow-hidden rounded-[2rem] border border-line/85 bg-surface-elevated p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] transition-[width] duration-300 xl:flex xl:flex-col",
          open ? "w-72" : "w-24",
        )}
      >
        <AdminSidebarBody
          brand={brand}
          locale={locale}
          userName={userName}
          userEmail={userEmail}
          initials={initials}
          normalizedPath={normalizedPath}
          open={open}
          backToSiteLabel={backToSiteLabel}
          backToSiteHref={backToSiteHref}
          navItems={navItems}
          badgeLabel={badgeLabel}
          accessLabel={accessLabel}
          accessBody={accessBody}
          mobileHint={mobileHint}
        />

        <div className="mt-3 border-t border-line/80 px-2 pt-4">
          <button
            onClick={() => setOpen((current) => !current)}
            className="mt-3 flex w-full items-center gap-3 rounded-[1.1rem] border border-transparent px-3 py-2.5 text-sm text-ink-soft transition-colors hover:border-brand/10 hover:bg-surface-soft hover:text-ink"
          >
            <span className="flex size-8 items-center justify-center">
              <ChevronsLeft className={cn("size-4 transition-transform duration-300", !open && "rotate-180")} />
            </span>
            {open ? <span className="font-medium">Collapse sidebar</span> : null}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="app-panel flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[2.25rem] p-6 pt-24 sm:p-8 sm:pt-8">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardWithCollapsibleSidebar({
  brand,
  locale,
  adminName,
  adminEmail,
  backToSiteLabel,
  children,
}: {
  brand: string
  locale: string
  adminName: string
  adminEmail: string
  backToSiteLabel: string
  children: ReactNode
}) {
  return (
    <DashboardWorkspaceShell
      brand={brand}
      locale={locale}
      userName={adminName}
      userEmail={adminEmail}
      backToSiteLabel={backToSiteLabel}
      navItems={ADMIN_NAV_ITEMS}
      badgeLabel="Admin"
      accessLabel="Access"
      accessBody="Read-only workspace for monitoring users, cases, revenue, and sentiment activity."
      mobileTitle="Admin workspace"
      mobileHint="Use the menu to switch between admin sections on smaller screens."
    >
      {children}
    </DashboardWorkspaceShell>
  )
}

export function ProfessionalDashboardSidebar({
  brand,
  locale,
  userName,
  userEmail,
  backToSiteLabel,
  children,
}: {
  brand: string
  locale: string
  userName: string
  userEmail: string
  backToSiteLabel: string
  children: ReactNode
}) {
  const professionalNavItems: AdminSidebarItem[] = [
    { href: "/professional/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/professional/profile", label: "Profile", icon: Users },
    { href: "/professional/earnings", label: "Earnings", icon: CircleDollarSign },
    { href: "/professional/cases", label: "Cases", icon: FolderKanban },
    { href: "/specialists", label: "Marketplace", icon: BriefcaseBusiness },
  ]

  return (
    <DashboardWorkspaceShell
      brand={brand}
      locale={locale}
      userName={userName}
      userEmail={userEmail}
      backToSiteLabel={backToSiteLabel}
      navItems={professionalNavItems}
      badgeLabel="Specialist"
      accessLabel="Workspace"
      accessBody="Manage assigned referrals, review cases, submit recommendations, and monitor your earnings."
      mobileTitle="Professional workspace"
      mobileHint="Use the menu to switch between specialist dashboard sections on smaller screens."
    >
      {children}
    </DashboardWorkspaceShell>
  )
}
