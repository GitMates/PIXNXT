import React from "react"
import { X } from "lucide-react"
import { type PipelineStage } from "./portalData"

export interface PortalModalsProps {
  isNewProjectModalOpen: boolean
  setIsNewProjectModalOpen: (open: boolean) => void
  setStages: React.Dispatch<React.SetStateAction<PipelineStage[]>>
  stages: PipelineStage[]
  quoteCardId: string | null
  setQuoteCardId: (id: string | null) => void
  onOpenWorkspace: (clientName: string) => void
  editTarget: { kind: "package" | "addon"; id: string } | null
  setEditTarget: (target: { kind: "package" | "addon"; id: string } | null) => void
  editorTitle: string
  setEditorTitle: (v: string) => void
  editorPrice: string
  setEditorPrice: (v: string) => void
  editorDesc: string
  setEditorDesc: (v: string) => void
  onSaveEditor: () => void
}

export function PortalModals({
  isNewProjectModalOpen,
  setIsNewProjectModalOpen,
  setStages,
  stages,
  quoteCardId,
  setQuoteCardId,
  onOpenWorkspace,
  editTarget,
  setEditTarget,
  editorTitle,
  setEditorTitle,
  editorPrice,
  setEditorPrice,
  editorDesc,
  setEditorDesc,
  onSaveEditor,
}: PortalModalsProps) {
  const quoteCard = quoteCardId
    ? stages.flatMap((s) => s.cards).find((c) => c.id === quoteCardId)
    : null

  return (
    <>
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-medium">Create New Client Project</h3>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Client Name / Couple Name</label>
                <input
                  id="modal-client-name"
                  type="text"
                  placeholder="e.g. Maya & Aditya"
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Shoot Location</label>
                <input
                  id="modal-client-loc"
                  type="text"
                  placeholder="e.g. Udaipur, Rajasthan"
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Budget (Total Invoiced)</label>
                <input
                  id="modal-client-budget"
                  type="text"
                  placeholder="e.g. ₹1,80,000"
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1 outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nameInp =
                  (document.getElementById("modal-client-name") as HTMLInputElement)
                    ?.value || "Client Name"
                const locInp =
                  (document.getElementById("modal-client-loc") as HTMLInputElement)?.value ||
                  "Mumbai, MH"
                const budgetInp =
                  (document.getElementById("modal-client-budget") as HTMLInputElement)
                    ?.value || "₹1,50,000"

                setStages((prev) =>
                  prev.map((s) => {
                    if (s.id === "inquiry") {
                      return {
                        ...s,
                        cards: [
                          ...s.cards,
                          {
                            id: `card-${Date.now()}`,
                            clientName: nameInp,
                            eventDate: "December 10, 2026",
                            location: locInp,
                            bookingAmount: budgetInp,
                          },
                        ],
                      }
                    }
                    return s
                  })
                )
                setIsNewProjectModalOpen(false)
              }}
              className="w-full rounded-xl bg-neutral-950 py-2.5 text-sm font-semibold text-white"
            >
              Add Project to Inquiry
            </button>
          </div>
        </div>
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

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-base font-semibold">
                Edit {editTarget.kind === "package" ? "Package Details" : "Add-on Details"}
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Title Name</label>
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Pricing Cost</label>
                <input
                  type="text"
                  value={editorPrice}
                  onChange={(e) => setEditorPrice(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">
                  {editTarget.kind === "package" ? "Duration / Hours" : "Description text"}
                </label>
                <input
                  type="text"
                  value={editorDesc}
                  onChange={(e) => setEditorDesc(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1 outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onSaveEditor}
              className="w-full rounded-xl bg-neutral-950 py-2 text-sm font-semibold text-white"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </>
  )
}
