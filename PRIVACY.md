# Privacy

matrix-spinner does not collect, store or send any data about you.

- It reads the model's streamed output in memory, only to count characters and time thinking for the readout. Those counters are cleared at the end of each turn.
- The only thing it keeps is a verb the model set this turn, as text in the session's own state, cleared when the turn ends. It is not written to a file and does not leave the session.
- It makes no network requests.
- It writes and reads no files, and starts no processes.
- It reads one setting of its own, `longThinkSeconds`, and Claude Code's `theme`, once a turn, only to pick light or dark colours. It writes no setting. It reads no credentials, nothing else (not `spinnerVerbs`) and no environment variables.
- It has no analytics or telemetry.

## What code runs

All of the plugin's code is in `hooks/register.tsx`, which `hooks/hooks.json` declares as a hooks module. It runs inside Claude Code's mod runtime and uses only these engine calls: timers (`clock`), drawing the spinner (`ui`), registering one tool, `mcp__matrix-spinner__status`, which sets the spinner verb, and the session's state. It declares no MCP servers, runs no shell commands and executes no other code.

The one tool takes a short piece of text and shows it as the spinner verb. After a long stretch of thinking, the plugin adds a note to the next tool result asking the model to call that tool; the note is in `hooks/register.tsx` and is described in the README.
