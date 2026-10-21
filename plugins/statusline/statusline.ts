/**
 * A statusline in the prompt's footer row:
 *
 *   ~/Projects/site ⎇  main ◈ GitHub Copilot ✻ Claude Sonnet 5                 ✦ Fix the prompt bar colour
 *
 * opencode draws its own path and branch inside `prompt.footer.status`, sharing the row with
 * the busy indicator, and offers no slot for the path alone. So this replaces the whole slot:
 * the statusline when idle, opencode's own no-animation busy mark `[⋯]` while a turn runs, which
 * keeps the path on screen once. Lost with the slot: the "press esc again" interrupt hint and the
 * "(new worktree)" progress line.
 *
 * Narrow panes drop parts in a fixed order: the title shortens first, then provider, model and
 * branch go; the path always stays.
 *
 * Breaks the footer → add "-kud.statusline" to plugins in cli.json.
 *
 * Written without JSX so opencode loads the .ts as-is: no Solid transform, no build step.
 */

import { Plugin } from "@opencode/plugin/tui"
import { createElement, insert, setProp } from "@opentui/solid"
import { createSignal, type JSX } from "solid-js"
import { homedir } from "node:os"

type Context = Plugin.Context

const PARENT_PINK = "#ff0174"
const DIR_BLUE = "#0092ba"
const BRANCH_GREEN = "#80d440"
const PLAN_PURPLE = "#af82ff"
const MODEL_GREEN = "#b6d88a"
const CHIP_MARK = "#ff8700"
const CHIP_TEXT = "#e4e4ec"
const BUSY_GREY = "#808080"

const PATH_MAX = 40
const BRANCH_MAX = 32
const TITLE_MIN = 12

type Run = { text: string; color?: string; bold?: boolean }

const PROVIDER_NAMES: Record<string, string> = {
  "github-copilot": "GitHub Copilot",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  opencode: "OpenCode",
  lmstudio: "LM Studio",
  deepseek: "DeepSeek",
  xai: "xAI",
}

const ACRONYMS = new Set(["gpt", "oss", "glm", "llm", "ai", "lm", "vl"])

const node = (tag: string, props: Record<string, unknown>, children: unknown[] = []): JSX.Element => {
  const element = createElement(tag)
  for (const [key, value] of Object.entries(props)) setProp(element, key, value)
  for (const child of children) insert(element, child as JSX.Element)
  return element as unknown as JSX.Element
}

const truncateMiddle = (text: string, max: number): string => {
  if (text.length <= max) return text
  const head = Math.floor((max - 3) / 2)
  const tail = max - 3 - head
  return `${text.slice(0, head)}...${text.slice(-tail)}`
}

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

const humanWord = (word: string): string =>
  ACRONYMS.has(word) ? word.toUpperCase() : /^\d+(\.\d+)?[bkm]$/.test(word) ? word.toUpperCase() : capitalise(word)

/** Adjacent bare numbers are one version split by the id's dashes: "opus-4-5" → "Opus 4.5". */
const joinVersions = (words: string[]): string[] =>
  words.reduce<string[]>((acc, word) => {
    const previous = acc.at(-1)
    return previous !== undefined && /^\d+$/.test(word) && /^\d+(\.\d+)*$/.test(previous)
      ? [...acc.slice(0, -1), `${previous}.${word}`]
      : [...acc, word]
  }, [])

const humanCase = (id: string): string =>
  joinVersions(id.toLowerCase().split(/[-_:\s]+/).filter(Boolean)).map(humanWord).join(" ")

/** "anthropic/claude-sonnet-5-20261001" → "claude-sonnet-5": no vendor prefix, no date stamp. */
const shortModel = (modelID: string): string => (modelID.split("/").at(-1) ?? modelID).replace(/-\d{8}$/, "")

const pathRuns = (directory: string): Run[] => {
  const home = homedir()
  const shown = truncateMiddle(directory.startsWith(home) ? `~${directory.slice(home.length)}` : directory, PATH_MAX)
  const cut = shown.lastIndexOf("/")
  if (cut <= 0) return [{ text: shown, color: DIR_BLUE }]
  return [
    { text: shown.slice(0, cut + 1), color: PARENT_PINK },
    { text: shown.slice(cut + 1), color: DIR_BLUE },
  ]
}

const width = (runs: Run[]): number => runs.reduce((sum, run) => sum + run.text.length, 0)

const joined = (parts: Run[][]): Run[] => parts.flatMap((part, index) => (index === 0 ? part : [{ text: " " }, ...part]))

const text = (runs: Run[], props: Record<string, unknown> = {}) =>
  node(
    "text",
    { wrapMode: "none", ...props },
    runs.map((run) => node("span", { style: { fg: run.color, bold: run.bold } }, [run.text])),
  )

const leftParts = (context: Context, sessionID: string | undefined): (Run[] | undefined)[] => {
  const session = sessionID ? context.data.session.get(sessionID) : undefined
  const location = context.location ?? context.data.location.default()
  const directory = session?.location.directory ?? location.directory
  const branch = context.data.location.vcs.info(location)?.branch.current
  const model = context.ui.model.current()
  return [
    pathRuns(directory),
    branch ? [{ text: `⎇  ${truncateMiddle(branch, BRANCH_MAX)}`, color: BRANCH_GREEN }] : undefined,
    model ? [{ text: `◈ ${PROVIDER_NAMES[model.providerID] ?? humanCase(model.providerID)}`, color: PLAN_PURPLE }] : undefined,
    model ? [{ text: `✻ ${humanCase(shortModel(model.modelID))}`, color: MODEL_GREEN }] : undefined,
  ]
}

/** `room` is the slot's own measured width: the row shares it with the agent and command hints, and on home it is only as wide as the centred prompt. */
const statusline = (context: Context, sessionID: string | undefined, room: number): JSX.Element => {
  const title = (sessionID ? context.data.session.get(sessionID)?.title?.trim() : undefined) ?? ""
  const titleNeed = title ? 2 + 2 + Math.min(title.length, TITLE_MIN) : 0

  // Index order is draw order; DROP_ORDER is which goes first when the row is too wide.
  const parts = leftParts(context, sessionID)
  const DROP_ORDER = [2, 3, 1]
  const present = () => joined(parts.filter((part): part is Run[] => part !== undefined))
  let left = present()
  for (const index of DROP_ORDER) {
    if (width(left) + titleNeed <= room) break
    parts[index] = undefined
    left = present()
  }

  const showTitle = title && room - width(left) - 4 >= TITLE_MIN
  return node("box", { flexDirection: "row", flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 2, justifyContent: "space-between" }, [
    text(left, { flexShrink: 0 }),
    showTitle
      ? text(
          [
            { text: "✦ ", color: CHIP_MARK },
            { text: title, color: CHIP_TEXT },
          ],
          { truncate: true, flexShrink: 1, minWidth: 0 },
        )
      : node("box", {}),
  ])
}

export default Plugin.define({
  id: "kud.statusline",
  setup(context) {
    void context.data.location.vcs.sync(context.location).catch(() => {})

    const release = context.ui.slot({
      replace: "prompt.footer.status",
      render: (input) => {
        const [room, setRoom] = createSignal(0)
        return node(
          "box",
          {
            flexDirection: "row",
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            onSizeChange(this: { width: number }) {
              const measured = this.width
              queueMicrotask(() => setRoom(measured))
            },
          },
          [
            () =>
              input.sessionID && context.data.session.status(input.sessionID) === "running"
                ? text([{ text: "[⋯]", color: BUSY_GREY }], { marginLeft: 1 })
                : statusline(context, input.sessionID, room()),
          ],
        )
      },
    })

    return () => {
      release()
    }
  },
})
