import React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Users,
  MessageCircle,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react"

type WorkspaceTab = "overview" | "chat" | "proposals" | "contracts" | "team"
type SimulatedRole = "Owner" | "Studio Manager" | "Lead Editor"

export interface PortalWorkspaceViewProps {
  workspaceProjectName: string
  workspaceTab: WorkspaceTab
  setWorkspaceTab: (tab: WorkspaceTab) => void
  simulatedRole: SimulatedRole
  setSimulatedRole: (role: SimulatedRole) => void
  roleMenuOpen: boolean
  setRoleMenuOpen: (open: boolean) => void
  onCloseProject: () => void
}

export function PortalWorkspaceView({
  workspaceProjectName,
  workspaceTab,
  setWorkspaceTab,
  simulatedRole,
  setSimulatedRole,
  roleMenuOpen,
  setRoleMenuOpen,
  onCloseProject,
}: PortalWorkspaceViewProps) {
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    {
      id: "chat" as const,
      label: "Client Chat",
      icon: MessageCircle,
      restricted: simulatedRole === "Lead Editor",
    },
    { id: "proposals" as const, label: "Proposals & Invoices", icon: FileText },
    {
      id: "contracts" as const,
      label: "Contracts",
      icon: ClipboardList,
      restricted: simulatedRole === "Lead Editor",
    },
    { id: "team" as const, label: "Team & Delegation", icon: Users },
  ].filter((t) => !t.restricted)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <header className="flex-shrink-0 border-b border-border bg-[#FAF9F6] px-6 pt-5 md:px-8">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={onCloseProject}
            className="cursor-pointer transition-colors hover:text-foreground hover:underline underline-offset-2"
          >
            Pipeline
          </button>
          <ChevronRight className="size-3.5 flex-shrink-0" />
          <span className="font-medium text-foreground">{workspaceProjectName}</span>
        </nav>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onCloseProject}
            className="inline-flex size-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            {workspaceProjectName} — Wedding
          </h1>

          <div className="relative ml-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/40"
            >
              <span className="text-muted-foreground font-light">Simulate Role:</span>
              <span className="font-semibold">{simulatedRole}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
            {roleMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setRoleMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg">
                  {(["Owner", "Studio Manager", "Lead Editor"] as const).map(
                    (roleOption) => (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => {
                          setSimulatedRole(roleOption)
                          setRoleMenuOpen(false)
                          if (
                            roleOption === "Lead Editor" &&
                            (workspaceTab === "chat" || workspaceTab === "contracts")
                          ) {
                            setWorkspaceTab("overview")
                          }
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-muted ${
                          roleOption === simulatedRole
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {roleOption}
                        {roleOption === simulatedRole && (
                          <span className="size-1.5 rounded-full bg-foreground" />
                        )}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1 overflow-x-auto neu-scroll">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setWorkspaceTab(tab.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                workspaceTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 neu-scroll">
        {workspaceTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-bold">
                  Current Phase
                </p>
                <h3 className="text-xl font-serif font-medium mt-1">
                  Booked &amp; Confirmed
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Next Milestone: Initial Moodboard Delivery due in 12 days.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-bold">
                  Total Invoiced
                </p>
                <h3 className="text-xl font-serif font-medium mt-1">₹1,50,000</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  50% Retainer Paid. Remaining ₹75,000 due before shoot.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase font-bold">
                  Client Portals
                </p>
                <h3 className="text-xl font-serif font-medium mt-1">Connected</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  3 users collaborating. 12 uploads synced.
                </p>
              </div>
            </div>
          </div>
        )}

        {workspaceTab === "chat" && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm max-w-2xl mx-auto h-[400px] flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto pr-2">
              <div className="flex gap-2">
                <span className="size-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600">
                  P
                </span>
                <div className="bg-neutral-100 p-3 rounded-2xl rounded-tl-none max-w-sm text-sm">
                  Hi team! We signed the proposal agreement. Can we finalize the
                  shoot locations next week?
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="bg-neutral-900 text-white p-3 rounded-2xl rounded-tr-none max-w-sm text-sm">
                  Absolutely! We will send over the destination selection deck by
                  Tuesday morning.
                </div>
                <span className="size-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-white">
                  S
                </span>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t pt-4">
              <input
                type="text"
                placeholder="Type a client message..."
                className="flex-1 rounded-xl bg-neutral-50 px-4 py-2.5 text-sm border-0 outline-none"
              />
              <button
                type="button"
                className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {workspaceTab === "proposals" && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-serif text-lg font-medium">
                  Standard Wedding Proposal
                </h3>
                <p className="text-xs text-muted-foreground">
                  Proposal draft generated via rate sheets
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2.5 py-1 text-xs font-medium">
                Status: Sent &amp; Approved
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Selected Items
              </p>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">
                    Premium Wedding Coverage (Package)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    12 Hours · 600 Photos · Cinematic Teaser
                  </p>
                </div>
                <span className="font-mono text-sm">₹1,50,000</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">Drone Coverage Add-on</p>
                  <p className="text-xs text-muted-foreground">
                    Aerial shots for standard venue mapping
                  </p>
                </div>
                <span className="font-mono text-sm">₹15,000</span>
              </div>
              <div className="flex items-center justify-between py-4 font-bold text-base">
                <span>Total Agreed Pricing</span>
                <span>₹1,65,000</span>
              </div>
            </div>
          </div>
        )}

        {workspaceTab === "contracts" && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-2 font-serif text-lg font-medium text-foreground">
              <FileText className="size-5" />
              Master Wedding Service SLA Agreement
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This document remains locked as it has been electronically e-signed by
              the primary client, {workspaceProjectName}, on June 28, 2026.
            </p>
            <div className="bg-neutral-50 p-4 rounded-xl font-mono text-xs text-muted-foreground/80 leading-relaxed border max-h-48 overflow-y-auto">
              1. 40% deposit retainer (₹66,000) paid at time of signing.
              <br />
              2. Balance payable strictly 7 days before event start date.
              <br />
              3. Edited galleries to be hosted via Cloud within 8 weeks.
            </div>
          </div>
        )}

        {workspaceTab === "team" && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm max-w-xl mx-auto space-y-4">
            <h3 className="font-serif text-lg font-medium">Team Member Assignments</h3>
            <p className="text-xs text-muted-foreground">
              Delegate pipeline duties or client review limits
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 border rounded-xl bg-neutral-50/50">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Vikram Dev (Associate)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Assigned as secondary photographer
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-800">Assigned</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-xl bg-neutral-50/50">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Ananya Iyer (Owner)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Master creative director
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-800">Assigned</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
