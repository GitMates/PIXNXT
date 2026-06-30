import React, { useState } from "react"
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  MessageCircle,
  Lock,
} from "lucide-react"
import { cn } from "../../lib/utils"
import { ProposalWorkspace } from "./ProposalWorkspace"
import { ProjectOverviewPanel } from "./ProjectOverviewPanel"
import { ClientChatPanel } from "./ClientChatPanel"
import { TeamDelegationPanel } from "./TeamDelegationPanel"
import { ContractsPanel } from "./ContractsPanel"

type ProjectTab = "overview" | "chat" | "proposals" | "contracts" | "team"
type SimRole = "Owner" | "Studio Manager" | "Lead Editor"

const SIM_ROLES: SimRole[] = ["Owner", "Studio Manager", "Lead Editor"]

const TABS: { id: ProjectTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "chat", label: "Client Chat", icon: MessageCircle },
  { id: "proposals", label: "Proposals & Invoices", icon: FileText },
  { id: "contracts", label: "Contracts", icon: ClipboardList },
  { id: "team", label: "Team & Delegation", icon: Users },
]

export interface PortalWorkspaceViewProps {
  workspaceProjectName: string
  onCloseProject: () => void
}

export function PortalWorkspaceView({
  workspaceProjectName,
  onCloseProject,
}: PortalWorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview")
  const [role, setRole] = useState<SimRole>("Owner")
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  const isRestricted = role === "Lead Editor"
  const visibleTabs = TABS.filter(
    (tab) => !(isRestricted && tab.id === "chat"),
  )

  const handleRoleChange = (next: SimRole) => {
    setRole(next)
    setRoleMenuOpen(false)
    if (
      next === "Lead Editor" &&
      (activeTab === "chat" || activeTab === "contracts")
    ) {
      setActiveTab("overview")
    }
  }

  const tabIsGated =
    isRestricted && (activeTab === "chat" || activeTab === "contracts")

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAF9F6]">
      <header className="flex-shrink-0 border-b border-[#ECEAE6] bg-[#FAF9F6] px-6 pt-5 md:px-8">
        <nav className="flex items-center gap-1.5 text-sm text-[#71717A]">
          <button
            type="button"
            onClick={onCloseProject}
            className="cursor-pointer transition-colors hover:text-[#1A1A1A] hover:underline underline-offset-2 decoration-1"
          >
            Pipeline
          </button>
          <ChevronRight className="size-3.5 flex-shrink-0" />
          <span className="font-medium text-[#1A1A1A]">
            {workspaceProjectName}
          </span>
        </nav>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onCloseProject}
            title="Back to Pipeline"
            className="inline-flex size-8 flex-shrink-0 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#1A1A1A]"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1A1A1A]">
            {workspaceProjectName} — Wedding
          </h1>

          <div className="relative ml-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setRoleMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1A1A1A] shadow-sm transition-colors hover:bg-[#F4F4F5]/60"
            >
              <span className="text-[#71717A]">Simulate Role:</span>
              <span className="font-semibold">{role}</span>
              <ChevronDown className="size-3.5 text-[#71717A]" />
            </button>
            {roleMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setRoleMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-[#ECEAE6] bg-white py-1 shadow-lg">
                  {SIM_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[#F4F4F5]",
                        r === role
                          ? "font-semibold text-[#1A1A1A]"
                          : "text-[#71717A]",
                      )}
                    >
                      {r}
                      {r === role && (
                        <span className="size-1.5 rounded-full bg-[#1A1A1A]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1 overflow-x-auto neu-scroll">
          {visibleTabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-[#1A1A1A] text-[#1A1A1A]"
                    : "border-transparent text-[#71717A] hover:text-[#1A1A1A]",
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tabIsGated ? (
          <AccessRestrictedCard />
        ) : (
          <>
            {activeTab === "overview" && (
              <ProjectOverviewPanel clientName={workspaceProjectName} />
            )}
            {activeTab === "chat" && (
              <ClientChatPanel clientName={workspaceProjectName} />
            )}
            {activeTab === "proposals" &&
              (isRestricted ? (
                <AccessRestrictedCard />
              ) : (
                <ProposalWorkspace
                  embedded
                  defaultProposal={{
                    clientName: workspaceProjectName,
                    eventDate: "2025-07-15",
                    eventLocation: "Udaipur",
                  }}
                />
              ))}
            {activeTab === "contracts" && <ContractsPanel />}
            {activeTab === "team" &&
              (isRestricted ? (
                <AccessRestrictedCard />
              ) : (
                <TeamDelegationPanel />
              ))}
          </>
        )}
      </div>
    </div>
  )
}

function AccessRestrictedCard() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.12)]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#F4F4F5]">
          <Lock className="size-6 text-[#71717A]" />
        </span>
        <h2 className="mt-5 font-serif text-xl font-medium text-[#1A1A1A]">
          Access Restricted
        </h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-[#71717A]">
          Your role permissions (Lead Editor) do not grant access to direct
          client communication or contract adjustments. Contact the studio owner
          to request access.
        </p>
      </div>
    </div>
  )
}
