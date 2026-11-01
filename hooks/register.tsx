import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Shape } from '../types'

// A port of charmbracelet/mods anim.go at fanciness 10, painted as a Raster
// and repainted with $.ui.blit so each frame skips a full redraw.
const N = 7
const FRAME_MS = 45 // 22 fps, the speed of the original in charmbracelet/mods
const DOTS_MS = 333
const GLINT_HALF = 1 // the gleam is 3 characters wide
const GLINT_FRAMES = 2 // frames per character the gleam moves
const PULSE_FRAMES = 5 // frames the line stays lit, then dark, in the flash
const CHARS = '0123456789abcdefABCDEF~!@#$£€%^&*()+=_'
const DEFAULT_LABEL = 'Working'
const MAX_DOTS = 3
const PREFIX = 2 // the mark and a space before the scramble
const MARK = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'] // Claude Code's own spinner mark, grown and shrunk
const THOUGHT_SHOW_MS = 4000 // how long 'thought for' stays after thinking ends
const LONG_THINK_SECONDS = 10 // default of the longThinkSeconds setting
const MARK_FRAMES = 4 // frames per step of the mark
const TIMER_W = 52 // room for ' (59:59 · ↓ 99.9k tokens · thought for 59:59)'
const DIM = 0x908caa // Rose Pine subtle
const KEY = 'matrix'
const ORANGE = 0xf6c177 // Rose Pine gold, the closest it has to orange
const DEFAULT = 0x01000000 // the terminal's own foreground
const TEXT = 0xf5e0dc // Catppuccin Mocha rosewater, the message's colour
const GLEAM = 0xffffff // one gleam and flash colour

const shapeAtom = atom({ plugin: 'matrix-spinner', key: 'shape' } as const, null)

const rnd = (n: number) => Math.floor(Math.random() * n)
const delay = () => rnd(8) * 60
const randChar = () => CHARS[rnd(CHARS.length)]

let timer: { cancel: () => void } | null = null
let secsTimer: { cancel: () => void } | null = null
let longThinkMs = LONG_THINK_SECONDS * 1000 // a stretch of thinking this long earns the model a nudge to pick a verb; 0 is off
let owedVerb = false // set after a long think; the next tool result carries a nudge
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
let isCustom = false // the model set this turn's word; else the engine's own (spinnerVerbs) shows
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
  delays = [...label].map(delay)
  labelStart = now
  settledAt = 0
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
    chars.push(isSettled ? c : '.')
    colors.push(hit(PREFIX + N + i) || flash ? GLEAM : TEXT)
  })
  if (settled === text.length && settledAt === 0) settledAt = now
  if (settledAt !== 0 && now - settledAt > 220) {
    const dots = Math.floor((now - settledAt - 220) / DOTS_MS) % (MAX_DOTS + 1)
    for (let k = 0; k < dots; k++) {
      colors[chars.length] = hit(chars.length) || flash ? GLEAM : TEXT
      chars.push('.')
    }
  }
  while (chars.length < PREFIX + N + text.length + MAX_DOTS) chars.push(' ')
  for (const c of readout(now)) {
    colors[chars.length] = DIM
    chars.push(c)
  }
  return pack(chars, colors)
}

function closeThinking(now: number) {
  if (thinkFrom >= 0) {
    lastThoughtMs = now - thinkFrom
    thoughtUntil = now + THOUGHT_SHOW_MS
    if (longThinkMs > 0 && lastThoughtMs >= longThinkMs) owedVerb = true
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

const clockText = (secs: number) =>
  secs < 60 ? secs + 's' : Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0')

const tokenText = (n: number) => (n < 1000 ? String(n) : (n / 1000).toFixed(1) + 'k')

function readout(now: number): string {
  let meta = clockText(elapsed)
  const tokens = outTokens + Math.round(stepChars / 4)
  if (tokens > 0) meta += ' · ↓ ' + tokenText(tokens) + ' tokens'
  // like the default: 'thinking' while it is under way, then 'thought for 5s' for a few seconds
  if (isThinking) meta += ' · thinking'
  else if (now < thoughtUntil && lastThoughtMs >= 1000) {
    meta += ' · thought for ' + clockText(Math.floor(lastThoughtMs / 1000))
  }
  return ' (' + meta + ')'
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
  const lit = inSweep ? last + GLINT_HALF - Math.floor(phase / GLINT_FRAMES) : -99
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

export const register: Register = (on, options) => {
  const seconds = Number(options.longThinkSeconds ?? LONG_THINK_SECONDS)
  longThinkMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0

  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'status',
      description:
        'Set the word shown beside the working spinner: one playful, creative gerund (e.g. "Reticulating", "Discombobulating", "Frolicking", "Enchanting"). Optional and cheap; call it whenever a fresh word fits, no punctuation.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string', maxLength: 48 } },
        required: ['text'],
      },
      isDeferred: false,
    })
    return next(e)
  })

  on('tool.call', { tool: 'mcp__matrix-spinner__status' }, async ($, e: any) => {
    const text = String(e.text ?? '').trim().slice(0, 48)
    if (text === '') return { result: 'ok' } // nothing to show: the engine's own verb stays
    reset(split(text).text, tick * FRAME_MS)
    glintTick = 0
    isCustom = true
    await update($, shapeAtom, (): Shape => ({ label: text }))
    return { result: 'ok' }
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'mcp__matrix-spinner__status') owedVerb = false
    const done = await next(e)
    if (!owedVerb || done.deny !== undefined) return done
    owedVerb = false
    return {
      ...done,
      context: [
        ...(done.context ?? []),
        'You just thought for a long while. Call mcp__matrix-spinner__status once, with one creative, expressive verb or short phrase about what you are doing now, then carry on.',
      ],
    }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    stop()
    tick = 0
    glintTick = 0
    isCustom = false
    cycle = Array.from({ length: N }, delay)
    reset(DEFAULT_LABEL, 0)
    await update($, shapeAtom, (): Shape => ({ label: DEFAULT_LABEL }))
    startedAt = await $.clock.now()
    elapsed = 0
    mainTurn = e.turnId
    owedVerb = false
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
    await update($, shapeAtom, () => null)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    stop()
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const shape = await read($, shapeAtom)
    if (shape === null || e.props.message !== null || e.surface !== 'terminal') return next(e)
    const { Box, Raster, Text } = $.ui.resolve(e)
    const parts = split(isCustom ? shape.label : e.props.word)
    const text = clean(parts.text)
    if (' ' + text !== label) {
      reset(text, tick * FRAME_MS)
      glintTick = 0
    }
    columns = PREFIX + N + 1 + [...text].length + MAX_DOTS + TIMER_W
    site = e.requestId
    return (
      <Box paddingTop={1} flexDirection="row">
        {parts.glyph !== '' && <Text color="#f6c177">{parts.glyph + ' '}</Text>}
        <Raster key={KEY} columns={columns} rows={1} cells={compose(tick * FRAME_MS, -99, false)} />
      </Box>
    )
  })
}
