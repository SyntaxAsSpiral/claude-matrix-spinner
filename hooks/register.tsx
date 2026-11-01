import type { Register } from 'claude-code'

// A port of charmbracelet/mods anim.go at fanciness 10, painted as a Raster
// and repainted with $.ui.blit so each frame skips a full redraw.
const N = 6
const FRAME_MS = 45 // 22 fps, the speed of the original in charmbracelet/mods
const DOTS_MS = 350
const DOTS_DELAY_MS = 0 // dots start the moment the last letter lands
const GLINT_HALF = 3 // the gleam is 7 characters wide
const GLINT_FRAMES = 1 // frames per character the gleam moves
const PULSE_FRAMES = 8 // frames the line stays lit, then dark, in the flash
const CHARS = '0123456789abcdefABCDEF~!@#$£€%^&*()+=_'
const DEFAULT_LABEL = 'Working'
const MAX_DOTS = 3
const PREFIX = 2 // the mark and a space before the scramble
const MARK = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'] // Claude Code's own spinner mark, grown and shrunk
const THOUGHT_SHOW_MS = 3000 // how long 'thought for' stays after thinking ends
const THOUGHT_OUT_MS = 900 // then its letters scramble and drop out over this long
const MARK_FRAMES = 4 // frames per step of the mark
const TIMER_W = 56 // room for ' (59m 59s · ↓ 99.9k tokens · thought for 59m 59s)'
const KEY = 'matrix'
const DEFAULT = 0x01000000 // the terminal's own foreground
// RGB is fixed, so a light terminal needs its own set: darker, with a deep gleam, since white would vanish
const PALETTES = {
  dark: { orange: 0xf6c177, text: 0xf5e0dc, gleam: 0xffffff, textGleam: 0xffffff, dim: 0x908caa }, // Rose Pine gold, Mocha rosewater, white, Rose Pine subtle
  light: { orange: 0xc2540a, text: 0x1c1c24, gleam: 0x1e2030, textGleam: 0x383b50, dim: 0x6c6f85 }, // burnt orange, near black, Macchiato mantle (the mark and scramble), a lifted near black (the verb, a quiet flicker like dark's), Latte subtext0
}
let ORANGE = PALETTES.dark.orange // the mark and the scramble
let TEXT = PALETTES.dark.text // the verb
let GLEAM = PALETTES.dark.gleam // the gleam and flash over the mark and the scramble
let TEXT_GLEAM = PALETTES.dark.textGleam // the same over the verb, kept close to TEXT so it only flickers
let DIM = PALETTES.dark.dim // the readout

const rnd = (n: number) => Math.floor(Math.random() * n)
const STEPS = 12 // the verb's letters land after up to this many 60 ms steps
const STEP_MS = 60
const JITTER = 0.05 // how much of the landing time is random rather than a wave
const SETTLE_FLASH_MS = 100 // a letter lights up for this long as it lands
const delay = () => rnd(STEPS) * STEP_MS
// the verb settles in a sine wave along its letters, with a little randomness mixed in
const waveDelay = (k: number) => (1 - JITTER) * ((Math.sin(k * 0.9) + 1) / 2) * (STEPS - 1) * STEP_MS + JITTER * delay()
const lerp = (a: number, b: number, t: number) => {
  const f = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t)
  return (f(16) << 16) | (f(8) << 8) | f(0)
}
const randChar = () => CHARS[rnd(CHARS.length)]

let timer: { cancel: () => void } | null = null
let secsTimer: { cancel: () => void } | null = null
let active = false // a turn is running; the spinner draws only then
let startedAt = 0
let mainTurn = '' // the turn whose steps are counted; a subagent's are not
let outTokens = 0 // output tokens of finished steps, as the API reported them
let stepChars = 0 // characters streamed in the step under way, for a live estimate
let lastThoughtMs = 0 // how long the latest stretch of thinking took
let thoughtUntil = 0 // 'thought for' is shown until then
let thinkFrom = -1 // when the current stretch of thinking began, or -1
let stepStart = 0 // when the current step began
let thoughtThisStep = false
let isThinking = false
let elapsed = 0 // whole seconds into the turn
let tick = 0
let glintTick = 0 // frames since the gleam last started
let gleamCount = 0 // sweeps finished this turn; the gleam bounces, so odd ones run left to right
let sweepDone = false
let site = ''
let columns = 0
let label = ' ' + DEFAULT_LABEL
let delays: number[] = []
let labelStart = 0
let settledAt = 0
let cycle: number[] = []

// A Raster cell must be one printable width-1 BMP character: drop combining marks and
// control/format characters, and put '?' where a character is wide or beyond the BMP.
function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6)
  )
}

function clean(text: string): string {
  // NFKC turns full-width forms into single-width ones; the katakana middle dot becomes a plain dot
  // an alchemical glyph is beyond the BMP, so a Raster cell shows a lookalike, ☿, in its place
  const flat = text.replace(/[\u{1F700}-\u{1F77F}]/gu, '\u263f').normalize('NFKC').replace(/\u30fb/g, '\u00b7')
  let out = ''
  for (const ch of flat) {
    const cp = ch.codePointAt(0) ?? 63
    if (/[\p{M}\p{C}]/u.test(ch)) continue
    out += cp > 0xffff || isWide(cp) ? '?' : ch
  }
  return out
}

// a verb may open with an alchemical glyph; it is drawn as plain text beside the Raster
function split(raw: string): { glyph: string; text: string } {
  const m = raw.match(/^([\u{1F700}-\u{1F77F}])\s*/u)
  return m ? { glyph: m[1], text: raw.slice(m[0].length) } : { glyph: '', text: raw }
}

function reset(text: string, now: number) {
  label = ' ' + clean(text)
  delays = [...label].map((_, k) => waveDelay(k))
  labelStart = now
  settledAt = 0
}

function restartGleam() {
  glintTick = 0
  sweepDone = false
}

function pack(chars: string[], colors: number[]): string {
  const words = new Uint32Array(columns * 3)
  for (let i = 0; i < columns; i++) {
    words[i * 3] = (chars[i] ?? ' ').codePointAt(0) ?? 32
    words[i * 3 + 1] = colors[i] ?? TEXT
    words[i * 3 + 2] = DEFAULT
  }
  return (new Uint8Array(words.buffer) as any).toBase64()
}

function compose(now: number, lit: number, flash: boolean): string {
  const chars: string[] = []
  const colors: number[] = []
  const hit = (i: number) => Math.abs(i - lit) <= GLINT_HALF
  chars.push(MARK[Math.floor(tick / MARK_FRAMES) % MARK.length], ' ')
  colors.push(hit(0) || flash ? GLEAM : ORANGE, ORANGE)
  cycle.forEach((d, i) => {
    chars.push(now < d ? '.' : randChar())
    colors.push(hit(PREFIX + i) || flash ? GLEAM : ORANGE)
  })
  const text = [...label]
  let settled = 0
  text.forEach((c, i) => {
    const isSettled = now >= labelStart + delays[i]
    if (isSettled) settled += 1
    chars.push(isSettled ? c : randChar())
    const landed = now - (labelStart + delays[i])
    const base = hit(PREFIX + N + i) || flash ? TEXT_GLEAM : TEXT
    colors.push(isSettled && landed < SETTLE_FLASH_MS ? lerp(base, TEXT_GLEAM, 1 - landed / SETTLE_FLASH_MS) : base)
  })
  if (settled === text.length && settledAt === 0) settledAt = now
  if (settledAt !== 0 && now - settledAt > DOTS_DELAY_MS) {
    const dots = Math.floor((now - settledAt - DOTS_DELAY_MS) / DOTS_MS) % (MAX_DOTS + 1)
    for (let k = 0; k < dots; k++) {
      colors[chars.length] = hit(chars.length) || flash ? TEXT_GLEAM : TEXT
      chars.push('.')
    }
  }
  while (chars.length < PREFIX + N + text.length + MAX_DOTS) chars.push(' ')
  const meta = readout(now)
  const put = (c: string) => {
    colors[chars.length] = DIM
    chars.push(c)
  }
  for (const c of meta.head) put(c)
  // 'thought for' scrambles out: each letter turns to a random glyph, then drops out at its own moment,
  // and what follows slides left to close the gap
  ;[...meta.seg].forEach((c, j) => {
    if (meta.out > 0) {
      const r = Math.sin((j + 1) * 12.9898 + thoughtUntil * 0.001) * 43758.5453 // a steady pseudo-random per letter
      const exitAt = 0.4 + 0.6 * (r - Math.floor(r))
      if (meta.out >= exitAt) return
      put(c === ' ' ? c : randChar())
    } else put(c)
  })
  for (const c of meta.tail) put(c)
  return pack(chars, colors)
}

function closeThinking(now: number) {
  if (thinkFrom >= 0) {
    lastThoughtMs = now - thinkFrom
    thoughtUntil = now + THOUGHT_SHOW_MS
  }
  thinkFrom = -1
  isThinking = false
}

// Thinking is timed from the start of the step (or from its next thinking chunk) until
// something else arrives, since thinking can reach the mod in one piece.
function observe(chunk: { kind: string; text?: string; json?: string }) {
  const now = tick * FRAME_MS
  if (chunk.kind === 'thinking') {
    if (thinkFrom < 0) thinkFrom = thoughtThisStep ? now : stepStart
    thoughtThisStep = true
    isThinking = true
    stepChars += chunk.text?.length ?? 0
    return
  }
  if (isThinking) closeThinking(now)
  if (chunk.kind === 'text') stepChars += chunk.text?.length ?? 0
  if (chunk.kind === 'input') stepChars += chunk.json?.length ?? 0
}

function beginStep() {
  stepStart = tick * FRAME_MS
  thoughtThisStep = false
}

function endStep(tokens: number | undefined) {
  closeThinking(tick * FRAME_MS)
  outTokens += tokens ?? Math.round(stepChars / 4)
  stepChars = 0
}

export const clockText = (secs: number) => (secs < 60 ? secs + 's' : Math.floor(secs / 60) + 'm ' + (secs % 60) + 's')

const tokenText = (n: number) => (n < 1000 ? String(n) : (n / 1000).toFixed(1) + 'k')

// head and tail are the readout around its 'thought for' segment (seg); out runs 0..1 as the segment scrambles away
function readout(now: number): { head: string; seg: string; tail: string; out: number } {
  let meta = clockText(elapsed)
  const tokens = outTokens + Math.round(stepChars / 4)
  if (tokens > 0) meta += ' · ↓ ' + tokenText(tokens) + ' tokens'
  let seg = ''
  let out = 0
  // like the default: 'thinking' while it is under way, then 'thought for 5s' for a few seconds, then it scrambles away
  if (isThinking) meta += ' · thinking'
  else if (now < thoughtUntil + THOUGHT_OUT_MS && lastThoughtMs >= 1000) {
    seg = ' · thought for ' + clockText(Math.floor(lastThoughtMs / 1000))
    out = Math.max(0, (now - thoughtUntil) / THOUGHT_OUT_MS)
  }
  return { head: ' (' + meta, seg, tail: ')', out }
}

function step($: any) {
  if (site === '') return
  tick += 1
  const now = tick * FRAME_MS
  // the gleam crosses the line right to left, then the whole line flashes until the next message
  glintTick += 1
  // one pass crosses the scramble, the message and its dots, right to left
  const last = PREFIX + N + [...label].length + MAX_DOTS - 1
  const sweep = (last + 2 * GLINT_HALF + 2) * GLINT_FRAMES
  const phase = glintTick // one pass, then the line flashes until the verb changes or the turn ends
  const inSweep = phase < sweep
  if (!inSweep && !sweepDone) {
    sweepDone = true
    gleamCount += 1
  }
  const travel = Math.floor(phase / GLINT_FRAMES)
  const isLeftToRight = gleamCount % 2 === 1 // bounce: each sweep runs against the last
  const lit = !inSweep ? -99 : isLeftToRight ? -GLINT_HALF - 1 + travel : last + GLINT_HALF - travel
  const flash = !inSweep && Math.floor((phase - sweep) / PULSE_FRAMES) % 2 === 0
  void $.ui.blit({ requestId: site, key: KEY, columns, rows: 1, cells: compose(now, lit, flash) })
}

async function tickSecs($: any) {
  elapsed = Math.max(0, Math.floor(((await $.clock.now()) - startedAt) / 1000))
}

function stop() {
  timer?.cancel()
  timer = null
  secsTimer?.cancel()
  secsTimer = null
  site = ''
}

function usePalette(isLight: boolean) {
  const p = isLight ? PALETTES.light : PALETTES.dark
  ORANGE = p.orange
  TEXT = p.text
  GLEAM = p.gleam
  TEXT_GLEAM = p.textGleam
  DIM = p.dim
}

export const register: Register = (on) => {
  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    stop()
    // Claude Code's own theme picks the colours, read once a turn and never written; the
    // terminal is not looked at, so the 'auto' theme and anything unreadable count as dark
    let isLight = false
    try {
      const row = (await $.config.list()).find(r => r.key === 'theme')
      isLight = /light/i.test(String(row?.value ?? ''))
    } catch {}
    usePalette(isLight)
    tick = 0
    gleamCount = 0
    restartGleam()
    active = true
    cycle = Array.from({ length: N }, delay)
    reset(DEFAULT_LABEL, 0)
    startedAt = await $.clock.now()
    elapsed = 0
    mainTurn = e.turnId
    outTokens = 0
    stepChars = 0
    lastThoughtMs = 0
    thoughtUntil = 0
    thinkFrom = -1
    isThinking = false
    thoughtThisStep = false
    timer = $.clock.every(FRAME_MS, () => step($))
    secsTimer = $.clock.every(1000, () => void tickSecs($))
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.turnId !== mainTurn) return yield* next(e)
    beginStep()
    const stream = next(e)
    for await (const chunk of stream) {
      observe(chunk as { kind: string; text?: string; json?: string })
      yield chunk
    }
    const result = await stream.result
    endStep(result?.usage?.output_tokens)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    stop()
    active = false
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    stop()
    active = false
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!active || e.props.message !== null || e.surface !== 'terminal') return next(e)
    const { Box, Raster, Text } = $.ui.resolve(e)
    // The word is whatever the chain passed in. A new one restarts the settle.
    const parts = split(e.props.word)
    const text = clean(parts.text)
    if (' ' + text !== label) {
      reset(text, tick * FRAME_MS)
      restartGleam()
    }
    columns = PREFIX + N + 1 + [...text].length + MAX_DOTS + TIMER_W
    site = e.requestId
    return (
      <Box paddingTop={1} flexDirection="row">
        {parts.glyph !== '' && <Text color={'#' + ORANGE.toString(16).padStart(6, '0')}>{parts.glyph + ' '}</Text>}
        <Raster key={KEY} columns={columns} rows={1} cells={compose(tick * FRAME_MS, -99, false)} />
      </Box>
    )
  })
}
