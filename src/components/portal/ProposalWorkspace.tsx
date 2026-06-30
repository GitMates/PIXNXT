import React, { useState } from "react"
import { Send, Eye, Pencil, ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { ProposalForm } from "./ProposalForm"
import { ProposalPreview } from "./ProposalPreview"

type ViewMode = "edit" | "preview"
type ProposalStatus = "draft" | "sent" | "accepted" | "declined"

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: "bg-[#F4F4F5] text-[#71717A]",
  sent: "bg-amber-100 text-amber-700",
  accepted: "bg-[#207c50]/10 text-[#207c50]",
  declined: "bg-red-100 text-red-600",
}

export interface ProposalState {
  clientName: string
  eventDate: string
  eventLocation: string
  selectedPackage: string
  selectedAddOns: string[]
  customItems: { id: string; name: string; price: number }[]
  selectedBilling: string
  selectedContract: string
  taxRate: number
  notes: string
}

const STATUSES: ProposalStatus[] = ["draft", "sent", "accepted", "declined"]

interface ProposalWorkspaceProps {
  embedded?: boolean
  defaultProposal?: Partial<ProposalState>
}

export function ProposalWorkspace({
  embedded = false,
  defaultProposal,
}: ProposalWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("edit")
  const [status, setStatus] = useState<ProposalStatus>("draft")
  const [statusOpen, setStatusOpen] = useState(false)
  const [proposal, setProposal] = useState<ProposalState>({
    clientName: "",
    eventDate: "",
    eventLocation: "",
    selectedPackage: "p2",
    selectedAddOns: [],
    customItems: [],
    selectedBilling: "b1",
    selectedContract: "c1",
    taxRate: 18,
    notes: "",
    ...defaultProposal,
  })

  const update = (patch: Partial<ProposalState>) =>
    setProposal((prev) => ({ ...prev, ...patch }))

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <div className="flex-shrink-0 border-b border-[#ECEAE6] bg-[#FAF9F6] px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {!embedded && (
              <div className="min-w-0">
                <h1 className="truncate font-serif text-2xl font-medium leading-none text-[#1A1A1A]">
                  Proposals &amp; Invoices
                </h1>
                <p className="mt-1 truncate text-xs text-[#71717A]">
                  {proposal.clientName
                    ? `For ${proposal.clientName}`
                    : "New proposal — fill in client details below"}
                </p>
              </div>
            )}

            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setStatusOpen(!statusOpen)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  STATUS_STYLES[status],
                )}
              >
                <span className="size-1.5 rounded-full bg-current opacity-70" />
                {status} Proposal · v1
                <ChevronDown className="size-3" />
              </button>
              {statusOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setStatusOpen(false)}
                  />
                  <div className="absolute left-0 top-9 z-50 min-w-[130px] rounded-xl border border-[#ECEAE6] bg-white p-1 shadow-lg neu-circle">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStatus(s)
                          setStatusOpen(false)
                        }}
                        className={cn(
                          "w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium capitalize transition-colors hover:bg-[#F4F4F5]",
                          status === s && "bg-[#F4F4F5]",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="neu-inset flex flex-shrink-0 items-center rounded-full p-1">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-5 py-1.5 text-xs font-medium transition-all",
                viewMode === "edit"
                  ? "neu-circle bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#71717A] hover:text-[#1A1A1A]",
              )}
            >
              <Pencil className="size-3" />
              Edit Details
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-5 py-1.5 text-xs font-medium transition-all",
                viewMode === "preview"
                  ? "neu-circle bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#71717A] hover:text-[#1A1A1A]",
              )}
            >
              <Eye className="size-3" />
              Live Client Preview
            </button>
          </div>

          <button
            type="button"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
          >
            <Send className="size-3.5" />
            Send Proposal
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {viewMode === "edit" ? (
          <ProposalForm proposal={proposal} onChange={update} />
        ) : (
          <ProposalPreview proposal={proposal} />
        )}
      </div>
    </div>
  )
}
