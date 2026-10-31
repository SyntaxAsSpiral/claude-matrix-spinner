# matrix-spinner

A mod for Claude Code that replaces the working spinner with a matrix-style one: ten scrambling characters, then the spinner word resolving out of the scramble, then a pulsing ellipsis. A white gleam sweeps right to left across the scramble when a turn starts and again whenever the word changes.

The effect is a port of the spinner in [charmbracelet/mods](https://github.com/charmbracelet/mods) (`anim.go`, MIT), re-implemented for Claude Code's mod API at "fanciness 10". It is drawn as a terminal `Raster` and repainted with `$.ui.blit`, so frames skip a full redraw.

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

## What it shows

- The spinner word is the one Claude Code itself picked for the turn, so it follows your `spinnerVerbs` setting.
- The mod also registers a tool, `mcp__matrix-spinner__status`, that takes a short text. If the model calls it, that text replaces the word and the gleam plays again. Nothing in the mod asks the model to call it.
- Terminal only. On other surfaces, or while the engine shows a state message of its own, the usual spinner is drawn.

## Colours

A `Raster` takes plain RGB, so the colours are fixed and do not follow your theme. They are constants at the top of `hooks/register.tsx`:

- `ORANGE`: the scramble, `#f6c177` (Rosé Pine gold).
- `TEXT`: the message, `#f5e0dc` (Catppuccin Mocha rosewater).
- `GLEAM`: the gleam, `#ffffff`.

Other knobs there: `N` (scramble length), `FRAME_MS` (frame time), `GLINT_FRAMES` (frames per character the gleam moves).

## Credit and licence

MIT. The animation is derived from [charmbracelet/mods](https://github.com/charmbracelet/mods), copyright Charmbracelet, Inc., MIT. Their notice is kept in `LICENSE`. This project is not affiliated with Charm.
