# matrix-spinner

A mod for Claude Code that replaces the working spinner with a matrix-style one. Characters scramble, the verb settles out of them, a gleam sweeps across, and a readout follows, like `(14s · ↓ 801 tokens · thought for 3s)`. A light Claude Code theme uses the light colours; any other theme uses the dark ones.

## Install

At the prompt of a terminal session:

```
/plugin install matrix-spinner --marketplace SyntaxAsSpiral/claude-matrix-spinner
```

From a shell:

```
claude plugin install matrix-spinner --marketplace SyntaxAsSpiral/claude-matrix-spinner
```

Answer `y` to add the marketplace, then choose a scope.

## What you see

- The verb is the one Claude Code is showing for the turn, until the model sets one.
- The readout shows elapsed time, a token count once the turn has produced any, and `thinking` while the model is thinking. After a thought of at least a second it shows `thought for` for three seconds, then its letters scramble into random glyphs and drop away, and the rest of the readout slides left to close the gap.
- On anything other than the terminal, or while Claude Code is showing a state message, the usual spinner stays.

## The one setting

`longThinkSeconds`, in the `/config` menu, is how long one stretch of thinking must last before the model is asked to set a verb. The default is 10 seconds. `0` turns that off.

## The status tool

The mod's own tool is `status`, exposed as `mcp__matrix-spinner__status`. A short text sets the verb for the rest of the turn; empty text leaves it unchanged. The tool's description says the model may call it whenever a fresh word fits, not only after a long think. Nothing in the system prompt asks for the call. After a stretch that reaches `longThinkSeconds`, one tool result carries a note asking the model to call it. The mod answers only its own `status` tool, and never answers or replaces any other tool.

The point is that the model picks the verb itself, from what it is doing at that moment ("Weaving tehtar", "Racing the mod"), so the word is about the work and is not drawn from a fixed list. The text is capped at 48 characters, and a new verb restarts the gleam. A verb lasts only for the turn: the next turn starts again from the engine's own verb, and the mod reads and writes none of Claude Code's verb settings. Each call leaves its usual tool row in the transcript, `matrix-spinner - status (MCP)`, which is the record of the verbs the model chose. The mod leaves that row as it is.

## Privacy

It sends nothing and makes no network requests. Session state holds one label for the turn, cleared when the turn ends. See [PRIVACY.md](PRIVACY.md).

## Credit and licence

MIT. The animation is derived from [charmbracelet/mods](https://github.com/charmbracelet/mods), copyright Charmbracelet, Inc. Their notice is in `LICENSE`. This project is not affiliated with Charm.
