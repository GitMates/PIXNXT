import React from "react"
import { X } from "lucide-react"
import { type PipelineStage } from "./portalData"
import { NewProjectModal } from "./NewProjectModal"

export interface PortalModalsProps {
  isNewProjectModalOpen: boolean
  setIsNewProjectModalOpen: (open: boolean) => void
  onCreateProject: (project: {
    clientNames: string
    eventDate: string
    location: string
    modules: Record<string, boolean>
  }) => void
  stages: PipelineStage[]
  quoteCardId: string | null
  setQuoteCardId: (id: string | null) => void
  onOpenWorkspace: (clientName: string) => void
}

export function PortalModals({
  isNewProjectModalOpen,
  setIsNewProjectModalOpen,
  onCreateProject,
  stages,
  quoteCardId,
  setQuoteCardId,
  onOpenWorkspace,
}: PortalModalsProps) {
  const quoteCard = quoteCardId
    ? stages.flatMap((s) => s.cards).find((c) => c.id === quoteCardId)
    : null

  return (
    <>
      {isNewProjectModalOpen && (
        <NewProjectModal
          onClose={() => setIsNewProjectModalOpen(false)}
          onCreate={onCreateProject}
        />
      )}

      {quoteCardId && quoteCard && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[2px]">
          <div
            className="flex h-full w-full max-w-[380px] flex-col border-l border-[#ECEAE6] bg-[#FAF9F6] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#ECEAE6] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Proposal Preview
                </p>
                <h3 className="mt-1 font-serif text-2xl font-medium text-[#1A1A1A]">
                  {quoteCard.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuoteCardId(null)}
                className="text-[#71717A] transition-colors hover:text-[#1A1A1A]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 neu-scroll">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="font-serif text-lg font-medium text-[#1A1A1A]">
                  Karakovan Studio
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Wedding Photography Proposal
                </p>

                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-[#71717A]">Client</dt>
                    <dd className="font-medium text-[#1A1A1A]">
                      {quoteCard.clientName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#71717A]">Event Date</dt>
                    <dd className="font-medium text-[#1A1A1A]">
                      {quoteCard.eventDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#71717A]">Location</dt>
                    <dd className="font-medium text-[#1A1A1A]">
                      {quoteCard.location.split(",")[0]}
                    </dd>
                  </div>
                </dl>

                <div className="neu-inset mt-4 rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A]">
                    Total Package
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#1A1A1A]">
                    {quoteCard.bookingAmount || quoteCard.amount || "₹1,50,000"}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-[#71717A]">
                    {[
                      "Pre-wedding shoot",
                      "Full-day coverage",
                      "Edited gallery delivery",
                      "Online client portal access",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-[#207c50]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4 text-center text-xs text-[#71717A]">
                  This is a quick preview. Open the full workspace to edit
                  details.
                </p>
              </div>
            </div>

            <div className="border-t border-[#ECEAE6] p-4">
              <button
                type="button"
                onClick={() => {
                  setQuoteCardId(null)
                  onOpenWorkspace(quoteCard.clientName)
                }}
                className="w-full rounded-full bg-[#1A1A1A] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
              >
                Open Full Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
