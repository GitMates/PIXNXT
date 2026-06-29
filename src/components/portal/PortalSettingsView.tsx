import React, { type RefObject } from "react"
import {
  Plus,
  Camera,
  Pencil,
  Video,
  Trash2,
  UploadCloud,
  ImageIcon,
  Type,
  Sparkles,
  AlignLeft,
  LayoutTemplate,
  Film,
  Check,
  CalendarDays,
  CreditCard,
  MessageCircle,
  Users,
  Settings2,
  FileText,
  BookOpen,
  ChevronDown,
} from "lucide-react"
import {
  type SettingsTab,
  type Package,
  type AddOn,
  type LegalTemplate,
} from "./portalData"

function formatPackageDescription(pkg: Package): string {
  const parts: string[] = [`${pkg.duration}`, `${pkg.editedPhotos} edited photos`]
  if (pkg.videography) parts.push("Cinematic videography")
  if (pkg.albums > 0) {
    parts.push(`${pkg.albums} premium album${pkg.albums > 1 ? "s" : ""}`)
  }
  return parts.join(" · ")
}

function addonIconFor(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes("drone")) return Video
  if (lower.includes("album")) return BookOpen
  return Video
}

const SETTINGS_TABS: Array<{
  id: SettingsTab
  label: string
  icon?: React.ComponentType<{ className?: string }>
}> = [
  { id: "General", label: "General" },
  { id: "Packages & Add-ons", label: "Packages & Add-ons" },
  { id: "Branding", label: "Branding" },
  { id: "Billing & Tax", label: "Billing & Tax" },
  { id: "Notifications", label: "Notifications" },
  { id: "Team & Permissions", label: "Team & Permissions", icon: Users },
  { id: "Integrations", label: "Integrations", icon: Settings2 },
  { id: "Legal Templates", label: "Legal Templates", icon: FileText },
]

export interface PortalSettingsViewProps {
  activeSettingsTab: SettingsTab
  setActiveSettingsTab: (tab: SettingsTab) => void
  profileName: string
  setProfileName: (v: string) => void
  profileEmail: string
  setProfileEmail: (v: string) => void
  profilePhone: string
  setProfilePhone: (v: string) => void
  profileCurrency: string
  setProfileCurrency: (v: string) => void
  packagesList: Package[]
  setPackagesList: React.Dispatch<React.SetStateAction<Package[]>>
  addonsList: AddOn[]
  setAddonsList: React.Dispatch<React.SetStateAction<AddOn[]>>
  onEditPackage: (pkg: Package) => void
  onEditAddon: (add: AddOn) => void
  brandColors: Array<{ label: string; hex: string }>
  setBrandColors: React.Dispatch<
    React.SetStateAction<Array<{ label: string; hex: string }>>
  >
  fontFamily: string
  setFontFamily: (v: string) => void
  brandTemplate: string
  setBrandTemplate: (v: string) => void
  notifViewed: boolean
  setNotifViewed: (v: boolean) => void
  notifSigned: boolean
  setNotifSigned: (v: boolean) => void
  notifReminders: boolean
  setNotifReminders: (v: boolean) => void
  clientChatAccess: boolean
  setClientChatAccess: (v: boolean) => void
  whatsappEnabled: boolean
  setWhatsappEnabled: (v: boolean) => void
  legalTemplates: LegalTemplate[]
  selectedTemplateId: string
  setSelectedTemplateId: (id: string) => void
  activeLegalTemplate: LegalTemplate
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onUpdateTemplateBody: (val: string) => void
  onInsertToken: (token: string) => void
  onCreateTemplate: () => void
  onDeleteTemplate: (id: string) => void
}

export function PortalSettingsView({
  activeSettingsTab,
  setActiveSettingsTab,
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  profilePhone,
  setProfilePhone,
  profileCurrency,
  setProfileCurrency,
  packagesList,
  setPackagesList,
  addonsList,
  setAddonsList,
  onEditPackage,
  onEditAddon,
  brandColors,
  setBrandColors,
  fontFamily,
  setFontFamily,
  brandTemplate,
  setBrandTemplate,
  notifViewed,
  setNotifViewed,
  notifSigned,
  setNotifSigned,
  notifReminders,
  setNotifReminders,
  clientChatAccess,
  setClientChatAccess,
  whatsappEnabled,
  setWhatsappEnabled,
  legalTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  activeLegalTemplate,
  textareaRef,
  onUpdateTemplateBody,
  onInsertToken,
  onCreateTemplate,
}: PortalSettingsViewProps) {
  return (
    <div className="portal-settings flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <header className="flex flex-shrink-0 flex-col gap-5 bg-[#FAF9F6] px-6 py-5 md:px-8">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1A1A1A]">
            Studio Settings
          </h1>
          <p className="mt-1 text-sm text-[#71717A]">
            Manage your catalog, branding, and proposal defaults
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {SETTINGS_TABS.map((tab) => {
            const active = activeSettingsTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "portal-settings-tab-active text-[#1A1A1A]"
                    : "text-[#71717A] hover:text-[#1A1A1A]"
                }`}
              >
                {Icon && <Icon className="size-3.5" />}
                {tab.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto neu-scroll">
        {activeSettingsTab === "General" && (
          <div className="mx-auto max-w-4xl px-6 py-6 md:px-8">
            <section className="space-y-5">
              <div>
                <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">
                  Studio Profile
                </h3>
                <p className="mt-0.5 text-xs text-[#71717A]">
                  Core identity used across proposals and invoices
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#71717A]">
                    Studio Profile Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="neu-input w-full rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#71717A]">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="neu-input w-full rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#71717A]">
                    Primary Phone Number
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="neu-input w-full rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#71717A]">
                    System Currency Default
                  </label>
                  <div className="relative">
                    <select
                      value={profileCurrency}
                      onChange={(e) => setProfileCurrency(e.target.value)}
                      className="neu-input w-full appearance-none rounded-2xl px-4 py-3 pr-10 text-sm text-[#1A1A1A] outline-none"
                    >
                      <option>INR (₹)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#71717A]" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
                >
                  <Check className="size-4" />
                  Save Changes
                </button>
              </div>
            </section>
          </div>
        )}

        {activeSettingsTab === "Packages & Add-ons" && (
          <div className="mx-auto max-w-4xl space-y-10 px-6 py-6 md:px-8">
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">
                    Base Packages Template Manager
                  </h3>
                  <p className="mt-0.5 text-xs text-[#71717A]">
                    Auto-populated from your ingested rate sheet
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `p-${Date.now()}`
                    setPackagesList((prev) => [
                      ...prev,
                      {
                        id: newId,
                        name: "New Deluxe Package",
                        price: 180000,
                        duration: "14 hours",
                        editedPhotos: 500,
                        videography: true,
                        albums: 1,
                      },
                    ])
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-xs font-medium text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#FAFAFA]"
                >
                  <Plus className="size-3.5" />
                  Add Package
                </button>
              </div>

              <div className="space-y-3">
                {packagesList.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#1A1A1A]">
                        <Camera className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#1A1A1A]">{pkg.name}</p>
                        <p className="mt-0.5 text-xs text-[#71717A]">
                          {formatPackageDescription(pkg)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-[#1A1A1A]">
                        ₹{pkg.price.toLocaleString("en-IN")}
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditPackage(pkg)}
                        className="p-1.5 text-[#71717A] transition-colors hover:text-[#1A1A1A]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPackagesList((prev) => prev.filter((p) => p.id !== pkg.id))
                        }
                        className="p-1.5 text-[#71717A] transition-colors hover:text-red-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-medium text-[#1A1A1A]">
                    Global Add-ons Catalog
                  </h3>
                  <p className="mt-0.5 text-xs text-[#71717A]">
                    Reusable line items across all proposals
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `a-${Date.now()}`
                    setAddonsList((prev) => [
                      ...prev,
                      {
                        id: newId,
                        name: "New Add-on Service",
                        price: 12000,
                        description: "Add-on description details",
                      },
                    ])
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-xs font-medium text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#FAFAFA]"
                >
                  <Plus className="size-3.5" />
                  Add Item
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {addonsList.map((item) => {
                  const AddonIcon = addonIconFor(item.name)
                  return (
                    <div
                      key={item.id}
                      className="relative rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    >
                      <button
                        type="button"
                        onClick={() => onEditAddon(item)}
                        className="absolute right-3 top-3 p-1 text-[#71717A] transition-colors hover:text-[#1A1A1A]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <div className="flex gap-3 pr-8">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F4F5] text-[#1A1A1A]">
                          <AddonIcon className="size-4" />
                        </span>
                        <div>
                          <p className="font-medium text-sm text-[#1A1A1A]">{item.name}</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#71717A]">
                            {item.description}
                          </p>
                          <p className="mt-2 font-mono text-xs font-semibold text-[#1A1A1A]">
                            ₹{item.price.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {activeSettingsTab === "Branding" && (
          <div className="mx-auto max-w-4xl px-8 py-8 space-y-8">
            <section className="rounded-3xl border-2 border-dashed border-neutral-300 p-10 text-center bg-white">
              <div className="mx-auto max-w-xl flex flex-col items-center">
                <span className="size-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-primary">
                  <UploadCloud className="size-7" />
                </span>
                <h2 className="mt-5 flex items-center gap-2 font-serif text-xl font-medium">
                  <Sparkles className="size-5 text-emerald-600 animate-pulse" />
                  AI Brand &amp; Package Ingestion Engine
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Upload a pricing PDF or rates spreadsheet. Our AI will instantly map
                  out your packages, branding logos, colors, and typography selections.
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background"
                >
                  Upload Rates PDF
                </button>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3 pt-4">
              <div className="rounded-2xl border p-5 bg-white">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" /> Extracted Logo
                </p>
                <div className="mt-4 flex h-20 items-center justify-center rounded-xl border border-dashed text-sm font-serif italic text-muted-foreground bg-neutral-50">
                  Karakovan Studio Logo
                </div>
              </div>

              <div className="rounded-2xl border p-5 bg-white space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> Brand Colors
                </p>
                {brandColors.map((color, i) => (
                  <div key={color.label} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color.hex}
                      onChange={(e) => {
                        const updated = [...brandColors]
                        updated[i] = { ...updated[i], hex: e.target.value }
                        setBrandColors(updated)
                      }}
                      className="size-7 rounded-full border cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-medium text-foreground">{color.label}</p>
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        {color.hex}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border p-5 bg-white space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Type className="size-3.5" /> Font Selection
                </p>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-sm border-0 outline-none"
                >
                  <option>Playfair Display (Serif)</option>
                  <option>Inter (Sans-serif)</option>
                  <option>Montserrat (Sans-serif)</option>
                </select>
                <div className="mt-4 font-serif text-lg border-t pt-3">Aa Bb Cc 123</div>
              </div>
            </section>

            <section className="space-y-4 pt-4">
              <h3 className="font-serif text-lg font-medium">
                Master Proposal Canvas Layouts
              </h3>
              <p className="text-xs text-muted-foreground">
                Select the layout structure to generate client quotes and contract pages.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {(
                  [
                    {
                      id: "editorial",
                      name: "Editorial Minimalist",
                      desc: "Best for Modern Fine-Art & Fashion",
                      icon: AlignLeft,
                    },
                    {
                      id: "classic",
                      name: "Classic Luxury",
                      desc: "Best for Heritage Weddings",
                      icon: LayoutTemplate,
                    },
                    {
                      id: "cinematic",
                      name: "Cinematic Bold",
                      desc: "Best for Film & Commercial Shots",
                      icon: Film,
                    },
                  ] as const
                ).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setBrandTemplate(tpl.id)}
                    className={`flex flex-col items-center text-center p-5 rounded-2xl border transition-all ${
                      brandTemplate === tpl.id
                        ? "border-neutral-900 bg-neutral-50 scale-[1.01]"
                        : "border-neutral-200 bg-white opacity-80 hover:opacity-100"
                    }`}
                  >
                    <tpl.icon className="size-6 text-neutral-800 mb-2" />
                    <h4 className="font-serif text-sm font-semibold">{tpl.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{tpl.desc}</p>
                    {brandTemplate === tpl.id && (
                      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1 text-[10px] font-semibold text-white">
                        <Check className="size-3" /> Default Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeSettingsTab === "Billing & Tax" && (
          <div className="mx-auto max-w-4xl px-8 py-8 space-y-6">
            <h3 className="font-serif text-lg font-medium">
              Billing Settings &amp; Invoices
            </h3>
            <p className="text-xs text-muted-foreground">
              Set up currency rules, payment stages, deposit retenders, and local
              taxation policies.
            </p>
            <div className="border rounded-2xl p-6 bg-white space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <p className="font-medium text-sm">Automated Invoicing</p>
                <span className="text-xs text-muted-foreground">Active default: Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">Tax Rate (GST / VAT)</p>
                <span className="text-xs font-mono font-semibold">18% CGST + SGST</span>
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === "Notifications" && (
          <div className="mx-auto max-w-4xl px-8 py-8 space-y-6">
            <h3 className="font-serif text-lg font-medium">Photographer Alerts</h3>
            <p className="text-xs text-muted-foreground">
              Manage email alerts and SMS confirmations regarding portal activities.
            </p>
            <div className="space-y-4 border rounded-2xl p-6 bg-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Proposal viewed</p>
                  <p className="text-xs text-muted-foreground">
                    Email me instantly when client opens a proposal link
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifViewed}
                  onChange={() => setNotifViewed(!notifViewed)}
                  className="size-4"
                />
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">Contract signed</p>
                  <p className="text-xs text-muted-foreground">
                    Notify me immediately upon electronic signatures
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifSigned}
                  onChange={() => setNotifSigned(!notifSigned)}
                  className="size-4"
                />
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">Automated payment reminders</p>
                  <p className="text-xs text-muted-foreground">
                    Email reminders sent 3 days before balance due dates
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifReminders}
                  onChange={() => setNotifReminders(!notifReminders)}
                  className="size-4"
                />
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === "Team & Permissions" && (
          <div className="mx-auto max-w-4xl px-8 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-medium">Studio Team Management</h3>
                <p className="text-xs text-muted-foreground">
                  Add assistants, photo editors or backup shooters with restricted view
                  locks.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Invite Member
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-5 border rounded-2xl bg-white">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold text-xs">
                    AI
                  </span>
                  <div>
                    <p className="font-medium text-sm">Ananya Iyer</p>
                    <p className="text-xs text-muted-foreground">
                      Full ownership permissions
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-neutral-500 uppercase border px-2 py-0.5 rounded">
                  Owner
                </span>
              </div>
              <div className="flex flex-col gap-4 p-5 border rounded-2xl bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="size-10 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-xs">
                      VD
                    </span>
                    <div>
                      <p className="font-medium text-sm">Vikram Dev</p>
                      <p className="text-xs text-muted-foreground">
                        Permissions locked to assigned pipeline stages
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-neutral-500 uppercase border px-2 py-0.5 rounded">
                    Associate
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-xs">
                  <span>Allow Client Chat access permissions</span>
                  <input
                    type="checkbox"
                    checked={clientChatAccess}
                    onChange={() => setClientChatAccess(!clientChatAccess)}
                    className="size-4"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === "Integrations" && (
          <div className="mx-auto max-w-4xl px-8 py-8 space-y-6">
            <h3 className="font-serif text-lg font-medium">System Integrations</h3>
            <p className="text-xs text-muted-foreground">
              Link external workflows like calendars or client chats.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-5 border rounded-2xl bg-white space-y-3">
                <span className="size-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <CalendarDays className="size-5" />
                </span>
                <h4 className="text-sm font-semibold">Google Calendar Sync</h4>
                <p className="text-xs text-muted-foreground">
                  Keep your shoot dates updated on your daily mobile calendar.
                </p>
                <button
                  type="button"
                  className="w-full py-1.5 border rounded-lg text-xs font-semibold"
                >
                  Connected
                </button>
              </div>
              <div className="p-5 border rounded-2xl bg-white space-y-3">
                <span className="size-10 rounded-xl bg-neutral-100 flex items-center justify-center text-emerald-600">
                  <CreditCard className="size-5" />
                </span>
                <h4 className="text-sm font-semibold">Stripe / Razorpay</h4>
                <p className="text-xs text-muted-foreground">
                  Receive instant wedding booking retainer payments online.
                </p>
                <button
                  type="button"
                  className="w-full py-1.5 border rounded-lg text-xs font-semibold bg-emerald-50 border-emerald-200 text-emerald-800"
                >
                  Active
                </button>
              </div>
              <div className="p-5 border rounded-2xl bg-white space-y-3">
                <span className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <MessageCircle className="size-5" />
                </span>
                <h4 className="text-sm font-semibold">WhatsApp Business</h4>
                <p className="text-xs text-muted-foreground">
                  Deliver client reminder links and approval receipts directly via SMS.
                </p>
                <button
                  type="button"
                  onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                  className={`w-full py-1.5 border rounded-lg text-xs font-semibold ${
                    whatsappEnabled
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : ""
                  }`}
                >
                  {whatsappEnabled ? "Active & Syncing" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === "Legal Templates" && (
          <div className="px-6 pb-8 pt-2 md:px-8">
            <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] lg:min-h-[560px] lg:flex-row">
              <section className="flex w-full flex-col border-b border-black/[0.06] p-6 lg:w-[42%] lg:border-b-0 lg:border-r">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <h4 className="font-serif text-lg font-medium text-[#1A1A1A]">
                    Your Saved Boilerplates
                  </h4>
                  <button
                    type="button"
                    onClick={onCreateTemplate}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
                  >
                    <Plus className="size-3.5" />
                    Create Template
                  </button>
                </div>
                <div className="space-y-2.5">
                  {legalTemplates.map((tpl) => {
                    const selected = tpl.id === selectedTemplateId
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                          selected
                            ? "border-[#1A1A1A] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                            : "border-transparent bg-[#FAFAFA] hover:border-black/[0.06] hover:bg-white"
                        }`}
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                            selected
                              ? "bg-[#1A1A1A] text-white"
                              : "bg-[#F4F4F5] text-[#71717A]"
                          }`}
                        >
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug text-[#1A1A1A]">
                            {tpl.name}
                          </p>
                          <p className="mt-1 text-xs text-[#71717A]">{tpl.updated}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="flex flex-1 flex-col p-6 lg:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#71717A]">
                  Template Blueprint
                </p>
                <h4 className="mt-2 font-serif text-2xl font-medium leading-tight text-[#1A1A1A]">
                  {activeLegalTemplate.name}
                </h4>

                <div className="mt-6">
                  <p className="text-xs font-medium text-[#71717A]">
                    Insert Dynamic Variables
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["{{Client Name}}", "{{Event Date}}", "{{Package Value}}"].map(
                      (token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => onInsertToken(token)}
                          className="rounded-full border border-black/[0.08] bg-[#FAFAFA] px-3 py-1 font-mono text-[11px] text-[#1A1A1A] transition-colors hover:bg-white hover:shadow-sm"
                        >
                          {token}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={activeLegalTemplate.body}
                  onChange={(e) => onUpdateTemplateBody(e.target.value)}
                  className="mt-4 min-h-[280px] flex-1 w-full resize-none rounded-2xl border border-black/[0.08] bg-[#FAFAFA] p-5 font-mono text-xs leading-relaxed text-[#1A1A1A] outline-none transition-shadow focus:border-black/[0.12] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                />
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
