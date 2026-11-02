# matrix-spinner

<picture>
  <source media="(prefers-color-scheme: light)" srcset="docs/spinner-light.gif">
  <img src="docs/spinner-dark.gif" alt="The spinner: the verb settles out of the scramble, the gleam crosses, the readout says thinking, then 'thought for 3s' scrambles out.">
</picture>


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

## Privacy

It sends nothing and makes no network requests. See [PRIVACY.md](PRIVACY.md).

## Credit and licence

MIT. The animation is derived from [charmbracelet/mods](https://github.com/charmbracelet/mods), copyright Charmbracelet, Inc. Their notice is in `LICENSE`. This project is not affiliated with Charm.
