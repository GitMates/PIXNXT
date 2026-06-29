import React, { useState } from "react"
import {
  packages,
  addOns,
  billingTemplates,
  contracts,
} from "../../lib/proposal-data"
import { cn } from "../../lib/utils"
import {
  Plus,
  Trash2,
  Camera,
  Video,
  BookOpen,
  Zap,
  Layers,
  Calendar,
  MapPin,
  CreditCard,
  ClipboardList,
  StickyNote,
  FileText,
} from "lucide-react"
import type { ProposalState } from "./ProposalWorkspace"

interface ProposalFormProps {
  proposal: ProposalState
  onChange: (patch: Partial<ProposalState>) => void
}

const ADDON_ICONS: Record<string, React.ElementType> = {
  a1: Camera,
  a2: Zap,
  a3: Video,
  a4: BookOpen,
  a5: Layers,
}

export function ProposalForm({ proposal, onChange }: ProposalFormProps) {
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")

  const addCustomItem = () => {
    if (!newItemName.trim()) return
    onChange({
      customItems: [
        ...proposal.customItems,
        {
          id: `ci-${Date.now()}`,
          name: newItemName.trim(),
          price: parseFloat(newItemPrice) || 0,
        },
      ],
    })
    setNewItemName("")
    setNewItemPrice("")
  }

  const removeCustomItem = (id: string) =>
    onChange({ customItems: proposal.customItems.filter((i) => i.id !== id) })

  const toggleAddOn = (id: string) =>
    onChange({
      selectedAddOns: proposal.selectedAddOns.includes(id)
        ? proposal.selectedAddOns.filter((a) => a !== id)
        : [...proposal.selectedAddOns, id],
    })

  return (
    <div className="h-full overflow-y-auto neu-scroll">
      <div className="mx-auto max-w-3xl space-y-10 px-8 py-8">
        <section>
          <SectionHeader icon={FileText} label="Client Details" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Client Name(s)</FieldLabel>
              <input
                type="text"
                value={proposal.clientName}
                onChange={(e) => onChange({ clientName: e.target.value })}
                placeholder="Priya & Rohit"
                className="w-full rounded-xl border-0 px-4 py-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A] neu-inset"
              />
            </div>
            <div>
              <FieldLabel icon={Calendar}>Event Date</FieldLabel>
              <input
                type="date"
                value={proposal.eventDate}
                onChange={(e) => onChange({ eventDate: e.target.value })}
                className="w-full rounded-xl border-0 px-4 py-3 text-sm text-[#1A1A1A] outline-none neu-inset"
              />
            </div>
            <div>
              <FieldLabel icon={MapPin}>Location</FieldLabel>
              <input
                type="text"
                value={proposal.eventLocation}
                onChange={(e) => onChange({ eventLocation: e.target.value })}
                placeholder="Udaipur"
                className="w-full rounded-xl border-0 px-4 py-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A] neu-inset"
              />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader icon={Layers} label="Package" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {packages.map((pkg) => {
              const selected = proposal.selectedPackage === pkg.id
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onChange({ selectedPackage: pkg.id })}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-[#1A1A1A]/20 bg-white neu-circle"
                      : "border-[#ECEAE6] bg-white/50 hover:bg-white hover:neu-circle",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {pkg.name}
                    </span>
                    <RadioDot selected={selected} />
                  </div>
                  <p className="mt-2 text-xl font-semibold text-[#1A1A1A]">
                    ₹{pkg.price.toLocaleString("en-IN")}
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-[#71717A]">
                    <p>{pkg.duration} coverage</p>
                    <p>{pkg.editedPhotos} edited photos</p>
                    {pkg.videography && <p>Videography included</p>}
                    {pkg.albums > 0 && (
                      <p>
                        {pkg.albums} premium album{pkg.albums > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <SectionHeader icon={Plus} label="Add-ons" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addOns.map((addon) => {
              const selected = proposal.selectedAddOns.includes(addon.id)
              const Icon = ADDON_ICONS[addon.id] ?? Plus
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => toggleAddOn(addon.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-[#207c50]/30 bg-[#207c50]/5 neu-circle"
                      : "border-[#ECEAE6] bg-white/50 hover:bg-white hover:neu-circle",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg transition-colors",
                        selected
                          ? "bg-[#207c50] text-white"
                          : "bg-[#F4F4F5] text-[#71717A]",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <RadioDot selected={selected} green />
                  </div>
                  <p className="mt-3 text-sm font-medium text-[#1A1A1A]">
                    {addon.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#71717A]">
                    {addon.description}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#1A1A1A]">
                    +₹{addon.price.toLocaleString("en-IN")}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <SectionHeader icon={ClipboardList} label="Custom Line Items" />
          {proposal.customItems.length > 0 && (
            <div className="mb-3 space-y-2">
              {proposal.customItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[#ECEAE6] bg-white px-4 py-3"
                >
                  <span className="text-sm text-[#1A1A1A]">{item.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      ₹{item.price.toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCustomItem(item.id)}
                      className="text-[#71717A] transition-colors hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
              placeholder="Item name"
              className="flex-1 rounded-xl border-0 px-4 py-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A] neu-inset"
            />
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
              placeholder="₹ Price"
              className="w-32 rounded-xl border-0 px-4 py-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A] neu-inset"
            />
            <button
              type="button"
              onClick={addCustomItem}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECEAE6] bg-white px-4 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#F4F4F5]"
            >
              <Plus className="size-4" />
              Add
            </button>
          </div>
        </section>

        <section>
          <SectionHeader icon={CreditCard} label="Payment Schedule" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {billingTemplates.map((tmpl) => {
              const selected = proposal.selectedBilling === tmpl.id
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => onChange({ selectedBilling: tmpl.id })}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-[#1A1A1A]/20 bg-white neu-circle"
                      : "border-[#ECEAE6] bg-white/50 hover:bg-white hover:neu-circle",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      {tmpl.name}
                    </span>
                    <RadioDot selected={selected} />
                  </div>
                  <div className="space-y-1.5">
                    {tmpl.deposits.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs text-[#71717A]"
                      >
                        <span>{d.dueDate}</span>
                        <span className="font-medium">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="whitespace-nowrap text-xs font-medium text-[#71717A]">
              Tax Rate (GST)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={proposal.taxRate}
              onChange={(e) =>
                onChange({ taxRate: parseFloat(e.target.value) || 0 })
              }
              className="w-24 rounded-xl border-0 px-3 py-2 text-center text-sm text-[#1A1A1A] outline-none neu-inset"
            />
            <span className="text-sm text-[#71717A]">%</span>
          </div>
        </section>

        <section>
          <SectionHeader icon={ClipboardList} label="Contract Terms" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {contracts.map((c) => {
              const selected = proposal.selectedContract === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange({ selectedContract: c.id })}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-[#1A1A1A]/20 bg-white neu-circle"
                      : "border-[#ECEAE6] bg-white/50 hover:bg-white hover:neu-circle",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {c.name}
                    </span>
                    <RadioDot selected={selected} />
                  </div>
                  <ul className="space-y-1.5">
                    {c.terms.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-[#71717A]"
                      >
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#71717A]/40" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <SectionHeader icon={StickyNote} label="Notes for Client" />
          <textarea
            value={proposal.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={4}
            placeholder="Any personal notes or details to include at the bottom of the proposal..."
            className="w-full resize-none rounded-xl border-0 px-4 py-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A] neu-inset"
          />
        </section>

        <div className="h-8" />
      </div>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <Icon className="size-4 text-[#71717A]" />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
        {label}
      </h2>
      <div className="flex-1 border-t border-[#ECEAE6]" />
    </div>
  )
}

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#71717A]">
      {Icon && <Icon className="size-3" />}
      {children}
    </label>
  )
}

function RadioDot({ selected, green }: { selected: boolean; green?: boolean }) {
  return (
    <span
      className={cn(
        "size-4 shrink-0 rounded-full border-2 transition-colors",
        selected
          ? green
            ? "border-[#207c50] bg-[#207c50]"
            : "border-[#1A1A1A] bg-[#1A1A1A]"
          : "border-[#71717A]/30",
      )}
    />
  )
}
