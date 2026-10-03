/**
 * The home screen laid out exactly like a session: the prompt docked at the bottom where it
 * stays once the conversation starts, and the opencode logo at the top left where the first
 * message will appear, with its name and version beside it. Starting a session then moves nothing but the header.
 *
 * Tried first and dropped: skipping home entirely by creating a session on launch. It lost
 * the logo, which is the one thing worth keeping from home.
 *
 * No model line: the model in use lives in opencode's memory,
 * out of the plugin api's reach. config.model is only the startup default, and model.json
 * is a history (context/local.tsx at v1.18.33), so either would go stale on the first
 * switch. The prompt's own line, just below, is the one that tracks it.
 *
 * opencode centres home with two equal flexGrow spacers around the logo and prompt, and no
 * plugin can reach them. So the stock logo and prompt are blanked, and home_bottom draws an
 * absolutely positioned column over the whole screen with the session route's own padding
 * (2 left and right, 1 below, gap 1, and the 1-row spacer its scrollbox opens with;
 * routes/session/index.tsx at v1.18.33), holding the header and a new prompt.
 *
 * The logo is opencode's own glyph table (src/logo.ts), copied because the plugin api does
 * not expose the component, and drawn with the marks component/logo.tsx interprets: `_` a
 * shaded space, `^` a shaded upper half, `~` an upper half and `,` a lower half in shadow
 * colour. Its first row is not blank: it holds the ascender of the `d`.
 *
 * The tips and the path/MCP/version footer are opencode's own internal:home-tips and
 * internal:home-footer plugins, best switched off in tui.json's plugin_enabled.
 *
 * Breaks the home screen → set `"kud.quiet-home": false` in plugin_enabled.
 *
 * Lives outside ~/.config/opencode/plugin(s)/ on purpose: opencode loads everything there as a
 * SERVER plugin, and this default export would be handed the wrong api.
 *
 * Written without JSX so opencode can load the .ts as-is: no Solid transform, no build step.
 */

import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createElement, insert, setProp } from "@opentui/solid"
import { createComponent, type JSX } from "solid-js"

const LOGO = {
  left: ["                   ", "█▀▀█ █▀▀█ █▀▀█ █▀▀▄", "█__█ █__█ █^^^ █__█", "▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀~~▀"],
  right: ["             ▄     ", "█▀▀▀ █▀▀█ █▀▀█ █▀▀█", "█___ █__█ █__█ █^^^", "▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀"],
}

type Rgba = { r: number; g: number; b: number }

const hex = ({ r, g, b }: Rgba) =>
  "#" + [r, g, b].map((channel) => Math.round(channel * 255).toString(16).padStart(2, "0")).join("")

const blend = (from: Rgba, to: Rgba, amount: number): string =>
  hex({ r: from.r + (to.r - from.r) * amount, g: from.g + (to.g - from.g) * amount, b: from.b + (to.b - from.b) * amount })

const node = (tag: string, props: Record<string, unknown>, children: unknown[] = []) => {
  const element = createElement(tag)
  for (const [key, value] of Object.entries(props)) setProp(element, key, value)
  for (const child of children) insert(element, child as JSX.Element)
  return element
}

const logoHalf = (line: string, fg: Rgba, background: Rgba, bold: boolean) => {
  const shadow = blend(background, fg, 0.25)
  const colour = hex(fg)
  const attributes = bold ? 1 : 0
  const glyph = (char: string) => {
    if (char === "_") return node("text", { fg: colour, bg: shadow, attributes, selectable: false }, [" "])
    if (char === "^") return node("text", { fg: colour, bg: shadow, attributes, selectable: false }, ["▀"])
    if (char === "~") return node("text", { fg: shadow, attributes, selectable: false }, ["▀"])
    if (char === ",") return node("text", { fg: shadow, attributes, selectable: false }, ["▄"])
    return node("text", { fg: colour, attributes, selectable: false }, [char])
  }
  return node("box", { flexDirection: "row" }, Array.from(line).map(glyph))
}

const logo = (api: TuiPluginApi) => {
  const { textMuted, text, background } = api.theme.current
  return node(
    "box",
    { flexShrink: 0 },
    LOGO.left.map((line, index) =>
      node("box", { flexDirection: "row", gap: 1 }, [
        logoHalf(line, textMuted, background, false),
        logoHalf(LOGO.right[index], text, background, true),
      ]),
    ),
  )
}

// The mark with its name and version beside it, level with the letters rather than the ascender row.
// Nothing else: the path and branch are the statusline's, the model the prompt's.
const header = (api: TuiPluginApi) =>
  node("box", { flexDirection: "row", gap: 3, flexShrink: 0 }, [
    logo(api),
    node("box", { flexDirection: "row", gap: 1, paddingTop: 1 }, [
      node("text", { fg: hex(api.theme.current.primary), attributes: 1 }, ["OpenCode"]),
      node("text", { fg: hex(api.theme.current.textMuted) }, [`v${api.app.version}`]),
    ]),
  ])

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    slots: {
      home_logo: () => node("box", {}),
      home_prompt: () => node("box", {}),
      home_bottom: () =>
        node(
          "box",
          {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            paddingTop: 1,
            paddingLeft: 2,
            paddingRight: 2,
            paddingBottom: 1,
            gap: 1,
          },
          [
            header(api),
            node("box", { flexGrow: 1, minHeight: 0 }),
            node("box", { flexShrink: 0 }, [createComponent(api.ui.Prompt, { hint: node("text", {}) as unknown as JSX.Element })]),
          ],
        ),
    },
  })
}

export default { id: "kud.quiet-home", tui } satisfies TuiPluginModule
