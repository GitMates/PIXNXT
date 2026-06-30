import React, { useState, useRef } from "react"
import {
  Sparkles,
  ImageIcon,
  Type,
  Plus,
  Pencil,
  Trash2,
  Video,
  Camera,
  BookOpen,
  Check,
  Users,
  Calendar,
  LayoutTemplate,
  AlignLeft,
  Film,
  X,
  UploadCloud,
  FileText,
  CreditCard,
  MessageCircle,
  Cloud,
  Link2,
} from "lucide-react"
import {
  packages as basePackages,
  addOns as baseAddOns,
  type Package,
  type AddOn,
} from "../../lib/proposal-data"
import { LegalTemplatesPanel } from "./LegalTemplatesPanel"
import { cn } from "../../lib/utils"

const SETTINGS_TABS = [
  "General",
  "Packages & Add-ons",
  "Branding",
  "Billing & Tax",
  "Notifications",
  "Team & Permissions",
  "Integrations",
  "Legal Templates",
] as const

type SettingsTab = (typeof SETTINGS_TABS)[number]

const TEMPLATE_FRAMEWORKS = [
  {
    id: "editorial",
    name: "Editorial Minimalist",
    tag: "Best for Modern Fine-Art & Fashion",
    icon: AlignLeft,
  },
  {
    id: "classic",
    name: "Classic Luxury",
    tag: "Best for Heritage Weddings & Luxury Events",
    icon: LayoutTemplate,
  },
  {
    id: "cinematic",
    name: "Cinematic Bold",
    tag: "Best for Commercial, Film, & Dramatic Narrative",
    icon: Film,
  },
] as const

interface BrandColor {
  label: string
  hex: string
}

const FONT_OPTIONS = [
  "Playfair Display (Serif)",
  "Inter (Sans-serif)",
  "Cormorant Garamond (Serif)",
  "Montserrat (Sans-serif)",
  "Lora (Serif)",
]

const CURRENCY_OPTIONS = [
  "INR (₹)",
  "USD ($)",
  "EUR (€)",
  "GBP (£)",
  "AED (د.إ)",
]

const INTEGRATIONS = [
  {
    id: "google-calendar",
    title: "Google Calendar Sync",
    description:
      "Auto-sync shoot dates and event milestones to your calendar.",
    icon: Calendar,
    actionLabel: "Connect Account",
  },
  {
    id: "payments",
    title: "Razorpay / Stripe Payments",
    description: "Accept secure online deposits and balance payments.",
    icon: CreditCard,
    actionLabel: "Connect Account",
    connectedByDefault: true,
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business",
    description:
      "Send automated proposals and payment receipts via WhatsApp.",
    icon: MessageCircle,
    actionLabel: "Connect Account",
  },
  {
    id: "cloud-sync",
    title: "Pixnxt Cloud Sync",
    description: "Back up galleries and deliver final assets to clients.",
    icon: Cloud,
    actionLabel: "Connect Vault",
  },
] as const

interface TeamMember {
  id: string
  name: string
  description: string
  role: string
  initials: string
  isOwner?: boolean
  hasChatToggle?: boolean
}

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "m1",
    name: "Ananya Iyer",
    description: "Full access dashboard rights",
    role: "Owner",
    initials: "AI",
    isOwner: true,
  },
  {
    id: "m2",
    name: "Vikram Dev",
    description: "Access restricted to assigned client pipelines only",
    role: "Associate Photographer",
    initials: "VD",
    hasChatToggle: true,
  },
]

const INVITE_ROLES = [
  "Associate Photographer",
  "Studio Manager",
  "Editor",
  "Sales Coordinator",
] as const

interface NotificationToggle {
  id: string
  label: string
  description: string
  enabled: boolean
}

type EditablePackage = Package & { deliverables?: string[] }

type EditTarget =
  | { kind: "package"; id: string }
  | { kind: "addon"; id: string }
  | null

export function PortalSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("General")
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [font, setFont] = useState(FONT_OPTIONS[0])
  const [activeTemplate, setActiveTemplate] = useState("classic")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pkgList, setPkgList] = useState<EditablePackage[]>(() =>
    basePackages.map((p) => ({ ...p })),
  )
  const [addOnList, setAddOnList] = useState<AddOn[]>(() =>
    baseAddOns.map((a) => ({ ...a })),
  )
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftPrice, setDraftPrice] = useState("")
  const [draftDeliverables, setDraftDeliverables] = useState("")

  const [brandColors, setBrandColors] = useState<BrandColor[]>([
    { label: "Primary Accent", hex: "#1a1a1a" },
    { label: "Neutral", hex: "#8a8478" },
    { label: "Background Tint", hex: "#f4f1ec" },
  ])

  const [connectedIntegrations, setConnectedIntegrations] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      INTEGRATIONS.map((item) => [
        item.id,
        "connectedByDefault" in item && item.connectedByDefault,
      ]),
    ),
  )

  const [teamMembers, setTeamMembers] =
    useState<TeamMember[]>(INITIAL_TEAM_MEMBERS)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [clientChatAccess, setClientChatAccess] = useState(true)

  const [notifications, setNotifications] = useState<NotificationToggle[]>([
    {
      id: "proposal-viewed",
      label: "Proposal viewed",
      description:
        "Email me instantly when a client views or opens a proposal link",
      enabled: true,
    },
    {
      id: "contract-signed",
      label: "Contract signed",
      description: "Email me when a client signs a contract milestone",
      enabled: true,
    },
    {
      id: "payment-reminder",
      label: "Automated payment reminders",
      description:
        "Send automated payment reminder alerts to clients 3 days before balances expire",
      enabled: false,
    },
  ])

  function packageDeliverables(pkg: EditablePackage): string[] {
    if (pkg.deliverables && pkg.deliverables.length > 0) return pkg.deliverables
    const lines = [pkg.duration, `${pkg.editedPhotos} edited photos`]
    if (pkg.videography) lines.push("Cinematic videography")
    if (pkg.albums > 0)
      lines.push(`${pkg.albums} premium album${pkg.albums > 1 ? "s" : ""}`)
    return lines
  }

  function openPackageEditor(pkg: EditablePackage) {
    setEditTarget({ kind: "package", id: pkg.id })
    setDraftTitle(pkg.name)
    setDraftPrice(String(pkg.price))
    setDraftDeliverables(packageDeliverables(pkg).join("\n"))
  }

  function openAddOnEditor(item: AddOn) {
    setEditTarget({ kind: "addon", id: item.id })
    setDraftTitle(item.name)
    setDraftPrice(String(item.price))
    setDraftDeliverables(item.description)
  }

  function saveEditor() {
    if (!editTarget) return
    const priceValue = Number(draftPrice.replace(/[^0-9.]/g, "")) || 0
    if (editTarget.kind === "package") {
      setPkgList((list) =>
        list.map((p) =>
          p.id === editTarget.id
            ? {
                ...p,
                name: draftTitle.trim() || p.name,
                price: priceValue,
                deliverables: draftDeliverables
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              }
            : p,
        ),
      )
    } else {
      setAddOnList((list) =>
        list.map((a) =>
          a.id === editTarget.id
            ? {
                ...a,
                name: draftTitle.trim() || a.name,
                price: priceValue,
                description: draftDeliverables.trim(),
              }
            : a,
        ),
      )
    }
    setEditTarget(null)
  }

  function handleColorChange(index: number, hex: string) {
    setBrandColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, hex } : c)),
    )
  }

  function handleFile(file?: File) {
    if (file) setFileName(file.name)
  }

  function toggleNotification(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)),
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <header className="flex flex-col gap-4 border-b border-[#ECEAE6] px-8 py-5">
        <div>
          <h1 className="font-serif text-2xl font-medium text-[#1A1A1A]">
            Studio Settings
          </h1>
          <p className="mt-0.5 text-sm text-[#71717A]">
            Manage your catalog, branding, and proposal defaults.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {SETTINGS_TABS.map((tab) => {
            const TabIcon =
              tab === "Team & Permissions"
                ? Users
                : tab === "Integrations"
                  ? Link2
                  : tab === "Legal Templates"
                    ? FileText
                    : null
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  activeTab === tab
                    ? "neu-inset text-[#1A1A1A]"
                    : "text-[#71717A] hover:text-[#1A1A1A]",
                )}
              >
                {TabIcon && <TabIcon className="size-3.5" />}
                {tab}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto neu-scroll">
        {activeTab === "Legal Templates" && <LegalTemplatesPanel />}

        {activeTab === "General" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
            <section>
              <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                Studio Profile
              </h3>
              <p className="text-xs text-[#71717A]">
                Basic information about your studio and contact details.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Studio Name">
                  <VanishingInput defaultText="The Photo Studio" />
                </Field>
                <Field label="Contact Email">
                  <VanishingInput
                    type="email"
                    defaultText="hello@thephotostudio.com"
                  />
                </Field>
                <Field label="Studio Website">
                  <VanishingInput defaultText="thephotostudio.com" />
                </Field>
                <Field label="Default Currency">
                  <select
                    defaultValue="INR (₹)"
                    className="w-full rounded-lg border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Check className="size-4" />
                  Save Changes
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "Packages & Add-ons" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                    Base Packages Template Manager
                  </h3>
                  <p className="text-xs text-[#71717A]">
                    Auto-populated from your ingested rate sheet
                  </p>
                </div>
                <button
                  type="button"
                  className="neu-circle inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1A1A1A] transition-colors hover:text-[#1A1A1A]/80"
                >
                  <Plus className="size-3.5" />
                  Add Package
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {pkgList.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="neu-circle flex items-center justify-between gap-4 rounded-2xl border border-[#ECEAE6]/50 bg-white p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="neu-inset inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-[#1A1A1A]">
                        <Camera className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1A1A]">{pkg.name}</p>
                        <p className="truncate text-xs text-[#71717A]">
                          {packageDeliverables(pkg).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-[#1A1A1A]">
                        ₹{pkg.price.toLocaleString("en-IN")}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPackageEditor(pkg)}
                          className="group/btn cursor-pointer rounded-md p-1.5 transition-colors hover:bg-neutral-100"
                        >
                          <Pencil className="size-3.5 text-[#71717A] transition-colors group-hover/btn:text-[#1A1A1A]" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPkgList((list) =>
                              list.filter((p) => p.id !== pkg.id),
                            )
                          }
                          className="group/btn cursor-pointer rounded-md p-1.5 transition-colors hover:bg-neutral-100"
                        >
                          <Trash2 className="size-3.5 text-[#71717A] transition-colors group-hover/btn:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                    Global Add-ons Catalog
                  </h3>
                  <p className="text-xs text-[#71717A]">
                    Reusable line items across all proposals
                  </p>
                </div>
                <button
                  type="button"
                  className="neu-circle inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1A1A1A] transition-colors hover:text-[#1A1A1A]/80"
                >
                  <Plus className="size-3.5" />
                  Add Item
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {addOnList.map((item) => {
                  const isAlbum = /album/i.test(item.name)
                  const AddonIcon = isAlbum ? BookOpen : Video
                  return (
                    <div
                      key={item.id}
                      className="neu-circle flex items-start justify-between gap-3 rounded-2xl border border-[#ECEAE6]/50 bg-white p-4"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={cn(
                            "neu-inset mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                            isAlbum ? "text-[#1A1A1A]" : "text-[#207c50]",
                          )}
                        >
                          <AddonIcon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-[#1A1A1A]">
                            {item.name}
                          </p>
                          <p className="text-xs text-[#71717A]">
                            {item.description}
                          </p>
                          <p className="mt-1 font-mono text-xs font-semibold text-[#1A1A1A]">
                            ₹{item.price.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddOnEditor(item)}
                        className="group/btn shrink-0 cursor-pointer rounded-md p-1.5 transition-colors hover:bg-neutral-100"
                      >
                        <Pencil className="size-3.5 text-[#71717A] transition-colors group-hover/btn:text-[#1A1A1A]" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === "Branding" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
            {/* AI Brand & Package Ingestion Engine */}
            <section>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  handleFile(e.dataTransfer.files?.[0])
                }}
                className={cn(
                  "relative overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all",
                  isDragging
                    ? "border-[#207c50] bg-[#207c50]/5"
                    : "border-[#ECEAE6] bg-white hover:border-[#71717A]/40",
                )}
              >
                <div className="mx-auto flex max-w-xl flex-col items-center">
                  <span className="neu-circle inline-flex size-16 items-center justify-center rounded-2xl text-[#1A1A1A]">
                    <UploadCloud className="size-7" />
                  </span>
                  <h2 className="mt-5 flex items-center gap-2 font-serif text-xl font-medium text-[#1A1A1A]">
                    <Sparkles className="size-5 text-[#207c50]" />
                    AI Brand &amp; Package Ingestion Engine
                  </h2>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-[#71717A]">
                    Drag and drop your existing pricing PDF or rate sheet here.
                    Our AI will automatically extract your core package variables,
                    line items, studio logos, and signature brand color palettes
                    to personalize your client-facing proposals.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <FileText className="size-4" />
                    Select PDF File
                  </button>
                  {fileName && (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#207c50]/10 px-3 py-1 text-xs font-medium text-[#207c50]">
                      <Check className="size-3.5" />
                      {fileName} ingested
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Active Brand Hooks */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                Active Brand Hooks
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div className="neu-inset rounded-2xl p-5">
                  <p className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
                    <ImageIcon className="size-3.5" />
                    Extracted Logo
                  </p>
                  <div className="mt-3 flex h-20 items-center justify-center rounded-xl border border-dashed border-[#ECEAE6] bg-[#FAF9F6]/60">
                    <span className="font-serif text-lg italic text-[#71717A]">
                      Your Logo
                    </span>
                  </div>
                </div>

                <div className="neu-inset rounded-2xl p-5">
                  <p className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
                    <Sparkles className="size-3.5" />
                    Brand Colors
                  </p>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {brandColors.map((color, i) => (
                      <div key={color.label} className="flex items-center gap-2">
                        <label
                          className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[#ECEAE6]"
                          style={{ backgroundColor: color.hex }}
                        >
                          <input
                            type="color"
                            value={color.hex}
                            onChange={(e) => handleColorChange(i, e.target.value)}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                        </label>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[#1A1A1A]">
                            {color.label}
                          </p>
                          <p className="font-mono text-[11px] uppercase text-[#71717A]">
                            {color.hex}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="neu-inset rounded-2xl p-5">
                  <p className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
                    <Type className="size-3.5" />
                    Font Selection
                  </p>
                  <select
                    value={font}
                    onChange={(e) => setFont(e.target.value)}
                    className="mt-3 w-full rounded-lg border-0 px-3 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <p className="mt-3 truncate font-serif text-lg text-[#1A1A1A]">
                    Aa Bb Cc 123
                  </p>
                </div>
              </div>
            </section>

            {/* Master Proposal Canvas Layouts */}
            <section>
              <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                Master Proposal Canvas Layouts
              </h3>
              <p className="text-pretty text-xs text-[#71717A]">
                Choose the global structural framework for your generated client
                proposals.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {TEMPLATE_FRAMEWORKS.map((tpl) => {
                  const isActive = activeTemplate === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setActiveTemplate(tpl.id)}
                      className={cn(
                        "flex w-full cursor-pointer select-none flex-col items-center rounded-2xl p-5 text-center transition-all duration-200",
                        isActive
                          ? "scale-[1.01] border-2 border-neutral-900 bg-white shadow-md"
                          : "border border-neutral-200 bg-white/60 opacity-75 hover:border-neutral-300 hover:opacity-100",
                      )}
                    >
                      <TemplatePreview id={tpl.id} />
                      <div className="mt-4 flex w-full items-center justify-center gap-2">
                        <tpl.icon className="size-4 text-[#1A1A1A]" />
                        <p className="font-serif text-base font-medium text-[#1A1A1A]">
                          {tpl.name}
                        </p>
                      </div>
                      <p className="mt-1 text-center text-xs leading-relaxed text-[#71717A]">
                        {tpl.tag}
                      </p>
                      {isActive && (
                        <div className="mt-4 w-full pt-3">
                          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1A1A1A] px-3.5 py-1.5 text-xs font-semibold text-white">
                            <Check className="size-3.5" />
                            Active Default
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === "Team & Permissions" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
            <section>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                    Studio Team Management
                  </h3>
                  <p className="text-xs text-[#71717A]">
                    Manage member access and client-facing permissions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Plus className="size-4" />
                  Invite Member
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="overflow-hidden rounded-3xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <span
                          className={cn(
                            "inline-flex size-12 shrink-0 items-center justify-center rounded-full font-serif text-sm font-semibold",
                            member.isOwner
                              ? "bg-[#1A1A1A] text-white"
                              : "bg-[#F4F4F5] text-[#1A1A1A]",
                          )}
                        >
                          {member.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="font-serif text-lg font-medium text-[#1A1A1A]">
                            {member.name}
                          </p>
                          <p className="text-xs text-[#71717A]">
                            {member.description}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#F4F4F5] px-3 py-1 text-xs font-medium text-[#1A1A1A]">
                        {member.role}
                      </span>
                    </div>

                    {member.hasChatToggle && (
                      <>
                        <div className="my-5 border-t border-[#ECEAE6]" />
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm text-[#1A1A1A]">
                            Allow client chat access
                          </p>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={clientChatAccess}
                            onClick={() => setClientChatAccess((v) => !v)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                              clientChatAccess
                                ? "bg-[#3D6B4A]"
                                : "bg-[#71717A]/30",
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                                clientChatAccess
                                  ? "translate-x-5"
                                  : "translate-x-0.5",
                              )}
                            />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "Integrations" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
            <section>
              <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                System Integrations
              </h3>
              <p className="mt-0.5 text-xs text-[#71717A]">
                Connect external services to automate your studio workflow
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {INTEGRATIONS.map((item) => {
                  const connected = connectedIntegrations[item.id]
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="neu-circle flex flex-col rounded-2xl border border-[#ECEAE6]/60 bg-white p-6"
                    >
                      <span className="neu-inset inline-flex size-11 items-center justify-center rounded-xl text-[#1A1A1A]">
                        <Icon className="size-5" />
                      </span>
                      <p className="mt-4 font-medium text-[#1A1A1A]">
                        {item.title}
                      </p>
                      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#71717A]">
                        {item.description}
                      </p>
                      {connected ? (
                        <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#1A1A1A]">
                          <span className="size-2 rounded-full bg-[#207c50]" />
                          Connected
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setConnectedIntegrations((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                          className="neu-circle mt-5 inline-flex w-fit items-center rounded-full border border-[#ECEAE6] bg-white px-4 py-1.5 text-xs font-semibold text-[#1A1A1A] transition-colors hover:text-[#1A1A1A]/80"
                        >
                          {item.actionLabel}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === "Billing & Tax" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
            <section>
              <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                Currency &amp; Invoice Details
              </h3>
              <p className="text-xs text-[#71717A]">
                Set your default currency and tax identification details.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Preferred Currency">
                  <select
                    defaultValue="INR (₹)"
                    className="w-full rounded-lg border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
                  >
                    <option value="INR (₹)">Indian Rupee (INR)</option>
                    {CURRENCY_OPTIONS.filter((c) => c !== "INR (₹)").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="GST/Tax ID (Optional)">
                  <VanishingInput defaultText="27AAACR3456F1Z5" mono />
                </Field>
                <Field label="Tax Description" className="sm:col-span-2">
                  <VanishingInput defaultText="GST (Goods and Services Tax) - 18% inclusive in all fees" />
                </Field>
                <Field label="Bank Account Info" className="sm:col-span-2">
                  <VanishingTextarea defaultText="HDFC Bank, Current A/C 50200012345678, IFSC HDFC0001234, Branch: FC Road, Pune" />
                </Field>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-2.5 text-sm font-semibold text-white"
                >
                  <Check className="size-4" />
                  Save Changes
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
            <section>
              <h3 className="font-serif text-lg font-medium text-[#1A1A1A]">
                Notification Preferences
              </h3>
              <p className="text-xs text-[#71717A]">
                Choose how and when you want to stay informed.
              </p>
              <div className="mt-5 space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="neu-inset flex items-center justify-between gap-4 rounded-2xl p-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {n.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[#71717A]">
                        {n.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={n.enabled}
                      onClick={() => toggleNotification(n.id)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                        n.enabled ? "bg-[#207c50]" : "bg-[#71717A]/30",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                          n.enabled ? "translate-x-5" : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {isInviteOpen && (
        <InviteStudioMemberModal
          onClose={() => setIsInviteOpen(false)}
          onSend={(member) => {
            setTeamMembers((prev) => [...prev, member])
            setIsInviteOpen(false)
          }}
        />
      )}

      {editTarget && (
        <CatalogEditorDrawer
          kind={editTarget.kind}
          draftTitle={draftTitle}
          setDraftTitle={setDraftTitle}
          draftPrice={draftPrice}
          setDraftPrice={setDraftPrice}
          draftDeliverables={draftDeliverables}
          setDraftDeliverables={setDraftDeliverables}
          onClose={() => setEditTarget(null)}
          onSave={saveEditor}
        />
      )}
    </div>
  )
}

function CatalogEditorDrawer({
  kind,
  draftTitle,
  setDraftTitle,
  draftPrice,
  setDraftPrice,
  draftDeliverables,
  setDraftDeliverables,
  onClose,
  onSave,
}: {
  kind: "package" | "addon"
  draftTitle: string
  setDraftTitle: (v: string) => void
  draftPrice: string
  setDraftPrice: (v: string) => void
  draftDeliverables: string
  setDraftDeliverables: (v: string) => void
  onClose: () => void
  onSave: () => void
}) {
  const isPackage = kind === "package"
  const priceDisplay = draftPrice.replace(/[^0-9]/g, "")
    ? `₹ ${draftPrice.replace(/[^0-9]/g, "")}`
    : "₹ "

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-[400px] flex-col border-l border-[#ECEAE6] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#ECEAE6] px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
              {isPackage ? "Edit Base Package" : "Edit Catalog Add-on"}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-[#1A1A1A]">
              Editing Workspace
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#1A1A1A]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto neu-scroll px-6 py-6">
          <div className="space-y-5">
            <Field label={isPackage ? "Package Title" : "Add-on Title"}>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full rounded-xl border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
              />
            </Field>
            <Field label="Base Price Value (₹)">
              <input
                type="text"
                value={priceDisplay}
                onChange={(e) =>
                  setDraftPrice(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-full rounded-xl border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#71717A]">
                {isPackage ? "Bullet Point Deliverables" : "Description"}
              </label>
              <textarea
                rows={isPackage ? 6 : 4}
                value={draftDeliverables}
                onChange={(e) => setDraftDeliverables(e.target.value)}
                className="w-full resize-none rounded-xl border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
              />
              {isPackage && (
                <p className="text-[11px] leading-relaxed text-[#71717A]">
                  Each line becomes a separate bullet deliverable on the client
                  proposal.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#ECEAE6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="neu-circle flex-1 rounded-xl border border-[#ECEAE6] bg-[#FAF9F6] py-2.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Check className="size-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function InviteStudioMemberModal({
  onClose,
  onSend,
}: {
  onClose: () => void
  onSend: (member: TeamMember) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>(INVITE_ROLES[0])

  function getInitials(fullName: string) {
    return fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2)
  }

  function handleSend() {
    const trimmed = name.trim()
    if (!trimmed || !email.trim()) return
    onSend({
      id: `member-${Date.now()}`,
      name: trimmed,
      description: "Invitation sent — pending acceptance",
      role,
      initials: getInitials(trimmed) || "NM",
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[#ECEAE6] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-xl font-medium text-[#1A1A1A]">
              Invite Studio Member
            </h2>
            <p className="mt-1 text-sm text-[#71717A]">
              Send a secure invitation link to join your studio workspace
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#1A1A1A]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Full Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rahul Sharma"
              className="w-full rounded-xl border-0 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#71717A] outline-none neu-inset"
            />
          </Field>
          <Field label="Email Address">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., rahul@studio.com"
              className="w-full rounded-xl border-0 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#71717A] outline-none neu-inset"
            />
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border-0 px-4 py-2.5 text-sm text-[#1A1A1A] outline-none neu-inset"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!name.trim() || !email.trim()}
          className="mt-6 w-full rounded-full bg-[#1A1A1A] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send Invite Link
        </button>
      </div>
    </div>
  )
}

function TemplatePreview({ id }: { id: string }) {
  if (id === "editorial") {
    return (
      <div className="flex h-28 w-full flex-col justify-center gap-2 rounded-xl bg-[#F4F4F5]/60 p-4">
        <div className="h-4 w-2/5 rounded-sm bg-[#1A1A1A]/70" />
        <div className="mt-1 h-1.5 w-full rounded-sm bg-[#1A1A1A]/15" />
        <div className="h-1.5 w-4/5 rounded-sm bg-[#1A1A1A]/10" />
      </div>
    )
  }
  if (id === "cinematic") {
    return (
      <div className="flex h-28 w-full items-stretch gap-3 rounded-xl bg-[#1A1A1A] p-4">
        <div className="w-2 shrink-0 rounded-full bg-[#207c50]" />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <div className="h-2.5 w-3/4 rounded-sm bg-white/90" />
          <div className="h-1.5 w-full rounded-sm bg-white/40" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-[#ECEAE6] bg-[#FAF9F6]/60 p-4">
      <div className="h-2 w-1/2 rounded-sm bg-[#1A1A1A]/60" />
      <div className="h-px w-8 bg-[#1A1A1A]/40" />
      <div className="mt-1.5 grid w-full grid-cols-3 gap-1.5">
        <div className="h-5 rounded-md bg-[#1A1A1A]/10" />
        <div className="h-5 rounded-md bg-[#1A1A1A]/10" />
        <div className="h-5 rounded-md bg-[#1A1A1A]/10" />
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-medium text-[#71717A]">{label}</label>
      {children}
    </div>
  )
}

function VanishingInput({
  defaultText,
  type = "text",
  mono = false,
}: {
  defaultText: string
  type?: string
  mono?: boolean
}) {
  const [value, setValue] = useState(defaultText)
  const [isSample, setIsSample] = useState(true)

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        setIsSample(false)
      }}
      onFocus={() => {
        if (isSample) setValue("")
      }}
      onBlur={() => {
        if (value.trim() === "") {
          setValue(defaultText)
          setIsSample(true)
        }
      }}
      className={cn(
        "w-full rounded-lg border-0 px-4 py-2.5 text-sm outline-none transition-colors neu-inset",
        mono && "font-mono",
        isSample ? "text-[#71717A]" : "text-[#1A1A1A]",
      )}
    />
  )
}

function VanishingTextarea({
  defaultText,
  rows = 3,
}: {
  defaultText: string
  rows?: number
}) {
  const [value, setValue] = useState(defaultText)
  const [isSample, setIsSample] = useState(true)

  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        setIsSample(false)
      }}
      onFocus={() => {
        if (isSample) setValue("")
      }}
      onBlur={() => {
        if (value.trim() === "") {
          setValue(defaultText)
          setIsSample(true)
        }
      }}
      className={cn(
        "w-full resize-none rounded-lg border-0 px-4 py-2.5 text-sm outline-none transition-colors neu-inset",
        isSample ? "text-[#71717A]" : "text-[#1A1A1A]",
      )}
    />
  )
}
