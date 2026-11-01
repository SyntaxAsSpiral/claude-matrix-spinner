# Privacy

matrix-spinner does not send any data about you.

- It reads the model's streamed output in memory, to count characters for the token readout and to time thinking. The counts stay in memory and are reset when the next turn starts. It does not ask the model to do anything with that timing.
- It reads one string from the gerunds plugin's session state, the current verb, when that plugin is installed. If gerunds is not installed, or the string is empty, the engine's own verb is used. It writes no session state of its own.
- It makes no network requests.
- It reads and writes no files, and starts no processes.
- Once a turn it calls `$.config.list()` and uses only the `theme` value, to choose light or dark colours. It writes no setting, uses no other config row, and reads no environment variables. It has no options of its own.
- It has no analytics or telemetry.

## What code runs

The code that runs is `hooks/register.tsx`, named in `hooks/hooks.json`. Its engine calls are `$.clock.now`, `$.clock.every`, `$.ui.resolve`, `$.ui.blit`, `$.config.list()`, and `$.state.get` for `gerunds.verb`. It declares no tools, no slash commands, and no MCP servers. It runs no shell commands and no other code. It does not hook `tool.call`.

The long-think note, the status tool, the verb list, and `/verbs` moved to the gerunds plugin. They are not in this code.
