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

Version 0.9.0 drops the status tool. The drawing is unchanged, and the mod still runs on its own.

## What you see

- The verb is the one Claude Code is showing for the turn. When the companion plugin gerunds is installed and has set a verb, that word is shown instead, and a new one restarts the scramble and the gleam.
- The readout shows elapsed time, a token count once the turn has produced any, and `thinking` while the model is thinking. After a thought of at least a second it shows `thought for` for three seconds, then its letters scramble into random glyphs and drop away, and the rest of the readout slides left to close the gap.
- On anything other than the terminal, or while Claude Code is showing a state message, the usual spinner stays.

## The companion

gerunds is a separate plugin. It is not required. It holds the tool `mcp__gerunds__status`, the long-think note, the `updated verb:` rows, and `/gerunds`. This plugin only reads the verb gerunds stores. Without gerunds, none of that is here, and the engine's own verb is what settles.

`plugin.json` lists gerunds under `dependencies` with no version, so the type contract is laid down when gerunds is present. That entry does not install gerunds and does not make it required.

## Privacy

It sends nothing and makes no network requests. See [PRIVACY.md](PRIVACY.md).

## Credit and licence

MIT. The animation is derived from [charmbracelet/mods](https://github.com/charmbracelet/mods), copyright Charmbracelet, Inc. Their notice is in `LICENSE`. This project is not affiliated with Charm.
