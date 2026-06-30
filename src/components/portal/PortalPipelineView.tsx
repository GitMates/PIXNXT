import React, { useState, useRef, useEffect, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
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
import {
  type PipelineCard,
  type PipelineStage,
  type FinancialTone,
} from "./portalData"

const statusToneStyles: Record<
  FinancialTone,
  { dot: string; text: string }
> = {
  paid: { dot: "bg-[#00875A]", text: "text-[#006D5B]" },
  awaiting: { dot: "bg-[#BF4E00]", text: "text-[#BF4E00]" },
  editing: { dot: "bg-[#5A6B81]", text: "text-[#5A6B81]" },
  delivered: { dot: "bg-[#00875A]", text: "text-[#00875A]" },
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
  onMoveCard: (cardId: string, toStageId: string) => void
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

function FinancialBar({ card }: { card: PipelineCard }) {
  const displayAmount = card.bookingAmount || card.amount
  if (!displayAmount || !card.statusTone) return null

  const tone = statusToneStyles[card.statusTone]

  if (card.statusTone === "paid" && card.paidAmount) {
    return (
      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-[#F5F5F5] px-3 py-2">
        <span className="text-[13px] font-bold tracking-tight text-[#1A1A1A]">
          {displayAmount}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
          <div className="text-right leading-tight">
            <p className={`text-xs font-semibold ${tone.text}`}>
              {card.paidAmount}
            </p>
            <p className={`text-[10px] font-medium ${tone.text}`}>Paid</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-full bg-[#F5F5F5] px-3 py-1.5">
      <span className="text-[13px] font-bold tracking-tight text-[#1A1A1A]">
        {displayAmount}
      </span>
      {card.statusLabel && (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium ${tone.text}`}
        >
          <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
          {card.statusLabel}
        </span>
      )}
    </div>
  )
}

interface PipelineCardContentProps {
  card: PipelineCard
  onOpenProject: (clientName: string) => void
  onArchiveProject: (cardId: string) => void
  onQuoteCard: (cardId: string) => void
}

function PipelineCardContent({
  card,
  onOpenProject,
  onArchiveProject,
  onQuoteCard,
}: PipelineCardContentProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <h4
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenProject(card.clientName)}
          className="cursor-pointer font-serif text-[15px] font-semibold leading-tight tracking-tight text-[#1A1A1A] line-clamp-1 hover:underline"
        >
          {card.clientName}
        </h4>
        <CardMenu cardId={card.id} onArchive={onArchiveProject} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[#757575]">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Calendar className="size-2.5 shrink-0" />
          <span className="truncate">{card.eventDate}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="size-2.5 shrink-0" />
          <span className="truncate">{card.location.split(",")[0]}</span>
        </span>
      </div>

      <FinancialBar card={card} />

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onQuoteCard(card.id)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#F5F5F5] px-2.5 py-1.5 text-[10px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#EBEBEB]"
        >
          <FileText className="size-3 text-[#717171]" />
          Review Proposal
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenProject(card.clientName)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#717171] transition-colors hover:bg-[#EBEBEB] hover:text-[#1A1A1A]"
          title="View project"
        >
          <Eye className="size-3.5" />
        </button>
      </div>
    </>
  )
}

function DraggablePipelineCard({
  card,
  onOpenProject,
  onArchiveProject,
  onQuoteCard,
}: PipelineCardContentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none rounded-[20px] bg-white p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] ${
        isDragging ? "cursor-grabbing opacity-40" : "cursor-grab"
      }`}
    >
      <PipelineCardContent
        card={card}
        onOpenProject={onOpenProject}
        onArchiveProject={onArchiveProject}
        onQuoteCard={onQuoteCard}
      />
    </div>
  )
}

function DroppableStageColumn({
  stage,
  children,
  isOver,
}: {
  stage: PipelineStage
  children: React.ReactNode
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: stage.id })

  return (
    <div ref={setNodeRef} className="flex h-full min-w-[220px] flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h3 className="font-heading text-[11px] font-bold uppercase tracking-wide text-[#1A1A1A]">
          {stage.title}
        </h3>
        <span className="shrink-0 rounded-full bg-[#ECEAE6] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#71717A]">
          {stage.cards.length}{" "}
          {stage.section === "leads" ? "LEADS" : "PROJECTS"}
        </span>
      </div>

      <div
        className={`flex-1 space-y-2 overflow-y-auto rounded-xl pr-1 neu-scroll transition-colors ${
          isOver ? "bg-[#1A1A1A]/[0.03] ring-2 ring-[#1A1A1A]/10" : ""
        }`}
      >
        {children}
      </div>
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
  onMoveCard,
}: PortalPipelineViewProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [overStageId, setOverStageId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const cardById = useMemo(() => {
    const map = new Map<string, PipelineCard>()
    filteredStages.forEach((stage) => {
      stage.cards.forEach((card) => map.set(card.id, card))
    })
    return map
  }, [filteredStages])

  const activeCard = activeCardId ? cardById.get(activeCardId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id
    if (!overId) {
      setOverStageId(null)
      return
    }
    const id = String(overId)
    if (filteredStages.some((s) => s.id === id)) {
      setOverStageId(id)
      return
    }
    for (const stage of filteredStages) {
      if (stage.cards.some((c) => c.id === id)) {
        setOverStageId(stage.id)
        return
      }
    }
    setOverStageId(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCardId(null)
    setOverStageId(null)
    if (!over) return

    let toStageId = String(over.id)
    if (!filteredStages.some((s) => s.id === toStageId)) {
      const host = filteredStages.find((s) =>
        s.cards.some((c) => c.id === toStageId),
      )
      if (!host) return
      toStageId = host.id
    }

    onMoveCard(String(active.id), toStageId)
  }

  const handleDragCancel = () => {
    setActiveCardId(null)
    setOverStageId(null)
  }

  return (
    <div className="portal-pipeline flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <header className="flex-shrink-0 bg-[#FAF9F6] px-6 pb-4 pt-5 md:px-8">
        <p className="font-serif text-sm text-[#71717A]">Pixnxt Portal</p>
        <h1 className="mt-1 font-heading text-[1.75rem] font-medium uppercase leading-tight tracking-tight text-[#1A1A1A] md:text-[2rem]">
          Project &amp; Lead Pipeline
        </h1>
        <p className="mt-1.5 text-sm text-[#757575]">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div
              className="grid h-full min-h-0 grid-rows-1 gap-5 overflow-x-auto neu-scroll"
              style={{
                gridTemplateColumns: `repeat(${filteredStages.length}, minmax(220px, 1fr))`,
              }}
            >
              {filteredStages.map((stage) => (
                <DroppableStageColumn
                  key={stage.id}
                  stage={stage}
                  isOver={overStageId === stage.id}
                >
                  {stage.cards.map((card) => (
                    <DraggablePipelineCard
                      key={card.id}
                      card={card}
                      onOpenProject={onOpenProject}
                      onArchiveProject={onArchiveProject}
                      onQuoteCard={onQuoteCard}
                    />
                  ))}
                </DroppableStageColumn>
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeCard ? (
                <div className="w-[220px] rotate-1 cursor-grabbing rounded-[20px] bg-white p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                  <PipelineCardContent
                    card={activeCard}
                    onOpenProject={onOpenProject}
                    onArchiveProject={onArchiveProject}
                    onQuoteCard={onQuoteCard}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
                    className="flex items-center justify-between gap-6 rounded-[28px] bg-white px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
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
              <div className="flex h-40 items-center justify-center rounded-[28px] border border-dashed border-[#E5E7EB] bg-white/60">
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
