import fs from "fs"

const line = fs
  .readFileSync(
    "C:/Users/26kav/.cursor/projects/c-PCfiles-pic-project-album-PIXNXT/agent-transcripts/9d1aa45d-80f7-4f57-b4dd-e87d5c9f9313/9d1aa45d-80f7-4f57-b4dd-e87d5c9f9313.jsonl",
    "utf8"
  )
  .split("\n")[0]
const t = JSON.parse(line).message.content.find((c) => c.type === "text").text

const markers = ["Proposal viewed", "Google Calendar Sync"]

for (const m of markers) {
  const start = t.indexOf(m)
  console.log("\n=== MARKER:", m, "at", start, "===\n")
  if (start >= 0) console.log(t.slice(start, start + 6000))
}
