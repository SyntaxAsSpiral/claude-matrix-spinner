# Privacy

matrix-spinner does not send any data about you.

- It reads the model's streamed output in memory, to count characters for the token readout and to time thinking. That timing is shown on the readout and, after a long stretch, arms one note on the next tool result. The counts stay in memory and are reset when the next turn starts.
- Session state also holds the list of verbs the model has set this session, each with the time it was set, up to the last 500, so `/verbs` can print them. It is in memory only, is never written to a file, and ends with the session.
- Session state holds one label for the turn. At the start of the turn the label is `Working`; once the model sets a verb, the label is that verb. It is cleared when the turn ends. It is not written to a file and does not leave the session.
- It makes no network requests.
- It reads and writes no files, and starts no processes.
- It uses its own `longThinkSeconds` option, passed into `register`. Once a turn it calls `$.config.list()` and uses only the `theme` value, to choose light or dark colours. It writes no setting, uses no other config row, and reads no environment variables.
- It has no analytics or telemetry.

## What code runs

The code that runs is `hooks/register.tsx`, named in `hooks/hooks.json`. Its engine calls are `$.clock.now`, `$.clock.every`, `$.ui.resolve`, `$.ui.blit`, `$.tool.register`, `$.command.register`, and `$.config.list()`. `$.command.register` adds one slash command, `/verbs`, answered by a `command.run` hook that only reads the verb list. `$.tool.register` adds one tool, `status`, exposed as `mcp__matrix-spinner__status`. The session label is held with the engine's `atom`, `read` and `update` helpers. It also hooks the engine's `tool.call` event for every tool, only to answer its own `status` tool and, once after a long think, to add the note to one other tool's result. For any other tool it reads the tool's name and, to keep them intact, the result's `deny` and `context` fields; it reads nothing from the tool's input or output, and the call passes through unchanged. `$.config.list()` runs once a turn and only `theme` is used. `longThinkSeconds` comes from the options passed to `register`, not from that list. It also hooks `ui.render` on tool rows and results, only to draw its own `status` tool's row in short form; for any other tool it passes the row through untouched, and it reads only the `status` call's `text`. It declares no MCP servers, runs no shell commands, and runs no other code.

A non-empty text passed to the tool sets the spinner verb. The tool's description says the model may call it whenever a fresh word fits. After a long stretch of thinking, the next tool result gets one note asking the model to call it. The note is in `hooks/register.tsx` and is described in the README.
