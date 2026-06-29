"use client"

import React, { useState, useRef, useMemo } from "react"
import "./portal.css"
import {
  type ViewMode,
  type SettingsTab,
  type EventKind,
  type CalendarView,
  type PipelineCard,
  type PipelineStage,
  INITIAL_STAGES,
  INITIAL_EVENTS,
  INITIAL_PACKAGES,
  INITIAL_ADDONS,
  INITIAL_LEGAL_TEMPLATES,
} from "./portalData"
import { PortalSidebar } from "./PortalSidebar"
import { PortalPipelineView } from "./PortalPipelineView"
import { PortalCalendarView } from "./PortalCalendarView"
import { PortalSettingsView } from "./PortalSettingsView"
import { PortalWorkspaceView } from "./PortalWorkspaceView"
import { PortalModals } from "./PortalModals"

export function PixnxtPortalSingle() {
  const [activeView, setActiveView] = useState<ViewMode>("pipeline")
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("General")

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
  const [calendarMonth, setCalendarMonth] = useState(6)
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarView>("month")
  const [calendarFilters, setCalendarFilters] = useState<Set<EventKind>>(
    new Set(["shoot", "milestone", "deadline"])
  )
  const [events] = useState(INITIAL_EVENTS)

  const [packagesList, setPackagesList] = useState(INITIAL_PACKAGES)
  const [addonsList, setAddonsList] = useState(INITIAL_ADDONS)
  const [editTarget, setEditTarget] = useState<{ kind: "package" | "addon"; id: string } | null>(null)
  const [editorTitle, setEditorTitle] = useState("")
  const [editorPrice, setEditorPrice] = useState("")
  const [editorDesc, setEditorDesc] = useState("")

  const [brandColors, setBrandColors] = useState([
    { label: "Primary Accent", hex: "#1a1a1a" },
    { label: "Neutral", hex: "#8a8478" },
    { label: "Background Tint", hex: "#f4f1ec" },
  ])
  const [fontFamily, setFontFamily] = useState("Playfair Display (Serif)")
  const [brandTemplate, setBrandTemplate] = useState("classic")

  const [legalTemplates, setLegalTemplates] = useState(INITIAL_LEGAL_TEMPLATES)
  const [selectedTemplateId, setSelectedTemplateId] = useState("commercial")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [profileName, setProfileName] = useState("Karakovan Studio")
  const [profileEmail, setProfileEmail] = useState("hello@karakovan.studio")
  const [profilePhone, setProfilePhone] = useState("+91 98765 43210")
  const [profileCurrency, setProfileCurrency] = useState("INR (₹)")

  const [clientChatAccess, setClientChatAccess] = useState(true)
  const [notifViewed, setNotifViewed] = useState(true)
  const [notifSigned, setNotifSigned] = useState(true)
  const [notifReminders, setNotifReminders] = useState(false)
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)

  const [workspaceTab, setWorkspaceTab] = useState<
    "overview" | "chat" | "proposals" | "contracts" | "team"
  >("proposals")
  const [simulatedRole, setSimulatedRole] = useState<
    "Owner" | "Studio Manager" | "Lead Editor"
  >("Owner")
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

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
    setWorkspaceTab("proposals")
  }

  const handleCloseProject = () => {
    setWorkspaceProjectName(null)
  }

  const goToView = (view: ViewMode) => {
    setActiveView(view)
    handleCloseProject()
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
        })
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

  const handleEditPackage = (pkg: (typeof packagesList)[0]) => {
    setEditTarget({ kind: "package", id: pkg.id })
    setEditorTitle(pkg.name)
    setEditorPrice(String(pkg.price))
    setEditorDesc(pkg.duration)
  }

  const handleEditAddon = (add: (typeof addonsList)[0]) => {
    setEditTarget({ kind: "addon", id: add.id })
    setEditorTitle(add.name)
    setEditorPrice(String(add.price))
    setEditorDesc(add.description)
  }

  const handleSaveEditor = () => {
    if (!editTarget) return
    const parsedPrice = Number(editorPrice.replace(/[^0-9.]/g, "")) || 0
    if (editTarget.kind === "package") {
      setPackagesList((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? { ...p, name: editorTitle, price: parsedPrice, duration: editorDesc }
            : p
        )
      )
    } else {
      setAddonsList((prev) =>
        prev.map((a) =>
          a.id === editTarget.id
            ? { ...a, name: editorTitle, price: parsedPrice, description: editorDesc }
            : a
        )
      )
    }
    setEditTarget(null)
  }

  const activeLegalTemplate = useMemo(() => {
    return legalTemplates.find((t) => t.id === selectedTemplateId) ?? legalTemplates[0]
  }, [legalTemplates, selectedTemplateId])

  const handleUpdateTemplateBody = (val: string) => {
    setLegalTemplates((prev) =>
      prev.map((t) => (t.id === selectedTemplateId ? { ...t, body: val } : t))
    )
  }

  const handleInsertToken = (token: string) => {
    const el = textareaRef.current
    if (!el) {
      handleUpdateTemplateBody(`${activeLegalTemplate.body} ${token}`)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next =
      activeLegalTemplate.body.slice(0, start) +
      token +
      activeLegalTemplate.body.slice(end)
    handleUpdateTemplateBody(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + token.length
      el.setSelectionRange(caret, caret)
    })
  }

  const handleCreateTemplate = () => {
    const id = `template-${Date.now()}`
    const newTpl = {
      id,
      name: "New Boilerplate Agreement Draft",
      updated: "Created just now",
      body: "Draft your terms here. Insert token placeholders like {{Client Name}}, {{Event Date}} or {{Package Value}}.",
    }
    setLegalTemplates([newTpl, ...legalTemplates])
    setSelectedTemplateId(id)
  }

  const handleDeleteTemplate = (id: string) => {
    setLegalTemplates((prev) => prev.filter((t) => t.id !== id))
    if (selectedTemplateId === id && legalTemplates.length > 1) {
      setSelectedTemplateId(legalTemplates.find((t) => t.id !== id)?.id ?? "")
    }
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
            workspaceTab={workspaceTab}
            setWorkspaceTab={setWorkspaceTab}
            simulatedRole={simulatedRole}
            setSimulatedRole={setSimulatedRole}
            roleMenuOpen={roleMenuOpen}
            setRoleMenuOpen={setRoleMenuOpen}
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

            {activeView === "settings" && (
              <PortalSettingsView
                activeSettingsTab={activeSettingsTab}
                setActiveSettingsTab={setActiveSettingsTab}
                profileName={profileName}
                setProfileName={setProfileName}
                profileEmail={profileEmail}
                setProfileEmail={setProfileEmail}
                profilePhone={profilePhone}
                setProfilePhone={setProfilePhone}
                profileCurrency={profileCurrency}
                setProfileCurrency={setProfileCurrency}
                packagesList={packagesList}
                setPackagesList={setPackagesList}
                addonsList={addonsList}
                setAddonsList={setAddonsList}
                onEditPackage={handleEditPackage}
                onEditAddon={handleEditAddon}
                brandColors={brandColors}
                setBrandColors={setBrandColors}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                brandTemplate={brandTemplate}
                setBrandTemplate={setBrandTemplate}
                notifViewed={notifViewed}
                setNotifViewed={setNotifViewed}
                notifSigned={notifSigned}
                setNotifSigned={setNotifSigned}
                notifReminders={notifReminders}
                setNotifReminders={setNotifReminders}
                clientChatAccess={clientChatAccess}
                setClientChatAccess={setClientChatAccess}
                whatsappEnabled={whatsappEnabled}
                setWhatsappEnabled={setWhatsappEnabled}
                legalTemplates={legalTemplates}
                selectedTemplateId={selectedTemplateId}
                setSelectedTemplateId={setSelectedTemplateId}
                activeLegalTemplate={activeLegalTemplate}
                textareaRef={textareaRef}
                onUpdateTemplateBody={handleUpdateTemplateBody}
                onInsertToken={handleInsertToken}
                onCreateTemplate={handleCreateTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}
          </>
        )}
      </main>

      <PortalModals
        isNewProjectModalOpen={isNewProjectModalOpen}
        setIsNewProjectModalOpen={setIsNewProjectModalOpen}
        setStages={setStages}
        quoteCardId={quoteCardId}
        setQuoteCardId={setQuoteCardId}
        editTarget={editTarget}
        setEditTarget={setEditTarget}
        editorTitle={editorTitle}
        setEditorTitle={setEditorTitle}
        editorPrice={editorPrice}
        setEditorPrice={setEditorPrice}
        editorDesc={editorDesc}
        setEditorDesc={setEditorDesc}
        onSaveEditor={handleSaveEditor}
      />
    </div>
  )
}
