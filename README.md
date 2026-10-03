<div align="center">

# 🧩 opencode-plugins

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![opencode](https://img.shields.io/badge/opencode-TUI%20plugins-F97316?style=flat-square)](https://opencode.ai)
[![MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)

**A small collection of opencode plugins by kud.**

</div>

---

The opencode counterpart of [kud/claude-plugins](https://github.com/kud/claude-plugins). Each plugin is a single TypeScript file you download, name in your opencode config, and forget about. There is no package to install, no build step and no registry in the way.

## Features

- **One file per plugin.** Read the whole thing in a sitting, copy it, tweak it.
- **Loaded as-is.** opencode runs the `.ts` directly: nothing to compile, bundle or publish.
- **Typechecked.** Every plugin is checked against the real `@opencode-ai/plugin` and `@opentui/solid` types, so API drift shows up here before it shows up in your terminal.
- **Easy to switch off.** Each plugin registers under its own ID, so a single `plugin_enabled` entry turns it off without touching the rest of your setup.
- **Small and focused.** Plugins do one job and leave the rest of opencode alone.

## Plugins

| Plugin                             | Kind | What it does                                                                         |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [quiet-home](./plugins/quiet-home) | TUI  | The home screen laid out like a session: logo top left, prompt docked at the bottom. |

## Install

Installation differs by plugin kind (TUI plugins go in `tui.json`, server plugins in `opencode.json`), so each plugin documents its own. For quiet-home, follow [plugins/quiet-home/README.md](./plugins/quiet-home/README.md).

## Development

```sh
git clone https://github.com/kud/opencode-plugins.git
cd opencode-plugins
npm install
npm run typecheck
```

`typecheck` runs `tsc --noEmit` and is the only script: there is no build, no test suite and nothing to publish. Plugins live under `plugins/<name>/` as a single `.ts` file with its own README.

## License

MIT © [kud](https://github.com/kud)
