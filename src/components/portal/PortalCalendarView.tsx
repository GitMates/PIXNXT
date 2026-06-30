import React from "react"
import {
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Camera,
  CalendarDays,
  Flag,
  AlertTriangle,
} from "lucide-react"
import {
  type CalendarView,
  type EventKind,
  type StudioEvent,
} from "./portalData"
import { cn } from "../../lib/utils"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export interface PortalCalendarViewProps {
  calendarYear: number
  calendarMonth: number
  calendarViewMode: CalendarView
  setCalendarViewMode: (mode: CalendarView) => void
  calendarFilters: Set<EventKind>
  toggleCalendarFilter: (kind: EventKind) => void
  calendarCells: (number | null)[]
  calendarEventsByDate: Map<string, StudioEvent[]>
  events: StudioEvent[]
  stepMonth: (dir: -1 | 1) => void
}

function CalendarEventPill({ event }: { event: StudioEvent }) {
  if (event.kind === "shoot") {
    return (
      <div className="rounded-lg bg-[#F0F0F0] px-2 py-1.5">
        <span className="flex items-center gap-1 text-[11px] font-medium leading-tight text-[#1A1A1A]">
          <Camera className="size-3 shrink-0 text-[#71717A]" />
          <span className="truncate">{event.title}</span>
        </span>
        {event.location && (
          <span className="mt-0.5 block truncate text-[10px] text-[#71717A]">
            {event.location}
          </span>
        )}
      </div>
    )
  }

  if (event.kind === "milestone") {
    return (
      <div className="rounded-lg bg-[#1A1A1A] px-2 py-1.5 text-white">
        <span className="flex items-center gap-1 text-[11px] font-medium leading-tight">
          <Flag className="size-3 shrink-0 text-white/90" />
          <span className="truncate">{event.title}</span>
        </span>
        {event.detail && (
          <span className="mt-0.5 block truncate text-[10px] text-white/75">
            {event.detail}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-[#F5C542] px-2 py-1.5">
      <span className="flex items-center gap-1 text-[11px] font-medium leading-tight text-[#1A1A1A]">
        <AlertTriangle className="size-3 shrink-0 text-[#1A1A1A]/80" />
        <span className="truncate">{event.title}</span>
      </span>
      {event.detail && (
        <span className="mt-0.5 block truncate text-[10px] text-[#1A1A1A]/75">
          {event.detail}
        </span>
      )}
    </div>
  )
}

export function PortalCalendarView({
  calendarYear,
  calendarMonth,
  calendarViewMode,
  setCalendarViewMode,
  calendarFilters,
  toggleCalendarFilter,
  calendarCells,
  calendarEventsByDate,
  events,
  stepMonth,
}: PortalCalendarViewProps) {
  const viewOptions = [
    { id: "month" as const, label: "Month", icon: CalendarDays },
    { id: "week" as const, label: "Week", icon: null },
    { id: "list" as const, label: "Deliverables List View", icon: ListChecks },
  ]

  const filterOptions = [
    { kind: "shoot" as EventKind, label: "Shoots", dot: "bg-[#D4D4D8]" },
    {
      kind: "milestone" as EventKind,
      label: "Client Milestones",
      dot: "bg-[#1A1A1A]",
    },
    {
      kind: "deadline" as EventKind,
      label: "Retoucher Deadlines",
      dot: "bg-[#F5C542]",
    },
  ]

  return (
    <div className="portal-calendar flex h-full flex-col overflow-hidden bg-[#FDFCF8]">
      <header className="shrink-0 bg-[#FDFCF8] px-6 py-5 md:px-8">
        <p className="text-sm text-[#71717A]">Pixnxt Portal</p>
        <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-[#1A1A1A]">
          Studio Operations Timeline
        </h1>
        <p className="mt-1.5 text-sm text-[#71717A]">
          Shoot dates, client milestones, and automated delivery deadlines in
          one view
        </p>
      </header>

      <div className="shrink-0 bg-[#FDFCF8] px-6 pb-5 md:px-8">
        {calendarViewMode !== "list" ? (
          <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] p-1 justify-self-start">
              {viewOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCalendarViewMode(opt.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                    calendarViewMode === opt.id
                      ? "bg-[#1A1A1A] text-white shadow-sm"
                      : "text-[#71717A] hover:text-[#1A1A1A]",
                  )}
                >
                  {opt.icon && <opt.icon className="size-4" />}
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 justify-self-center">
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                className="inline-flex size-8 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-black/[0.04] hover:text-[#1A1A1A]"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-[148px] text-center font-serif text-lg font-medium text-[#1A1A1A]">
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </span>
              <button
                type="button"
                onClick={() => stepMonth(1)}
                className="inline-flex size-8 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-black/[0.04] hover:text-[#1A1A1A]"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {filterOptions.map((f) => {
                const on = calendarFilters.has(f.kind)
                return (
                  <button
                    key={f.kind}
                    type="button"
                    onClick={() => toggleCalendarFilter(f.kind)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      on
                        ? "border-black/[0.08] bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "border-transparent bg-black/[0.04] text-[#71717A] opacity-60 hover:opacity-100",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", f.dot)} />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] p-1">
              {viewOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCalendarViewMode(opt.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                    calendarViewMode === opt.id
                      ? "bg-[#1A1A1A] text-white shadow-sm"
                      : "text-[#71717A] hover:text-[#1A1A1A]",
                  )}
                >
                  {opt.icon && <opt.icon className="size-4" />}
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filterOptions.map((f) => {
                const on = calendarFilters.has(f.kind)
                return (
                  <button
                    key={f.kind}
                    type="button"
                    onClick={() => toggleCalendarFilter(f.kind)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      on
                        ? "border-black/[0.08] bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "border-transparent bg-black/[0.04] text-[#71717A] opacity-60 hover:opacity-100",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", f.dot)} />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 neu-scroll">
        {calendarViewMode === "month" && (
          <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-7 border-b border-black/[0.06]">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#A1A1AA]"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((day, idx) => {
                const iso = day
                  ? `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : null
                const dayEvents = iso
                  ? (calendarEventsByDate.get(iso) ?? [])
                  : []
                const colIndex = idx % 7

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[110px] border-b border-black/[0.06] p-2",
                      colIndex < 6 && "border-r border-black/[0.06]",
                      !day ? "bg-[#FAFAFA]" : "bg-white",
                    )}
                  >
                    {day && (
                      <>
                        <div className="mb-1.5 pl-0.5">
                          <span className="text-xs font-medium text-[#71717A]">
                            {day}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map((e) => (
                            <CalendarEventPill key={e.id} event={e} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {calendarViewMode === "week" && (
          <div className="grid gap-3 md:grid-cols-7">
            {(() => {
              const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay()
              const daysInMonth = new Date(
                calendarYear,
                calendarMonth + 1,
                0,
              ).getDate()
              const weekDays: (number | null)[] = Array.from({ length: 7 }, (_, i) => {
                const d = i - firstWeekday + 1
                return d >= 1 && d <= daysInMonth ? d : null
              })
              return weekDays.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[220px] rounded-2xl border border-black/[0.04] bg-[#FAFAFA]"
                    />
                  )
                }
                const iso = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const dayEvents = calendarEventsByDate.get(iso) ?? []
                return (
                  <div
                    key={day}
                    className="flex min-h-[220px] flex-col rounded-2xl border border-black/[0.08] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-black/[0.06] pb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A1AA]">
                        {
                          DAY_HEADERS[
                            new Date(calendarYear, calendarMonth, day).getDay()
                          ]
                        }
                      </span>
                      <span className="text-xs font-medium text-[#71717A]">
                        {day}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {dayEvents.length === 0 ? (
                        <p className="pt-2 text-center text-[10px] text-[#A1A1AA]">
                          No events
                        </p>
                      ) : (
                        dayEvents.map((e) => (
                          <CalendarEventPill key={e.id} event={e} />
                        ))
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}

        {calendarViewMode === "list" && (
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-black/[0.06] bg-[#FAFAFA] px-6 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                Project Details
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                Due Date
              </span>
              <span className="w-24 text-right text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                Status
              </span>
            </div>
            {events
              .filter((e) => calendarFilters.has(e.kind))
              .map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-black/[0.06] px-6 py-4 transition-colors last:border-b-0 hover:bg-[#FAFAFA]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {e.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#71717A]">
                      {e.asset ?? e.detail}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#71717A]">
                    {e.date}
                  </span>
                  <div className="flex w-24 justify-end">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        e.status === "completed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : e.status === "overdue"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-black/[0.08] bg-[#F4F4F5] text-[#71717A]",
                      )}
                    >
                      {e.status ?? "in progress"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
