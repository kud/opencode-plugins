/**
 * A statusline in the prompt's footer row:
 *
 *   ~/Projects/site ⎇  main ◈ GitHub Copilot ✻ Claude Sonnet 5                 ✦ Fix the prompt bar colour
 *
 * opencode draws its own path and branch inside `prompt.footer.status`, sharing the row with
 * the busy indicator, and offers no slot for the path alone. So this replaces the whole slot:
 * the statusline when idle, opencode's own block scanner while a turn runs, which keeps the path
 * on screen once. The scanner takes the theme's border colour: plugins cannot see the current
 * agent, so it never tints to the agent the way opencode's own does. Lost with the slot: the
 * "press esc again" interrupt hint and the "(new worktree)" progress line.
 *
 * opencode's `animations` setting is not exposed to plugins, so the plugin takes its own: pass
 * `{ "animations": false }` as options to get opencode's still mark `[⋯]` instead.
 *
 * Narrow panes drop parts in a fixed order: the title shortens first, then provider, model and
 * branch go; the path always stays.
 *
 * Breaks the footer → add "-kud.statusline" to plugins in cli.json.
 *
 * Written without JSX so opencode loads the .ts as-is: no Solid transform, no build step.
 */

import { Plugin } from "@opencode/plugin/tui"
import { RGBA } from "@opentui/core"
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

/**
 * opencode's busy scanner (packages/tui/src/ui/spinner.ts, called with style "blocks",
 * inactiveFactor 0.6 and minAlpha 0.3), narrowed to those settings: eight cells, a lead
 * with a six-step trail sweeping out and back, holding 9 frames at the far end and 30 at home.
 */
const SCAN_WIDTH = 8
const SCAN_HOLD_END = 9
const SCAN_HOLD_START = 30
const SCAN_TRAIL = 6
const SCAN_INACTIVE_ALPHA = 0.6
const SCAN_MIN_ALPHA = 0.3
const SCAN_FRAMES = SCAN_WIDTH + SCAN_HOLD_END + (SCAN_WIDTH - 1) + SCAN_HOLD_START

type Progress = { progress: number; total: number }
type ScanState = { lead: number; forward: boolean; hold?: Progress; move?: Progress }

const scanState = (frame: number): ScanState => {
  const back = frame - SCAN_WIDTH - SCAN_HOLD_END
  if (frame < SCAN_WIDTH) return { lead: frame, forward: true, move: { progress: frame, total: SCAN_WIDTH } }
  if (back < 0) return { lead: SCAN_WIDTH - 1, forward: true, hold: { progress: frame - SCAN_WIDTH, total: SCAN_HOLD_END } }
  if (back < SCAN_WIDTH - 1) return { lead: SCAN_WIDTH - 2 - back, forward: false, move: { progress: back, total: SCAN_WIDTH - 1 } }
  return { lead: 0, forward: false, hold: { progress: back - (SCAN_WIDTH - 1), total: SCAN_HOLD_START } }
}

/** Trail step lighting a cell: 0 is the lead, -1 or past the trail is unlit. */
const trailStep = (state: ScanState, cell: number): number => {
  const behind = state.forward ? state.lead - cell : cell - state.lead
  if (state.hold) return behind + state.hold.progress
  return behind >= 0 && behind < SCAN_TRAIL ? behind : -1
}

const isLit = (step: number) => step >= 0 && step < SCAN_TRAIL

const scanFrames = (): string[] =>
  Array.from({ length: SCAN_FRAMES }, (_, frame) =>
    Array.from({ length: SCAN_WIDTH }, (_, cell) => (isLit(trailStep(scanState(frame), cell)) ? "■" : "⬝")).join(""),
  )

/** Unlit cells fade out while the scanner rests and back in as it moves. */
const unlitFade = ({ hold, move }: ScanState): number =>
  hold
    ? Math.max(SCAN_MIN_ALPHA, 1 - Math.min(hold.progress / hold.total, 1) * (1 - SCAN_MIN_ALPHA))
    : SCAN_MIN_ALPHA + Math.min(move!.progress / Math.max(1, move!.total - 1), 1) * (1 - SCAN_MIN_ALPHA)

const scanColors = (color: RGBA) => {
  const trail = Array.from({ length: SCAN_TRAIL }, (_, step) => {
    const bloom = step === 1 ? 1.15 : 1
    const alpha = step === 0 ? 1 : step === 1 ? 0.9 : Math.pow(0.65, step - 1)
    return RGBA.fromValues(Math.min(1, color.r * bloom), Math.min(1, color.g * bloom), Math.min(1, color.b * bloom), alpha)
  })
  return (frame: number, cell: number): RGBA => {
    const state = scanState(frame)
    const step = trailStep(state, cell)
    return isLit(step) ? trail[step]! : RGBA.fromValues(color.r, color.g, color.b, SCAN_INACTIVE_ALPHA * unlitFade(state))
  }
}

const busyMark = (context: Context): JSX.Element =>
  context.options.animations === false
    ? text([{ text: "[⋯]", color: BUSY_GREY }], { marginLeft: 1 })
    : node("spinner", { marginLeft: 1, frames: scanFrames(), color: scanColors(context.theme.border.base), interval: 40 })

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
                ? busyMark(context)
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
