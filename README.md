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
- The readout shows elapsed time, a token count once the turn has produced any, and `thinking` while the model is thinking. After a thought of at least a second it shows `thought for` for a short while.
- On anything other than the terminal, or while Claude Code is showing a state message, the usual spinner stays.

## The one setting

`longThinkSeconds`, in the `/config` menu, is how long one stretch of thinking must last before the model is asked to set a verb. The default is 10 seconds. `0` turns that off.

## The status tool

The mod's own tool is `status`, exposed as `mcp__matrix-spinner__status`. A short text sets the verb for the rest of the turn; empty text leaves it unchanged. The tool's description says the model may call it whenever a fresh word fits, not only after a long think. Nothing in the system prompt asks for the call. After a stretch that reaches `longThinkSeconds`, one tool result carries a note asking the model to call it. The mod answers only its own `status` tool, and never answers or replaces any other tool.

## Privacy

It sends nothing and makes no network requests. Session state holds one label for the turn, cleared when the turn ends. See [PRIVACY.md](PRIVACY.md).

## Credit and licence

MIT. The animation is derived from [charmbracelet/mods](https://github.com/charmbracelet/mods), copyright Charmbracelet, Inc. Their notice is in `LICENSE`. This project is not affiliated with Charm.
