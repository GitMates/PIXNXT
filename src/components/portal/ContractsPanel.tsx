import React, { useState } from "react"
import {
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
  Send,
} from "lucide-react"
import { cn } from "../../lib/utils"

const auditTrail = [
  {
    id: "1",
    done: true,
    title: "Contract initialized and mapped to Premium Package.",
    meta: "Jun 28, 2026 · 10:14 AM · Ananya Iyer",
  },
  {
    id: "2",
    done: true,
    title: "Automated contract link delivered via WhatsApp API push.",
    meta: "Jun 28, 2026 · 10:16 AM",
  },
  {
    id: "3",
    done: false,
    title: "Client e-signature execution",
    meta: "Pending",
  },
]

export function ContractsPanel() {
  const [ownerCountersign, setOwnerCountersign] = useState(true)
  const [blockEditing, setBlockEditing] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6 md:flex-row md:p-8">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[#ECEAE6] bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#1A1A1A]">
            Legal Agreements Overview
          </h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Track contract status, revisions, and client signature progress.
          </p>
        </div>

        <div className="mt-5 rounded-xl bg-[#F4F4F5] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1A1A1A]">
                <FileText className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  Priya_Rohit_Wedding_Contract_v2.pdf
                </p>
                <p className="text-xs text-[#71717A]">PDF Document · 248 KB</p>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#1A1A1A] hover:underline"
                  >
                    <FileText className="size-3" />
                    View Document
                  </button>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#1A1A1A] hover:underline"
                  >
                    <Pencil className="size-3" />
                    Edit Terms
                  </button>
                </div>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF0B3] px-2.5 py-1 text-[10px] font-medium text-[#BF4E00]">
              <span className="size-1.5 rounded-full bg-[#BF4E00]" />
              Awaiting Client Signature
            </span>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
            Audit Trail
          </p>
          <div className="space-y-4">
            {auditTrail.map((item) => (
              <div key={item.id} className="flex gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                    item.done
                      ? "bg-[#E3FCEF] text-[#00875A]"
                      : "bg-[#F4F4F5] text-[#A1A1AA]",
                  )}
                >
                  {item.done ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                </span>
                <div>
                  <p className="text-sm text-[#1A1A1A]">{item.title}</p>
                  <p className="text-xs text-[#71717A]">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 rounded-2xl border border-[#ECEAE6] bg-white p-6 shadow-sm md:w-[340px]">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#1A1A1A]">
            Contract Settings
          </h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Configure templates and signing rules for this project.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#71717A]">
              Apply Base Contract Template
            </label>
            <select className="neu-input w-full rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A]">
              <option>Choose a master template...</option>
              <option>Standard Wedding Agreement</option>
              <option>Destination Wedding Agreement</option>
            </select>
          </div>

          <ToggleRow
            label="Require Studio Owner Countersign"
            description="Owner must countersign after client execution."
            enabled={ownerCountersign}
            onToggle={() => setOwnerCountersign((v) => !v)}
          />
          <ToggleRow
            label="Block package editing during sign phase"
            description="Lock proposal edits while awaiting signature."
            enabled={blockEditing}
            onToggle={() => setBlockEditing((v) => !v)}
          />
        </div>

        <button
          type="button"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
        >
          <Send className="size-3.5" />
          Regenerate &amp; Send Revised Contract
        </button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
        <p className="text-xs text-[#71717A]">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          enabled ? "bg-[#207c50]" : "bg-[#71717A]/30",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  )
}
