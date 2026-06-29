import React from "react"
import {
  Bell,
  LayoutGrid,
  KanbanSquare,
  CalendarDays,
  Database,
  Plus,
  Settings,
} from "lucide-react"
import { type ViewMode } from "./portalData"

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
      <div className="flex items-center justify-between gap-2 border-b border-[#ECEAE6] px-5 py-5">
        <div className="font-serif text-xl font-bold tracking-wide text-[#1A1A1A]">
          PIXNXT
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="neu-circle relative inline-flex size-8 items-center justify-center rounded-full text-[#71717A] hover:text-[#1A1A1A]"
          >
            <Bell className="size-4" />
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-red-500" />
          </button>
          <button
            type="button"
            className="neu-circle inline-flex size-8 items-center justify-center rounded-full text-[#71717A] hover:text-[#1A1A1A]"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5 neu-scroll">
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
            GLOBAL
          </p>
          <button
            type="button"
            onClick={() => goToView("pipeline")}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              activeView === "pipeline" && !workspaceProjectName
                ? "bg-[#ECEAE6] text-[#1A1A1A]"
                : "text-[#71717A] hover:text-[#1A1A1A]"
            }`}
          >
            <KanbanSquare className="size-4 shrink-0" />
            Pipeline / Leads
          </button>
          <button
            type="button"
            onClick={() => goToView("calendar")}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              activeView === "calendar"
                ? "bg-[#ECEAE6] text-[#1A1A1A]"
                : "text-[#71717A] hover:text-[#1A1A1A]"
            }`}
          >
            <CalendarDays className="size-4 shrink-0" />
            Studio Calendar
          </button>
          <button
            type="button"
            onClick={() => goToView("settings")}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              activeView === "settings"
                ? "bg-[#ECEAE6] text-[#1A1A1A]"
                : "text-[#71717A] hover:text-[#1A1A1A]"
            }`}
          >
            <Settings className="size-4 shrink-0" />
            Settings
          </button>
        </div>
      </nav>

      <div className="relative border-t border-[#ECEAE6] px-4 pb-5 pt-4">
        <div className="rounded-2xl border border-[#ECEAE6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
              <Database className="size-3.5 text-[#1A1A1A]" />
              Storage
            </span>
            <button
              type="button"
              className="inline-flex size-5 items-center justify-center rounded-md text-[#1A1A1A] hover:bg-[#F4F4F5]"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#ECEAE6]">
            <div className="h-full w-[6%] rounded-full bg-[#1A1A1A]" />
          </div>
          <p className="mt-2 text-[11px] text-[#A1A1AA]">0 B of 100 GB used</p>
        </div>

        <span className="absolute -bottom-0 left-5 z-10 inline-flex size-9 items-center justify-center rounded-full bg-[#3b6fd9] text-sm font-semibold text-white ring-[3px] ring-[#FAF9F6]">
          {userInitial}
        </span>
      </div>
    </aside>
  )
}
