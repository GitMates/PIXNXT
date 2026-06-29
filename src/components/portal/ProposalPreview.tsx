import React, { useMemo } from "react"
import {
  packages,
  addOns,
  billingTemplates,
  contracts,
  studioInfo,
} from "../../lib/proposal-data"
import type { ProposalState } from "./ProposalWorkspace"

interface ProposalPreviewProps {
  proposal: ProposalState
}

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

function formatDate(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function ProposalPreview({ proposal }: ProposalPreviewProps) {
  const selectedPkg = packages.find((p) => p.id === proposal.selectedPackage)
  const selectedAddons = addOns.filter((a) =>
    proposal.selectedAddOns.includes(a.id),
  )
  const selectedBilling = billingTemplates.find(
    (b) => b.id === proposal.selectedBilling,
  )
  const selectedContract = contracts.find(
    (c) => c.id === proposal.selectedContract,
  )

  const { subtotal, tax, total } = useMemo(() => {
    const pkgPrice = selectedPkg?.price ?? 0
    const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0)
    const customTotal = proposal.customItems.reduce((s, i) => s + i.price, 0)
    const sub = pkgPrice + addonsTotal + customTotal
    const taxAmt = Math.round(sub * (proposal.taxRate / 100))
    return { subtotal: sub, tax: taxAmt, total: sub + taxAmt }
  }, [selectedPkg, selectedAddons, proposal.customItems, proposal.taxRate])

  return (
    <div className="h-full overflow-y-auto neu-scroll bg-[#F4F3F0]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
          <div className="border-b border-[#ECEAE6] px-8 py-6">
            <div className="flex items-center gap-4">
              <img
                src={studioInfo.logo}
                alt={studioInfo.name}
                className="size-12 rounded-full object-cover"
              />
              <div>
                <p className="font-serif text-xl font-medium text-[#1A1A1A]">
                  {studioInfo.name} Studio
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Wedding Photography Proposal
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-8 py-6">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <PreviewField label="Client" value={proposal.clientName || "—"} />
              <PreviewField
                label="Event Date"
                value={formatDate(proposal.eventDate)}
              />
              <PreviewField
                label="Location"
                value={proposal.eventLocation || "—"}
              />
            </dl>

            {selectedPkg && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Selected Package
                </p>
                <div className="rounded-xl bg-[#FAF9F6] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">
                        {selectedPkg.name}
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-[#71717A]">
                        <li>{selectedPkg.duration} coverage</li>
                        <li>{selectedPkg.editedPhotos} edited photos</li>
                        {selectedPkg.videography && <li>Videography included</li>}
                        {selectedPkg.albums > 0 && (
                          <li>
                            {selectedPkg.albums} premium album
                            {selectedPkg.albums > 1 ? "s" : ""}
                          </li>
                        )}
                      </ul>
                    </div>
                    <p className="text-lg font-bold text-[#1A1A1A]">
                      {formatInr(selectedPkg.price)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(selectedAddons.length > 0 || proposal.customItems.length > 0) && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Add-ons &amp; Extras
                </p>
                <div className="space-y-2">
                  {selectedAddons.map((addon) => (
                    <LineItem
                      key={addon.id}
                      name={addon.name}
                      price={addon.price}
                    />
                  ))}
                  {proposal.customItems.map((item) => (
                    <LineItem key={item.id} name={item.name} price={item.price} />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[#ECEAE6] p-4">
              <div className="flex justify-between text-sm text-[#71717A]">
                <span>Subtotal</span>
                <span>{formatInr(subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-[#71717A]">
                <span>GST ({proposal.taxRate}%)</span>
                <span>{formatInr(tax)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-[#ECEAE6] pt-3 text-base font-bold text-[#1A1A1A]">
                <span>Total Investment</span>
                <span>{formatInr(total)}</span>
              </div>
            </div>

            {selectedBilling && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Payment Schedule — {selectedBilling.name}
                </p>
                <div className="space-y-2">
                  {selectedBilling.deposits.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-[#FAF9F6] px-4 py-2.5 text-sm"
                    >
                      <span className="text-[#71717A]">{d.dueDate}</span>
                      <span className="font-semibold text-[#1A1A1A]">
                        {d.percentage}% · {formatInr(Math.round(total * (d.percentage / 100)))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedContract && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Contract — {selectedContract.name}
                </p>
                <ul className="space-y-1.5">
                  {selectedContract.terms.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-[#71717A]"
                    >
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#207c50]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {proposal.notes && (
              <div className="rounded-xl bg-[#FAF9F6] p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  A Note From Us
                </p>
                <p className="text-sm leading-relaxed text-[#1A1A1A]">
                  {proposal.notes}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[#ECEAE6] bg-[#FAF9F6] px-8 py-4 text-center text-xs text-[#71717A]">
            {studioInfo.email} · {studioInfo.phone} · {studioInfo.website}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[#1A1A1A]">{value}</dd>
    </div>
  )
}

function LineItem({ name, price }: { name: string; price: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[#FAF9F6] px-4 py-2.5 text-sm">
      <span className="text-[#1A1A1A]">{name}</span>
      <span className="font-medium text-[#1A1A1A]">
        {formatInr(price)}
      </span>
    </div>
  )
}
