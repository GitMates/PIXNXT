"use client"

import React, { useState, useMemo } from "react"
import "./portal.css"
import {
  type ViewMode,
  type EventKind,
  type CalendarView,
  type PipelineCard,
  type PipelineStage,
  INITIAL_STAGES,
  INITIAL_EVENTS,
  adaptCardToStage,
} from "./portalData"
import { PortalSidebar } from "./PortalSidebar"
import { PortalPipelineView } from "./PortalPipelineView"
import { PortalCalendarView } from "./PortalCalendarView"
import { PortalSettingsPage } from "./PortalSettingsPage"
import { PortalWorkspaceView } from "./PortalWorkspaceView"
import { PortalModals } from "./PortalModals"

function formatEventDate(iso: string) {
  if (!iso) return "Date TBD"
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function PixnxtPortalSingle() {
  const [activeView, setActiveView] = useState<ViewMode>("pipeline")

  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES)
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const [quoteCardId, setQuoteCardId] = useState<string | null>(null)
  const [archivedView, setArchivedView] = useState(false)
  const [archivedProjects, setArchivedProjects] = useState<
    Array<{ id: string; clientName: string; amount: string; date: string }>
  >([{ id: "arc-1", clientName: "Rahul & Simran", amount: "₹1,50,000", date: "2026-05-12" }])

  const [workspaceProjectName, setWorkspaceProjectName] = useState<string | null>(null)

  const [calendarYear, setCalendarYear] = useState(2026)
  const [calendarMonth, setCalendarMonth] = useState(7)
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarView>("month")
  const [calendarFilters, setCalendarFilters] = useState<Set<EventKind>>(
    new Set(["shoot", "milestone", "deadline"]),
  )
  const [events] = useState(INITIAL_EVENTS)

  const filteredStages = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      cards: stage.cards.filter((card) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return true
        return (
          card.clientName.toLowerCase().includes(query) ||
          card.location.toLowerCase().includes(query)
        )
      }),
    }))
  }, [stages, searchQuery])

  const handleOpenProject = (clientName: string) => {
    setWorkspaceProjectName(clientName)
  }

  const handleCloseProject = () => {
    setWorkspaceProjectName(null)
  }

  const goToView = (view: ViewMode) => {
    setActiveView(view)
    handleCloseProject()
  }

  const handleCreateProject = ({
    clientNames,
    eventDate,
    location,
  }: {
    clientNames: string
    eventDate: string
    location: string
    modules: Record<string, boolean>
  }) => {
    const loc = location.trim() || "Mumbai, Maharashtra"
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === "inquiry") {
          return {
            ...s,
            cards: [
              ...s.cards,
              {
                id: `card-${Date.now()}`,
                clientName: clientNames.trim(),
                eventDate: formatEventDate(eventDate),
                location: loc.includes(",") ? loc : `${loc}, India`,
              },
            ],
          }
        }
        return s
      }),
    )
  }

  const handleMoveCard = (cardId: string, toStageId: string) => {
    setStages((prev) => {
      let moved: PipelineCard | null = null
      let fromStageId: string | null = null

      const stripped = prev.map((stage) => {
        const remaining = stage.cards.filter((c) => {
          if (c.id === cardId) {
            moved = c
            fromStageId = stage.id
            return false
          }
          return true
        })
        return { ...stage, cards: remaining }
      })

      if (!moved || !fromStageId || fromStageId === toStageId) return prev

      const adapted = adaptCardToStage(moved, toStageId)
      return stripped.map((stage) =>
        stage.id === toStageId
          ? { ...stage, cards: [...stage.cards, adapted] }
          : stage,
      )
    })
  }

  const handleArchiveProject = (cardId: string) => {
    let movedCard: PipelineCard | null = null
    const updatedStages = stages.map((s) => {
      const remainingCards = s.cards.filter((c) => {
        if (c.id === cardId) {
          movedCard = c
          return false
        }
        return true
      })
      return { ...s, cards: remainingCards }
    })
    if (movedCard) {
      setStages(updatedStages)
      setArchivedProjects((prev) => [
        ...prev,
        {
          id: movedCard!.id,
          clientName: movedCard!.clientName,
          amount: movedCard!.bookingAmount || movedCard!.amount || "₹1,20,005",
          date: new Date().toISOString().split("T")[0],
        },
      ])
    }
  }

  const handleRestoreProject = (arcId: string) => {
    const proj = archivedProjects.find((p) => p.id === arcId)
    if (proj) {
      setArchivedProjects((prev) => prev.filter((p) => p.id !== arcId))
      setStages((prev) =>
        prev.map((s) => {
          if (s.id === "inquiry") {
            return {
              ...s,
              cards: [
                ...s.cards,
                {
                  id: proj.id,
                  clientName: proj.clientName,
                  eventDate: "July 25, 2026",
                  location: "Mumbai, Maharashtra",
                  bookingAmount: proj.amount,
                },
              ],
            }
          }
          return s
        }),
      )
    }
  }

  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>()
    events
      .filter((e) => calendarFilters.has(e.kind))
      .forEach((e) => {
        const arr = map.get(e.date) ?? []
        arr.push(e)
        map.set(e.date, arr)
      })
    return map
  }, [events, calendarFilters])

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay()
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
    const cells: (number | null)[] = [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calendarYear, calendarMonth])

  const stepMonth = (dir: -1 | 1) => {
    let m = calendarMonth + dir
    let y = calendarYear
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setCalendarMonth(m)
    setCalendarYear(y)
  }

  const toggleCalendarFilter = (kind: EventKind) => {
    setCalendarFilters((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  return (
    <div className="theme-mono flex h-screen overflow-hidden bg-[#FAF9F6] text-foreground">
      <PortalSidebar
        activeView={activeView}
        workspaceProjectName={workspaceProjectName}
        goToView={goToView}
        userInitial="N"
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {workspaceProjectName ? (
          <PortalWorkspaceView
            workspaceProjectName={workspaceProjectName}
            onCloseProject={handleCloseProject}
          />
        ) : (
          <>
            {activeView === "pipeline" && (
              <PortalPipelineView
                filteredStages={filteredStages}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                archivedView={archivedView}
                setArchivedView={setArchivedView}
                archivedProjects={archivedProjects}
                onNewProject={() => setIsNewProjectModalOpen(true)}
                onOpenProject={handleOpenProject}
                onArchiveProject={handleArchiveProject}
                onRestoreProject={handleRestoreProject}
                onQuoteCard={setQuoteCardId}
                onMoveCard={handleMoveCard}
              />
            )}

            {activeView === "calendar" && (
              <PortalCalendarView
                calendarYear={calendarYear}
                calendarMonth={calendarMonth}
                calendarViewMode={calendarViewMode}
                setCalendarViewMode={setCalendarViewMode}
                calendarFilters={calendarFilters}
                toggleCalendarFilter={toggleCalendarFilter}
                calendarCells={calendarCells}
                calendarEventsByDate={calendarEventsByDate}
                events={events}
                stepMonth={stepMonth}
              />
            )}

            {activeView === "settings" && <PortalSettingsPage />}
          </>
        )}
      </main>

      <PortalModals
        isNewProjectModalOpen={isNewProjectModalOpen}
        setIsNewProjectModalOpen={setIsNewProjectModalOpen}
        onCreateProject={handleCreateProject}
        stages={stages}
        quoteCardId={quoteCardId}
        setQuoteCardId={setQuoteCardId}
        onOpenWorkspace={handleOpenProject}
      />
    </div>
  )
}
