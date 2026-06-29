import React, { useState } from "react"
import { Link } from "react-router-dom"
import {
  Calendar,
  MapPin,
  Wallet,
  CheckCircle2,
  Images,
  BookOpen,
  Smartphone,
  Sparkles,
  ArrowUpRight,
} from "lucide-react"
import { cn } from "../../lib/utils"

const milestones = [
  { label: "Inquiry", done: true },
  { label: "Quote Sent", done: true },
  { label: "Booked", done: true },
  { label: "Shooting", done: false },
  { label: "Editing", done: false },
  { label: "Delivered", done: false },
]

interface ModuleState {
  id: string
  label: string
  description: string
  icon: typeof Images
  href: string
  stat: string
  enabled: boolean
}

const initialModules: ModuleState[] = [
  {
    id: "client-gallery",
    label: "Client Gallery",
    description: "Share collections and collect favorites",
    icon: Images,
    href: "/client-gallery",
    stat: "412 photos shared",
    enabled: true,
  },
  {
    id: "album-proofer",
    label: "Album Proofer",
    description: "Swipeable spreads with feedback",
    icon: BookOpen,
    href: "/smart-albums",
    stat: "24 spreads · awaiting review",
    enabled: true,
  },
  {
    id: "mobile-gallery",
    label: "Mobile App Gallery",
    description: "Premium app delivery for VIP clients",
    icon: Smartphone,
    href: "/mobile-gallery",
    stat: "Not provisioned",
    enabled: false,
  },
  {
    id: "ai-live-gallery",
    label: "AI Live Gallery",
    description: "Real-time WhatsApp face-recognition delivery",
    icon: Sparkles,
    href: "#",
    stat: "Not provisioned",
    enabled: false,
  },
]

export interface ProjectOverviewPanelProps {
  clientName: string
}

export function ProjectOverviewPanel({ clientName }: ProjectOverviewPanelProps) {
  const [modules, setModules] = useState<ModuleState[]>(initialModules)

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
    )
  }

  return (
    <div className="neu-scroll h-full overflow-y-auto px-6 py-6 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl neu-circle border border-[#ECEAE6] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#1A1A1A]">
                {clientName}
              </h2>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#207c50]/15 px-2.5 py-1 text-xs font-medium text-[#207c50]">
                <CheckCircle2 className="size-3" />
                Booked / Deposited
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Detail icon={Calendar} label="Event date" value="July 15, 2025" />
              <Detail icon={MapPin} label="Location" value="Mumbai, Maharashtra" />
              <Detail icon={Wallet} label="Booking value" value="₹1,85,000" />
            </div>
          </div>

          <div className="mt-6 border-t border-[#ECEAE6] pt-6">
            <p className="mb-4 text-sm font-medium text-[#1A1A1A]">
              Project progress
            </p>
            <div className="flex items-center justify-between gap-1">
              {milestones.map((m, i) => (
                <div key={m.label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        m.done
                          ? "bg-[#1A1A1A] text-white"
                          : "neu-inset text-[#71717A]",
                      )}
                    >
                      {m.done ? <CheckCircle2 className="size-4" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-center text-[11px] font-medium",
                        m.done ? "text-[#1A1A1A]" : "text-[#71717A]",
                      )}
                    >
                      {m.label}
                    </span>
                  </div>
                  {i < milestones.length - 1 && (
                    <div
                      className={cn(
                        "mx-1 mb-5 h-0.5 flex-1 rounded-full",
                        milestones[i + 1].done ? "bg-[#1A1A1A]" : "bg-[#ECEAE6]",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[#1A1A1A]">
            Delivery modules
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className={cn(
                  "flex flex-col rounded-2xl border p-5 transition-all",
                  mod.enabled
                    ? "neu-circle border-[#ECEAE6] bg-white"
                    : "border-dashed border-[#ECEAE6] bg-[#FAF9F6]/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex size-10 items-center justify-center rounded-xl transition-colors",
                        mod.enabled
                          ? "bg-[#1A1A1A] text-white"
                          : "bg-[#F4F4F5] text-[#71717A]",
                      )}
                    >
                      <mod.icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {mod.label}
                      </p>
                      <p className="text-xs text-[#71717A]">{mod.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    aria-label={`Toggle ${mod.label}`}
                    className={cn(
                      "relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      mod.enabled ? "bg-[#207c50]" : "bg-[#71717A]/30",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
                        mod.enabled ? "translate-x-4" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#ECEAE6] pt-3">
                  <span className="text-xs text-[#71717A]">{mod.stat}</span>
                  {mod.enabled && mod.href !== "#" ? (
                    <Link
                      to={mod.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1A1A1A] hover:underline"
                    >
                      Open module
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-[#71717A]">
                      {mod.enabled ? "Coming soon" : "Disabled"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#71717A]" />
      <div>
        <p className="text-xs text-[#71717A]">{label}</p>
        <p className="text-sm font-medium text-[#1A1A1A]">{value}</p>
      </div>
    </div>
  )
}
