# matrix-spinner

A mod for Claude Code that replaces the working spinner with a matrix-style one. Claude Code's own spinner mark leads, then seven scrambling characters, then the verb resolving out of the scramble, then a pulsing ellipsis, then a readout like `(14s · ↓ 801 tokens · thought for 3s)`.

When a turn starts or the verb changes, a white gleam sweeps right to left across the line, and then the whole line flashes until the next change.

The effect is a port of the spinner in [charmbracelet/mods](https://github.com/charmbracelet/mods) (`anim.go`, MIT), re-implemented for Claude Code's mod API at its original 22 frames a second. It is drawn as a terminal `Raster` and repainted with `$.ui.blit`, so frames skip a full redraw.

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

- **The verb** starts as the one Claude Code picked for the turn. Every 10 seconds the mod swaps in a random one from your own `spinnerVerbs` setting, so the scramble and the gleam play again. With no `spinnerVerbs` set, it keeps the engine's verb.
- **Alchemical glyphs.** A verb that begins with an alchemical symbol (U+1F700 to U+1F77F), such as `🝞 Sublimating`, gets that symbol drawn in front as plain text, since the Raster cannot hold it.
- **The readout** shows elapsed time (`14s`, then `1:05`), the output tokens of the turn (an estimate while streaming, exact once each step ends), and `thinking`, then `thought for 3s` for a few seconds after thinking ends. Subagents are not counted.
- **A tool**, `mcp__matrix-spinner__status`, takes a short text. If the model calls it, that text replaces the verb and the effect plays again. Nothing in the mod asks the model to call it.
- Terminal only. On other surfaces, or while the engine shows a state message of its own, the usual spinner is drawn.

The mod reads your `spinnerVerbs` setting, read only, through Claude Code's settings API. It sends nothing anywhere.

## Colours and knobs

A `Raster` takes plain RGB, so the colours are fixed and do not follow your theme. They are constants at the top of `hooks/register.tsx`:

- `ORANGE`: the mark and the scramble, `#f6c177` (Rosé Pine gold).
- `TEXT`: the verb, `#f5e0dc` (Catppuccin Mocha rosewater).
- `GLEAM`: the gleam and the flash, `#ffffff`.

Other constants there: `N` (scramble length, 7), `FRAME_MS` (frame time), `GLINT_FRAMES` (how fast the gleam moves), `PULSE_FRAMES` (flash speed), `ROTATE_S` (seconds between verbs), `THOUGHT_SHOW_MS` (how long `thought for` stays).

Characters the Raster cannot draw are adjusted: full-width forms become single-width, combining marks are dropped, and emoji or other wide characters show as `?`.

## Credit and licence

MIT. The animation is derived from [charmbracelet/mods](https://github.com/charmbracelet/mods), copyright Charmbracelet, Inc., MIT. Their notice is kept in `LICENSE`. This project is not affiliated with Charm.
