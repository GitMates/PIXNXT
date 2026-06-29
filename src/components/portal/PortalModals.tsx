import React from "react"
import { X } from "lucide-react"
import { type PipelineStage } from "./portalData"

export interface PortalModalsProps {
  isNewProjectModalOpen: boolean
  setIsNewProjectModalOpen: (open: boolean) => void
  setStages: React.Dispatch<React.SetStateAction<PipelineStage[]>>
  quoteCardId: string | null
  setQuoteCardId: (id: string | null) => void
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
  quoteCardId,
  setQuoteCardId,
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

      {quoteCardId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-xs"
          onClick={() => setQuoteCardId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-medium">
                Quick Quote Investment Summary
              </h3>
              <button
                type="button"
                onClick={() => setQuoteCardId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="bg-neutral-50 p-4 rounded-xl space-y-3">
              <p className="text-xs text-muted-foreground uppercase font-bold">
                Standard Retender Rules
              </p>
              <div className="flex justify-between text-sm py-1 border-b">
                <span>Retainer stages due:</span>
                <span className="font-semibold">40% / 60%</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b">
                <span>Validity of Quote:</span>
                <span className="font-semibold">14 Days</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span>Local taxation rules applied:</span>
                <span className="font-semibold">Inclusive GST</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Open full workspace to edit or generate custom client billing proposals.
            </p>
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
