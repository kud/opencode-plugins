# quiet-home

opencode's home screen, laid out like a session. The prompt sits docked at the bottom, where it stays once the conversation starts, and the opencode logo sits at the top left, where the first message will land, with the name and version beside it. Starting a session then moves nothing but the header.

No tips, no footer, no model line: the statusline and the prompt already carry those.

## Install

A TUI plugin, so it goes in `tui.json`, not `opencode.json`. Download the file somewhere **outside** `~/.config/opencode/plugin/` and `plugins/` (opencode loads everything there as a server plugin and would hand this one the wrong API):

```sh
mkdir -p ~/.config/opencode/tui
curl -fsSL -o ~/.config/opencode/tui/quiet-home.ts \
  https://raw.githubusercontent.com/kud/opencode-plugins/main/plugins/quiet-home/quiet-home.ts
```

Then point `~/.config/opencode/tui.json` at it, and switch off the two built-in home blocks it replaces:

```json
{
  "plugin": ["/Users/you/.config/opencode/tui/quiet-home.ts"],
  "plugin_enabled": {
    "internal:home-tips": false,
    "internal:home-footer": false
  }
}
```

The path must be absolute. No build step: the plugin is written without JSX, so opencode loads the `.ts` as-is.

## Turning it off

Set `"kud.quiet-home": false` under `plugin_enabled`.

## Compatibility

Written against opencode 1.18. It mirrors the session route's padding and copies opencode's logo glyphs, so a layout change upstream may need a matching tweak here.
