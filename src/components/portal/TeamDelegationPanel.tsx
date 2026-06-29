import React, { useState } from "react"
import { Camera, Crown, Zap } from "lucide-react"

const crew = [
  {
    id: "1",
    name: "Ananya Iyer",
    initials: "AI",
    role: "Project Owner",
    access: "Full Access",
    badge: "owner",
  },
  {
    id: "2",
    name: "Vikram Dev",
    initials: "VD",
    role: "Assigned Lead Photographer",
    access: "Sandboxed",
    badge: "crew",
  },
]

export function TeamDelegationPanel() {
  const [member, setMember] = useState("")
  const [projectRole, setProjectRole] = useState("")

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6 md:flex-row md:p-8">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[#ECEAE6] bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#1A1A1A]">
            Assigned Project Crew
          </h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Members with access to this project workspace.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {crew.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[#ECEAE6] bg-[#FAF9F6]/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#1A1A1A] text-sm font-semibold text-white">
                  {person.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    {person.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-[#71717A]">
                    {person.badge === "crew" && (
                      <Camera className="size-3 shrink-0" />
                    )}
                    {person.role}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {person.badge === "owner" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F4F5] px-2.5 py-1 text-[10px] font-semibold text-[#1A1A1A]">
                    <Crown className="size-3" />
                    Project Owner
                  </span>
                ) : (
                  <>
                    <p className="text-[10px] font-medium text-[#71717A]">
                      {person.access}
                    </p>
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-[#1A1A1A] hover:underline"
                    >
                      Modify Access
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full shrink-0 rounded-2xl border border-[#ECEAE6] bg-white p-6 shadow-sm md:w-[340px]">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#1A1A1A]">
            Delegate to Crew Member
          </h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Grant a studio member sandboxed access to this project.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#71717A]">
              Select Studio Member
            </label>
            <select
              value={member}
              onChange={(e) => setMember(e.target.value)}
              className="neu-input w-full rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A]"
            >
              <option value="">Choose a member...</option>
              <option value="rahul">Rahul Mehta</option>
              <option value="meera">Meera Shah</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#71717A]">
              Project Role
            </label>
            <input
              type="text"
              value={projectRole}
              onChange={(e) => setProjectRole(e.target.value)}
              placeholder="e.g., Second Shooter, Cinematic Editor"
              className="neu-input w-full rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A]"
            />
          </div>
        </div>

        <button
          type="button"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
        >
          <Zap className="size-3.5" />
          Grant Sandbox Access
        </button>
      </div>
    </div>
  )
}
