import React, { useRef, useState } from "react"
import { Plus, Pencil, Trash2, FileText, Zap } from "lucide-react"
import { cn } from "../../lib/utils"

interface LegalTemplate {
  id: string
  name: string
  updated: string
  body: string
}

const TOKENS = ["{{Client Name}}", "{{Event Date}}", "{{Package Value}}"]

const INITIAL_TEMPLATES: LegalTemplate[] = [
  {
    id: "wedding",
    name: "Standard Wedding & Destination Agreement",
    updated: "Last updated June 28, 2026",
    body: `WEDDING PHOTOGRAPHY & VIDEOGRAPHY AGREEMENT

This Agreement is entered into between Karakovan Studio ("the Studio") and {{Client Name}} ("the Client") for coverage of the event scheduled on {{Event Date}}.

1. SCOPE OF SERVICES
The Studio agrees to provide full-day wedding photography and cinematic videography coverage, including a pre-wedding shoot, ceremony, and reception.

2. RETAINER & PAYMENT
A non-refundable retainer of forty percent (40%) of the total package value of {{Package Value}} is due upon signing to reserve the date.

3. DELIVERY
Final edited galleries will be delivered within eight (8) weeks of {{Event Date}} via the Pixnxt Cloud portal.`,
  },
  {
    id: "commercial",
    name: "Commercial Editorial & Licensing Agreement",
    updated: "Last updated June 26, 2026",
    body: `COMMERCIAL EDITORIAL & LICENSING AGREEMENT

This Agreement governs the commercial engagement between Karakovan Studio ("the Studio") and {{Client Name}} ("the Client") for the production scheduled on {{Event Date}}.

1. USAGE & LICENSING RIGHTS
The Studio grants the Client a limited commercial license for editorial use of all delivered assets. Extended or exclusive licensing is subject to the agreed fee of {{Package Value}}.

2. PRODUCTION SCOPE
The Studio will provide art direction, lead photography, and post-production retouching for the agreed shot list.

3. CREDIT & ATTRIBUTION
The Client agrees to attribute "Karakovan Studio" in all published editorial placements unless otherwise negotiated in writing.`,
  },
  {
    id: "portrait",
    name: "Studio Portrait & Event Session Terms",
    updated: "Last updated June 20, 2026",
    body: `STUDIO PORTRAIT & EVENT SESSION TERMS

These Terms apply to the portrait or event session booked by {{Client Name}} for {{Event Date}}.

1. SESSION DETAILS
The session fee of {{Package Value}} covers studio time, lighting setup, and one outfit change. Additional hours are billed separately.

2. PROOFING & SELECTION
The Client will receive an online proofing gallery within five (5) business days to select final images for retouching.

3. CANCELLATION
Sessions rescheduled with less than 48 hours notice are subject to a rebooking fee.`,
  },
]

export function LegalTemplatesPanel() {
  const [templates, setTemplates] = useState<LegalTemplate[]>(INITIAL_TEMPLATES)
  const [selectedId, setSelectedId] = useState<string>("wedding")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0]

  function updateBody(value: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, body: value } : t)),
    )
  }

  function insertToken(token: string) {
    const el = textareaRef.current
    if (!el) {
      updateBody(`${selected.body} ${token}`)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = selected.body.slice(0, start) + token + selected.body.slice(end)
    updateBody(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + token.length
      el.setSelectionRange(caret, caret)
    })
  }

  function createTemplate() {
    const id = `template-${Date.now()}`
    const newTemplate: LegalTemplate = {
      id,
      name: "Untitled Template Draft",
      updated: "Created just now",
      body: "Start drafting your master boilerplate here. Insert dynamic tokens to auto-populate client data.",
    }
    setTemplates((prev) => [newTemplate, ...prev])
    setSelectedId(id)
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (id === selectedId && next.length > 0) {
        setSelectedId(next[0].id)
      }
      return next
    })
  }

  return (
    <div className="h-full overflow-y-auto neu-scroll px-6 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mt-6 flex h-[calc(100vh-240px)] w-full flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm lg:flex-row">
          <section className="flex h-full w-full flex-col overflow-y-auto neu-scroll border-b border-neutral-100 bg-neutral-50/20 p-6 lg:w-2/5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                Your Saved Boilerplates
              </h3>
              <button
                type="button"
                onClick={createTemplate}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                <Plus className="size-3.5" />
                Create Template
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {templates.map((template) => {
                const isActive = template.id === selectedId
                return (
                  <div
                    key={template.id}
                    onClick={() => setSelectedId(template.id)}
                    className={cn(
                      "group cursor-pointer rounded-xl border p-4 transition-all",
                      isActive
                        ? "border-[#1A1A1A]/80 bg-[#1A1A1A]/[0.03] shadow-sm"
                        : "border-neutral-100 hover:border-neutral-300 hover:bg-[#1A1A1A]/[0.02]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                          isActive
                            ? "bg-[#1A1A1A] text-white"
                            : "bg-[#1A1A1A]/[0.05] text-[#1A1A1A]",
                        )}
                      >
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-pretty text-sm font-medium leading-snug text-[#1A1A1A]">
                          {template.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#71717A]">
                          {template.updated}
                        </p>
                        <div className="mt-2 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedId(template.id)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#71717A] hover:text-[#1A1A1A]"
                          >
                            <Pencil className="size-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTemplate(template.id)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#71717A] hover:text-red-600"
                          >
                            <Trash2 className="size-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="flex h-full flex-1 flex-col overflow-hidden bg-neutral-50/50 p-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
              Template Blueprint
            </p>
            <h3 className="mt-1 text-pretty font-serif text-xl font-medium text-[#1A1A1A]">
              {selected.name}
            </h3>

            <div className="mt-5">
              <p className="text-xs font-medium text-[#71717A]">
                Insert Dynamic Variables
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertToken(token)}
                    className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 font-mono text-xs text-[#1A1A1A] transition-colors hover:border-[#1A1A1A]/40"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={selected.body}
              onChange={(e) => updateBody(e.target.value)}
              spellCheck={false}
              className="mt-4 h-full min-h-[400px] w-full flex-1 resize-none overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 font-mono text-sm leading-relaxed text-[#1A1A1A] outline-none"
            />

            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] py-3 text-sm font-semibold text-white"
            >
              <Zap className="size-4" />
              Save to Studio Library
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
