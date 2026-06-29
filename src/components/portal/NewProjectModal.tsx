import React, { useState } from "react"
import { X, Images, BookOpen, Smartphone, Sparkles } from "lucide-react"
import { cn } from "../../lib/utils"

export interface NewProjectModalProps {
  onClose: () => void
  onCreate: (project: {
    clientNames: string
    eventDate: string
    location: string
    modules: Record<string, boolean>
  }) => void
}

const moduleOptions = [
  {
    id: "client-gallery",
    label: "Client Gallery",
    description: "Share collections and collect favorites",
    icon: Images,
  },
  {
    id: "album-proofer",
    label: "Album Proofer",
    description: "Swipeable spreads with feedback",
    icon: BookOpen,
  },
  {
    id: "mobile-gallery",
    label: "Mobile App Gallery",
    description: "Premium app delivery for VIP clients",
    icon: Smartphone,
  },
  {
    id: "ai-live-gallery",
    label: "AI Live Gallery",
    description: "Real-time WhatsApp face-recognition delivery",
    icon: Sparkles,
  },
]

export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [clientNames, setClientNames] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [location, setLocation] = useState("")
  const [modules, setModules] = useState<Record<string, boolean>>({
    "client-gallery": true,
    "album-proofer": false,
    "mobile-gallery": false,
    "ai-live-gallery": false,
  })

  const toggleModule = (id: string) => {
    setModules((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCreate = () => {
    if (!clientNames.trim()) return
    onCreate({ clientNames, eventDate, location, modules })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="neu-circle neu-scroll max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#ECEAE6] bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#71717A]">
              New Booking
            </p>
            <h2 className="mt-1 font-serif text-xl font-medium text-[#1A1A1A]">
              Create a project
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-[#F4F4F5]/80"
            aria-label="Close"
          >
            <X className="size-5 text-[#71717A]" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">
              Client names
            </label>
            <input
              type="text"
              value={clientNames}
              onChange={(e) => setClientNames(e.target.value)}
              placeholder="Priya & Rohit"
              className="w-full rounded-lg border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A] neu-inset"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                Event date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Udaipur"
                className="w-full rounded-lg border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A] neu-inset"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-1 text-sm font-medium text-[#1A1A1A]">
            Activate modules
          </p>
          <p className="mb-3 text-xs text-[#71717A]">
            Choose which delivery experiences this client unlocks
          </p>
          <div className="flex flex-col gap-2.5">
            {moduleOptions.map((mod) => {
              const enabled = modules[mod.id]
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    enabled
                      ? "border-[#207c50]/30 bg-[#207c50]/5"
                      : "border-[#ECEAE6] bg-white hover:bg-[#FAF9F6]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      enabled
                        ? "bg-[#207c50] text-white"
                        : "bg-[#F4F4F5] text-[#71717A]",
                    )}
                  >
                    <mod.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[#1A1A1A]">
                      {mod.label}
                    </span>
                    <span className="block truncate text-xs text-[#71717A]">
                      {mod.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      enabled ? "bg-[#1A1A1A]" : "bg-[#71717A]/30",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
                        enabled ? "translate-x-4" : "translate-x-0.5",
                      )}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="neu-circle active:neu-inset flex-1 rounded-lg border border-[#ECEAE6] bg-white px-4 py-2.5 text-sm font-medium text-[#1A1A1A] transition-all hover:shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!clientNames.trim()}
            className="neu-circle active:neu-inset flex-1 rounded-lg border border-[#1A1A1A]/30 bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create project
          </button>
        </div>
      </div>
    </div>
  )
}
