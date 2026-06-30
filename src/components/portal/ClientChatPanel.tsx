import React, { useState } from "react"
import { Send, SlidersHorizontal } from "lucide-react"
import { cn } from "../../lib/utils"

const messages = [
  {
    id: "1",
    from: "client",
    text: "Hi! We loved the proposal. Can we add a pre-wedding shoot in Udaipur?",
    time: "10:42 AM",
  },
  {
    id: "2",
    from: "studio",
    text: "Absolutely — I've updated the package to include a 2-hour pre-wedding session. Please review the revised total.",
    time: "10:48 AM",
  },
  {
    id: "3",
    from: "client",
    text: "Perfect. We'll sign once the deposit link is shared.",
    time: "11:02 AM",
  },
]

const packages = ["Essential", "Signature", "Luxe Cinematic"]

export interface ClientChatPanelProps {
  clientName: string
}

export function ClientChatPanel({ clientName }: ClientChatPanelProps) {
  const [activePackage, setActivePackage] = useState("Signature")
  const [depositPct, setDepositPct] = useState(40)
  const [includePrewedding, setIncludePrewedding] = useState(true)
  const [draft, setDraft] = useState("")

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6 md:flex-row md:p-8">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[#ECEAE6] bg-white shadow-sm">
        <div className="border-b border-[#ECEAE6] px-5 py-4">
          <p className="text-sm font-semibold text-[#1A1A1A]">{clientName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#71717A]">
            <span className="size-1.5 rounded-full bg-[#207c50]" />
            WhatsApp Business · Online
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5 neu-scroll">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.from === "studio" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.from === "studio"
                    ? "rounded-tr-sm bg-[#E8F5EE] text-[#1A1A1A]"
                    : "rounded-tl-sm bg-[#F4F4F5] text-[#1A1A1A]",
                )}
              >
                <p>{msg.text}</p>
                <p className="mt-1 text-right text-[10px] text-[#A1A1AA]">
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#ECEAE6] p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="neu-input flex-1 rounded-full px-4 py-2.5 text-sm text-[#1A1A1A] outline-none"
            />
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-white transition-colors hover:bg-[#2a2a2a]"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 rounded-2xl border border-[#ECEAE6] bg-white p-5 shadow-sm md:w-[320px]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-[#71717A]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">
            Live Proposal Parameters
          </h3>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-[#71717A]">
              Active Package
            </p>
            <div className="flex flex-wrap gap-1 rounded-full bg-[#F4F4F5] p-1">
              {packages.map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setActivePackage(pkg)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                    activePackage === pkg
                      ? "bg-white text-[#1A1A1A] shadow-sm"
                      : "text-[#71717A] hover:text-[#1A1A1A]",
                  )}
                >
                  {pkg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[#71717A]">
              Total Package Value
            </p>
            <div className="neu-inset rounded-xl px-3 py-2.5 text-sm font-semibold text-[#1A1A1A]">
              ₹ 1,50,000
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-[#71717A]">
                Deposit Required
              </p>
              <span className="text-xs font-semibold text-[#1A1A1A]">
                {depositPct}%
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={60}
              step={5}
              value={depositPct}
              onChange={(e) => setDepositPct(Number(e.target.value))}
              className="w-full accent-[#1A1A1A]"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#71717A]">Include pre-wedding shoot</p>
            <button
              type="button"
              onClick={() => setIncludePrewedding((v) => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                includePrewedding ? "bg-[#207c50]" : "bg-[#71717A]/30",
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
                  includePrewedding ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
        >
          <Send className="size-3.5" />
          Push Updated Proposal to Client
        </button>
      </div>
    </div>
  )
}
