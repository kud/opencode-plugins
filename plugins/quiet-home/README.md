# quiet-home

opencode's home screen, laid out like a session. The prompt sits docked at the bottom, where it stays once the conversation starts, and the opencode logo sits at the top left, where the first message will land, with the name and version beside it. Starting a session then moves nothing but the header.

No tips, no footer, no model line: the statusline and the prompt already carry those.

## Install

A TUI plugin, so it goes in `~/.config/opencode/tui.json`, not `opencode.json`. Name the package, pinned to a version, and switch off the two built-in home blocks it replaces:

```json
{
  "plugin": ["@kud/opencode-quiet-home@0.1.0"],
  "plugin_enabled": {
    "internal:home-tips": false,
    "internal:home-footer": false
  }
}
```

opencode installs it with Bun on the next start. To upgrade, bump the version in that line.

### Without npm

The plugin is a single file, so you can also download it somewhere **outside** `~/.config/opencode/plugin/` and `plugins/` (opencode loads everything there as a server plugin and would hand this one the wrong API):

```sh
mkdir -p ~/.config/opencode/tui
curl -fsSL -o ~/.config/opencode/tui/quiet-home.ts \
  https://raw.githubusercontent.com/kud/opencode-plugins/main/plugins/quiet-home/quiet-home.ts
```

Then use its absolute path in place of the package name: `"plugin": ["/Users/you/.config/opencode/tui/quiet-home.ts"]`, with the same `plugin_enabled` block.

Either way there is no build step: the plugin is written without JSX, so opencode loads the `.ts` as-is.

## Turning it off

Set `"kud.quiet-home": false` under `plugin_enabled`.

## Compatibility

Written against opencode 1.18. It mirrors the session route's padding and copies opencode's logo glyphs, so a layout change upstream may need a matching tweak here.
