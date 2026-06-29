import React from "react"
import {
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Camera,
} from "lucide-react"
import {
  type CalendarView,
  type EventKind,
  type StudioEvent,
} from "./portalData"

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
    { id: "month" as const, label: "Month", icon: null },
    { id: "week" as const, label: "Week", icon: null },
    { id: "list" as const, label: "Deliverables List View", icon: ListChecks },
  ]

  const filterOptions = [
    { kind: "shoot" as EventKind, label: "Shoots", dot: "bg-neutral-300" },
    { kind: "milestone" as EventKind, label: "Client Milestones", dot: "bg-neutral-900" },
    { kind: "deadline" as EventKind, label: "Retoucher Deadlines", dot: "bg-amber-500" },
  ]

  return (
    <div className="portal-calendar flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <header className="flex-shrink-0 bg-[#FAF9F6] px-6 py-5 md:px-8">
        <p className="text-sm text-[#71717A]">Pixnxt Portal</p>
        <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-[#1A1A1A]">
          Studio Operations Timeline
        </h1>
        <p className="mt-1.5 text-sm text-[#71717A]">
          Shoot dates, client milestones, and automated delivery deadlines in one view
        </p>
      </header>

      <div className="flex-shrink-0 bg-[#FAF9F6] px-6 pb-5 md:px-8">
        {calendarViewMode !== "list" ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] p-1 justify-self-start">
              {viewOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCalendarViewMode(opt.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    calendarViewMode === opt.id
                      ? "bg-[#1A1A1A] text-white shadow-sm"
                      : "text-[#71717A] hover:text-[#1A1A1A]"
                  }`}
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

            <div className="flex items-center justify-end gap-2 justify-self-end">
              {filterOptions.map((f) => {
                const on = calendarFilters.has(f.kind)
                return (
                  <button
                    key={f.kind}
                    type="button"
                    onClick={() => toggleCalendarFilter(f.kind)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      on
                        ? "border-black/[0.08] bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "border-transparent bg-black/[0.04] text-[#71717A] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <span className={`size-2 rounded-full ${f.dot}`} />
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
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    calendarViewMode === opt.id
                      ? "bg-[#1A1A1A] text-white shadow-sm"
                      : "text-[#71717A] hover:text-[#1A1A1A]"
                  }`}
                >
                  {opt.icon && <opt.icon className="size-4" />}
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {filterOptions.map((f) => {
                const on = calendarFilters.has(f.kind)
                return (
                  <button
                    key={f.kind}
                    type="button"
                    onClick={() => toggleCalendarFilter(f.kind)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      on
                        ? "border-black/[0.08] bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "border-transparent bg-black/[0.04] text-[#71717A] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <span className={`size-2 rounded-full ${f.dot}`} />
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
                const dayEvents = iso ? (calendarEventsByDate.get(iso) ?? []) : []
                const isToday = iso === "2026-07-15"
                const colIndex = idx % 7

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] border-b border-black/[0.06] p-2 ${
                      colIndex < 6 ? "border-r border-black/[0.06]" : ""
                    } ${!day ? "bg-[#FAFAFA]" : "bg-white"}`}
                  >
                    {day && (
                      <>
                        <div className="mb-1.5">
                          <span
                            className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                              isToday
                                ? "bg-[#1A1A1A] text-white"
                                : "text-[#71717A]"
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map((e) => (
                            <div
                              key={e.id}
                              className="rounded-lg bg-[#F4F4F5] px-2 py-1.5 text-left"
                            >
                              <span className="flex items-center gap-1 text-[11px] font-medium leading-tight text-[#1A1A1A]">
                                {e.kind === "shoot" && (
                                  <Camera className="size-3 shrink-0 text-[#71717A]" />
                                )}
                                <span className="truncate">{e.title}</span>
                              </span>
                              {e.location && (
                                <span className="mt-0.5 block truncate text-[10px] text-[#71717A]">
                                  {e.location}
                                </span>
                              )}
                            </div>
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
            {[15, 16, 17, 18, 19, 20, 21].map((day) => {
              const iso = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const dayEvents = calendarEventsByDate.get(iso) ?? []
              const isToday = iso === "2026-07-15"
              return (
                <div
                  key={day}
                  className="flex min-h-[220px] flex-col rounded-2xl border border-black/[0.08] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-black/[0.06] pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A1AA]">
                      {DAY_HEADERS[new Date(calendarYear, calendarMonth, day).getDay()]}
                    </span>
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-[#1A1A1A] text-white"
                          : "bg-[#F4F4F5] text-[#71717A]"
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {dayEvents.length === 0 ? (
                      <p className="pt-2 text-center text-[10px] text-[#A1A1AA]">No events</p>
                    ) : (
                      dayEvents.map((e) => (
                        <div
                          key={e.id}
                          className="rounded-lg bg-[#F4F4F5] px-2 py-1.5 text-[11px]"
                        >
                          <p className="flex items-center gap-1 font-medium truncate text-[#1A1A1A]">
                            {e.kind === "shoot" && (
                              <Camera className="size-3 shrink-0 text-[#71717A]" />
                            )}
                            {e.title}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-[#71717A]">
                            {e.detail ?? e.location}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
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
                    <p className="text-sm font-medium text-[#1A1A1A]">{e.title}</p>
                    <p className="mt-0.5 text-xs text-[#71717A]">{e.asset ?? e.detail}</p>
                  </div>
                  <span className="font-mono text-xs text-[#71717A]">{e.date}</span>
                  <div className="flex w-24 justify-end">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        e.status === "completed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : e.status === "overdue"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-black/[0.08] bg-[#F4F4F5] text-[#71717A]"
                      }`}
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
