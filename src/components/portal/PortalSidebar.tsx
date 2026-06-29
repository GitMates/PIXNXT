import React, { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Bell,
  LayoutGrid,
  Home,
  KanbanSquare,
  CalendarDays,
  Database,
  Plus,
  Settings,
} from "lucide-react"
import { products } from "../../lib/products"
import { cn } from "../../lib/utils"
import { type ViewMode } from "./portalData"

type NavItem = {
  label: string
  view: ViewMode
  icon: typeof KanbanSquare
}

const navItems: NavItem[] = [
  { label: "Pipeline / Leads", view: "pipeline", icon: KanbanSquare },
  { label: "Studio Calendar", view: "calendar", icon: CalendarDays },
  { label: "Settings", view: "settings", icon: Settings },
]

function AppSwitcherMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "neu-circle inline-flex size-8 items-center justify-center rounded-full text-[#71717A] transition-colors hover:text-[#1A1A1A]",
          open && "neu-inset text-[#1A1A1A]",
        )}
        aria-label="Switch products"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <LayoutGrid className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-full top-0 z-50 ml-3 w-72 origin-top-left rounded-2xl border border-[#ECEAE6] bg-white p-2 shadow-xl shadow-black/10"
        >
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#F4F4F5]"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#F4F4F5] text-[#1A1A1A]">
              <Home className="size-4" />
            </span>
            Home
          </Link>

          <div className="my-2 h-px bg-[#ECEAE6]" />

          <p className="px-3 pb-1 pt-1 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
            Pixnxt Ecosystem
          </p>

          <div className="grid grid-cols-1 gap-1">
            {products.map((product) => {
              const active = location.pathname.startsWith(product.href)
              return (
                <Link
                  key={product.id}
                  to={product.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[#F4F4F5]",
                    active && "bg-[#F4F4F5]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#F4F4F5] text-[#1A1A1A]",
                    )}
                  >
                    <product.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-[#1A1A1A]">
                        {product.name}
                      </span>
                      {active && (
                        <span className="rounded-full bg-[#1A1A1A]/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-[#1A1A1A]">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-[#71717A]">
                      {product.tagline}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export interface PortalSidebarProps {
  activeView: ViewMode
  workspaceProjectName: string | null
  goToView: (view: ViewMode) => void
  userInitial?: string
}

export function PortalSidebar({
  activeView,
  workspaceProjectName,
  goToView,
  userInitial = "N",
}: PortalSidebarProps) {
  return (
    <aside className="glass-panel hidden h-screen w-64 shrink-0 flex-col border-r border-[#ECEAE6] bg-[#FAF9F6] lg:flex">
      <div className="flex items-center justify-between gap-2 border-b border-[#ECEAE6] px-5 py-4">
        <div className="font-serif text-xl font-bold tracking-wide text-[#1A1A1A]">
          PIXNXT
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="neu-circle relative inline-flex size-8 items-center justify-center rounded-full text-[#71717A] hover:text-[#1A1A1A]"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#1A1A1A]" />
          </button>
          <AppSwitcherMenu />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5 neu-scroll">
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
            Global
          </p>
          {navItems.map((item) => {
            const active =
              activeView === item.view && !workspaceProjectName
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => goToView(item.view)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "neu-inset text-[#1A1A1A]"
                    : "text-[#71717A]/80 hover:text-[#1A1A1A]",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="relative border-t border-[#ECEAE6] px-3 pb-4 pt-3">
        <div className="neu-inset rounded-xl p-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#71717A]">
              <Database className="size-3 text-[#1A1A1A]" />
              Storage
            </span>
            <button
              type="button"
              className="inline-flex size-4 items-center justify-center rounded-md text-[#1A1A1A] hover:bg-[#1A1A1A]/10"
              aria-label="Upgrade storage"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#ECEAE6]">
            <div className="h-full w-0 rounded-full bg-[#1A1A1A]" />
          </div>
          <p className="mt-1 text-[10px] text-[#A1A1AA]">0 B of 100 GB used</p>
        </div>

        <span className="absolute -bottom-0 left-4 z-10 inline-flex size-8 items-center justify-center rounded-full bg-[#3b6fd9] text-xs font-semibold text-white ring-[3px] ring-[#FAF9F6]">
          {userInitial}
        </span>
      </div>
    </aside>
  )
}
