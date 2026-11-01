# Privacy

matrix-spinner does not collect, store or send any data about you.

- It reads the model's streamed output in memory, only to count characters and time thinking for the readout. Those counters are cleared at the end of each turn.
- The only thing it keeps is a verb the model set this turn, as text in the session's own state, cleared when the turn ends. It is not written to a file and does not leave the session.
- It makes no network requests.
- It writes and reads no files, and starts no processes.
- It reads one setting of its own, `longThinkSeconds`, from the options passed to `register`. It reads Claude Code's `theme` once a turn, only to pick light or dark colours. It writes no setting. It reads no credentials, nothing else (not `spinnerVerbs`) and no environment variables.
- It has no analytics or telemetry.

## What code runs

All of the plugin's code is in `hooks/register.tsx`, which `hooks/hooks.json` declares as a hooks module. It runs inside Claude Code's mod runtime and uses only these engine calls: `$.clock.now`, `$.clock.every`, `$.ui.resolve`, `$.ui.blit`, `$.tool.register`, `$.state.get`, `$.state.set`, and `$.config.list()`. `$.clock.now` and `$.clock.every` are the timers. `$.ui.resolve` and `$.ui.blit` draw the spinner. `$.tool.register` registers one tool, `status`, exposed as `mcp__matrix-spinner__status`, which sets the spinner verb. `$.state.get` and `$.state.set` are the session's state, reached through `atom`, `read` and `update`. `$.config.list()` runs once a turn to read Claude Code's `theme` setting. From that list only the `theme` row is used, to pick light or dark colours. The plugin's own `longThinkSeconds` option, passed to `register`, is the only other setting used. It declares no MCP servers, runs no shell commands and executes no other code.

The one tool takes a short piece of text and shows it as the spinner verb. Its description tells the model it may call the tool whenever a fresh word fits, not only after a long think. After a long stretch of thinking, the plugin adds a note to the next tool result asking the model to call that tool; the note is in `hooks/register.tsx` and is described in the README.
