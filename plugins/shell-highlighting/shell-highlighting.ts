/**
 * Shell commands coloured in the theme's amber, in file views and in ```sh/```zsh fences alike.
 *
 * opencode maps .sh, .bash, .zsh and .ksh to its `bash` grammar, but
 * nvim-treesitter's stock query captures command names as @function.call, which opencode draws
 * in the plain variable colour. This re-registers `bash` with a local copy of that query, changed
 * on one line so commands draw in amber; bash-highlights.scm says why that capture name.
 *
 * Registered twice on purpose: addDefaultParsers covers a tree-sitter client that has not
 * started yet, addFiletypeParser one that already has. Either way it lands after opencode's own
 * registration, and a later parser for the same filetype replaces the earlier one.
 *
 * Breaks highlighting → add "-kud.shell-highlighting" to plugins in cli.json.
 */

import { Plugin } from "@opencode/plugin/tui"
import { addDefaultParsers, getTreeSitterClient } from "@opentui/core"
import { fileURLToPath } from "node:url"

const BASH_GRAMMAR = "https://github.com/tree-sitter/tree-sitter-bash/releases/download/v0.25.0/tree-sitter-bash.wasm"
const HIGHLIGHTS = fileURLToPath(new URL("./bash-highlights.scm", import.meta.url))

const BASH_PARSER = {
  filetype: "bash",
  aliases: ["sh", "zsh", "ksh", "shellscript"],
  wasm: BASH_GRAMMAR,
  queries: { highlights: [HIGHLIGHTS] },
}

export default Plugin.define({
  id: "kud.shell-highlighting",
  setup() {
    addDefaultParsers([BASH_PARSER])
    const client = getTreeSitterClient()
    void client
      .initialize()
      .then(() => client.addFiletypeParser(BASH_PARSER))
      .catch(() => {})
  },
})
