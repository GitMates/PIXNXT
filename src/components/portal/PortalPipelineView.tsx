import React, { useState, useRef, useEffect } from "react"
import {
  Search,
  Layers,
  Archive,
  RotateCcw,
  Calendar,
  MapPin,
  Plus,
  Eye,
  FileText,
  MoreHorizontal,
} from "lucide-react"
import { type PipelineStage, type FinancialTone } from "./portalData"

const statusToneStyles: Record<
  FinancialTone,
  { dot: string; text: string }
> = {
  paid: { dot: "bg-emerald-500", text: "text-emerald-600" },
  awaiting: { dot: "bg-amber-500", text: "text-amber-600" },
  editing: { dot: "bg-slate-400", text: "text-slate-500" },
  delivered: { dot: "bg-emerald-500", text: "text-emerald-600" },
}

export interface PortalPipelineViewProps {
  filteredStages: PipelineStage[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  archivedView: boolean
  setArchivedView: (archived: boolean) => void
  archivedProjects: Array<{
    id: string
    clientName: string
    amount: string
    date: string
  }>
  onNewProject: () => void
  onOpenProject: (clientName: string) => void
  onArchiveProject: (cardId: string) => void
  onRestoreProject: (arcId: string) => void
  onQuoteCard: (cardId: string) => void
}

function CardMenu({
  cardId,
  onArchive,
}: {
  cardId: string
  onArchive: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex size-6 items-center justify-center text-[#A1A1AA] transition-colors hover:text-[#1A1A1A]"
        title="More options"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 min-w-[132px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onArchive(cardId)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#71717A] transition-colors hover:bg-[#FAFAFA] hover:text-[#1A1A1A]"
          >
            <Archive className="size-3.5" />
            Archive
          </button>
        </div>
      )}
    </div>
  )
}

export function PortalPipelineView({
  filteredStages,
  searchQuery,
  setSearchQuery,
  archivedView,
  setArchivedView,
  archivedProjects,
  onNewProject,
  onOpenProject,
  onArchiveProject,
  onRestoreProject,
  onQuoteCard,
}: PortalPipelineViewProps) {
  return (
    <div className="portal-pipeline flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <header className="flex-shrink-0 bg-[#FAF9F6] px-6 pb-4 pt-5 md:px-8">
        <p className="font-serif text-sm text-[#71717A]">Pixnxt Portal</p>
        <h1 className="mt-1 font-serif text-[2rem] font-medium leading-tight tracking-tight text-[#1A1A1A]">
          Project &amp; Lead Pipeline
        </h1>
        <p className="mt-1.5 text-sm text-[#71717A]">
          Manage your bookings, leads, and projects in one unified view
        </p>
      </header>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 bg-[#FAF9F6] px-6 pb-5 md:px-8">
        <div className="flex min-w-[260px] flex-1 items-center gap-2.5 rounded-full bg-[#EFEFED] px-4 py-2.5 transition-colors focus-within:bg-white focus-within:shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <Search className="size-4 flex-shrink-0 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search projects by client name, location, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-0 bg-transparent text-sm text-[#1A1A1A] outline-none placeholder:text-[#A1A1AA]"
          />
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-[#EFEFED] p-1">
          <button
            type="button"
            onClick={() => setArchivedView(false)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              !archivedView
                ? "bg-white text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-[#71717A] hover:text-[#1A1A1A]"
            }`}
          >
            <Layers className="size-4" />
            Active Pipeline
          </button>
          <button
            type="button"
            onClick={() => setArchivedView(true)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              archivedView
                ? "bg-white text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-[#71717A] hover:text-[#1A1A1A]"
            }`}
          >
            <Archive className="size-4" />
            Archived Views
          </button>
        </div>

        <button
          type="button"
          onClick={onNewProject}
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#2a2a2a]"
        >
          <Plus className="size-4" />
          New Project
        </button>
      </div>

      {!archivedView ? (
        <div className="flex-1 overflow-hidden px-6 pb-6 md:px-8">
          <div
            className="grid h-full min-h-0 grid-rows-1 gap-5 overflow-x-auto neu-scroll"
            style={{
              gridTemplateColumns: `repeat(${filteredStages.length}, minmax(248px, 1fr))`,
            }}
          >
            {filteredStages.map((stage) => (
              <div key={stage.id} className="flex h-full min-w-[248px] flex-col">
                <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
                  <h3 className="text-[13px] font-semibold text-[#1A1A1A]">
                    {stage.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#ECEAE6] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#71717A]">
                    {stage.cards.length}{" "}
                    {stage.section === "leads" ? "LEADS" : "PROJECTS"}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1 neu-scroll">
                  {stage.cards.map((card) => {
                    const tone = card.statusTone
                      ? statusToneStyles[card.statusTone]
                      : null
                    const displayAmount =
                      card.bookingAmount || card.amount || null
                    const showFinancials =
                      Boolean(displayAmount && card.statusTone)

                    return (
                      <div
                        key={card.id}
                        className="rounded-[20px] border border-[#F0F0F0] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-[0_12px_36px_rgba(0,0,0,0.07)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            onClick={() => onOpenProject(card.clientName)}
                            className="cursor-pointer font-serif text-[17px] font-medium leading-snug tracking-tight text-[#1A1A1A] line-clamp-1 hover:underline"
                          >
                            {card.clientName}
                          </h4>
                          <CardMenu
                            cardId={card.id}
                            onArchive={onArchiveProject}
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#A1A1AA]">
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Calendar className="size-3 shrink-0" />
                            <span className="truncate">{card.eventDate}</span>
                          </span>
                          <span className="inline-flex min-w-0 items-center justify-end gap-1 text-right">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">
                              {card.location.split(",")[0]}
                            </span>
                          </span>
                        </div>

                        {showFinancials && (
                          <div className="mt-3.5 flex items-center justify-between gap-2">
                            <span className="text-[15px] font-bold tracking-tight text-[#1A1A1A]">
                              {displayAmount}
                            </span>
                            {card.statusLabel && tone && (
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${tone.text}`}
                              >
                                <span
                                  className={`size-1.5 shrink-0 rounded-full ${tone.dot}`}
                                />
                                {card.statusLabel}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onQuoteCard(card.id)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[11px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#FAFAFA]"
                          >
                            <FileText className="size-3.5 text-[#A1A1AA]" />
                            Review Proposal
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenProject(card.clientName)}
                            className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#A1A1AA] transition-colors hover:bg-[#FAFAFA] hover:text-[#1A1A1A]"
                            title="View project"
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-medium text-[#1A1A1A]">
                Archived Projects
              </h2>
              <span className="text-xs text-[#71717A]">
                {archivedProjects.length} archived
              </span>
            </div>
            {archivedProjects.length > 0 ? (
              <div className="flex flex-col gap-3">
                {archivedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between gap-6 rounded-[20px] border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                  >
                    <div>
                      <p className="font-serif text-lg font-medium text-[#1A1A1A]">
                        {proj.clientName}
                      </p>
                      <p className="text-xs text-[#71717A]">
                        Archived on {proj.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-[#F4F4F5] px-4 py-1.5 font-mono text-sm font-semibold">
                        {proj.amount}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRestoreProject(proj.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-xs font-semibold text-[#71717A] transition-all hover:text-[#1A1A1A]"
                      >
                        <RotateCcw className="size-3" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[20px] border border-dashed border-[#E5E7EB] bg-white/60">
                <p className="text-sm text-[#71717A]">
                  No archived projects found.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
