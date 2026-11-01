# matrix-spinner

A mod for Claude Code that replaces the working spinner with a matrix-style one. Claude Code's own spinner mark leads, then six scrambling characters, then the verb resolving out of the scramble, then an ellipsis that cycles, then a readout like `(14s · ↓ 801 tokens · thought for 3s)`.

The verb settles in a wave along its letters, each one a random character until it lands and then lighting up for a moment. When a turn starts or the verb changes, a gleam sweeps across the line, seven characters wide, and then the whole line flashes until the next change. The gleam bounces: each sweep runs the opposite way to the last, starting right to left at the start of every turn.

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

- **The verb** is the engine's own: whichever one Claude Code picks for the turn, from its default verbs or from your `spinnerVerbs`. The mod never reads or changes that setting, and it ships no verbs of its own.
- **A long think can earn a one-off verb.** If a single stretch of thinking reaches the `longThinkSeconds` setting (10 by default, 0 turns it off), the next tool result carries a hidden note asking the model to call the status tool once with a verb about what it is doing. That verb is shown, and the scramble and the gleam play again, until the turn ends. The next turn starts back on the engine's verb. It fires once per long think, and only where a tool call follows.
- **The readout** shows elapsed time (`14s`, then `1:05`), the output tokens of the turn (an estimate while streaming, exact once each step ends), and `thinking`, then `thought for 3s`, which holds for three seconds after thinking ends and then scrambles out, each letter turning to a random glyph and dropping away. Subagents are not counted.
- **A tool**, `mcp__matrix-spinner__status`, is the mod's own `status` tool. It takes a short text, sets the verb for the rest of the turn and plays the effect again; empty text changes nothing. The tool's own description tells the model it may call it whenever a fresh word fits, not only after a long think. Nothing in the system prompt asks the model to call it. The mod answers only its own `status` tool, exposed as `mcp__matrix-spinner__status`, and never answers or replaces any other tool. Other tools' results pass through `next()`, with only the long-think context note added.
- Terminal only. On other surfaces, or while the engine shows a state message of its own, the usual spinner is drawn.

Its one setting, `longThinkSeconds`, is in the `/config` menu. The mod sends nothing anywhere.

## Colours and knobs

A `Raster` takes plain RGB, so the colours do not follow your terminal's theme. There are two fixed sets, and Claude Code's selected theme picks between them at the start of each turn: any light theme (`light`, `light-daltonized`, `light-ansi`) gets the light set, anything else gets the dark one. The mod does not look at the terminal, so the `auto` theme, which Claude Code matches to the terminal itself, counts as dark. On a light theme the gleam is a deep Macchiato mantle over the mark and scramble and only a slight lift over the verb, which matches how the dark set's white barely moves the rosewater text; white would disappear, which would disappear. The sets are `PALETTES` at the top of `hooks/register.tsx`:

| | dark | light |
|---|---|---|
| `orange`, the mark and the scramble | `#f6c177` (Rosé Pine gold) | `#c2540a` (burnt orange) |
| `text`, the verb | `#f5e0dc` (Mocha rosewater) | `#1c1c24` (near black) |
| `gleam`, over the mark and the scramble | `#ffffff` | `#1e2030` (Macchiato mantle) |
| `textGleam`, over the verb | `#ffffff` | `#383b50` (a lifted near black) |
| `dim`, the readout | `#908caa` (Rosé Pine subtle) | `#6c6f85` (Latte subtext0) |

Other constants there: `N` (scramble length, 6), `FRAME_MS` (frame time), `GLINT_HALF` and `GLINT_FRAMES` (how wide the gleam is and how fast it moves), `STEPS`, `STEP_MS` and `JITTER` (when the letters land and how wavelike), `SETTLE_FLASH_MS` (how long a landed letter lights up), `DOTS_DELAY_MS` and `DOTS_MS` (the ellipsis), `PULSE_FRAMES` (flash speed), `THOUGHT_SHOW_MS` and `THOUGHT_OUT_MS` (how long `thought for` stays, then how long it takes to scramble out).

Characters the Raster cannot draw are adjusted: full-width forms become single-width, combining marks are dropped, and emoji or other wide characters show as `?`.

## Privacy and what runs

The mod collects and sends nothing. The only thing it stores is the current verb, kept in session state for the turn and cleared when the turn ends. It makes no network requests, and runs no code beyond `hooks/register.tsx`, which `hooks/hooks.json` declares as a hooks module. It declares no MCP servers. See [PRIVACY.md](PRIVACY.md) for the details.

## Credit and licence

MIT. The animation is derived from [charmbracelet/mods](https://github.com/charmbracelet/mods), copyright Charmbracelet, Inc., MIT. Their notice is kept in `LICENSE`. This project is not affiliated with Charm.
