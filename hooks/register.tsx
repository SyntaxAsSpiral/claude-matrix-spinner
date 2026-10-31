import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Shape } from '../types'

// A port of charmbracelet/mods anim.go at fanciness 10, painted as a Raster
// and repainted with $.ui.blit so each frame skips a full redraw.
const N = 10
const FRAME_MS = 33 // 30 fps
const DOTS_MS = 333
const GLINT_HALF = 1 // the gleam is 3 characters wide
const GLINT_FRAMES = 3 // frames per character the gleam moves
const CHARS = '0123456789abcdefABCDEF~!@#$£€%^&*()+=_'
const DEFAULT_LABEL = 'Working'
const MAX_DOTS = 3
const KEY = 'matrix'
const ORANGE = 0xf6c177 // Rose Pine gold, the closest it has to orange
const DEFAULT = 0x01000000 // the terminal's own foreground
const TEXT = 0xf5e0dc // Catppuccin Mocha rosewater, the message's colour
const GLEAM = 0xffffff

const shapeAtom = atom({ plugin: 'matrix-spinner', key: 'shape' } as const, null)

const rnd = (n: number) => Math.floor(Math.random() * n)
const delay = () => rnd(8) * 60
const randChar = () => CHARS[rnd(CHARS.length)]

let timer: { cancel: () => void } | null = null
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

function reset(text: string, now: number) {
  label = ' ' + text
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

function compose(now: number, lit: number): string {
  const chars: string[] = []
  const colors: number[] = []
  const hit = (i: number) => Math.abs(i - lit) <= GLINT_HALF
  cycle.forEach((d, i) => {
    chars.push(now < d ? '.' : randChar())
    colors.push(hit(i) ? GLEAM : ORANGE)
  })
  const text = [...label]
  let settled = 0
  text.forEach((c, i) => {
    const isSettled = now >= labelStart + delays[i]
    if (isSettled) settled += 1
    chars.push(isSettled ? c : '.')
    colors.push(TEXT)
  })
  if (settled === text.length && settledAt === 0) settledAt = now
  if (settledAt !== 0 && now - settledAt > 220) {
    const dots = Math.floor((now - settledAt - 220) / DOTS_MS) % (MAX_DOTS + 1)
    for (let k = 0; k < dots; k++) {
      colors[chars.length] = TEXT
      chars.push('.')
    }
  }
  return pack(chars, colors)
}

function step($: any) {
  if (site === '') return
  tick += 1
  const now = tick * FRAME_MS
  // the gleam crosses the scramble only, right to left, and starts again with each new message
  glintTick += 1
  const lit = N + GLINT_HALF - Math.floor(glintTick / GLINT_FRAMES)
  void $.ui.blit({ requestId: site, key: KEY, columns, rows: 1, cells: compose(now, lit) })
}

function stop() {
  timer?.cancel()
  timer = null
  site = ''
}

export const register: Register = on => {
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
    const text = String(e.text ?? '').trim().slice(0, 48) || DEFAULT_LABEL
    reset(text, tick * FRAME_MS)
    glintTick = 0
    isCustom = true
    await update($, shapeAtom, (): Shape => ({ label: text }))
    return { result: 'ok' }
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
    timer = $.clock.every(FRAME_MS, () => step($))
    return next(e)
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
    const { Box, Raster } = $.ui.resolve(e)
    const text = isCustom ? shape.label : e.props.word
    if (' ' + text !== label) {
      reset(text, tick * FRAME_MS)
      glintTick = 0
    }
    columns = N + 1 + [...text].length + MAX_DOTS
    site = e.requestId
    return (
      <Box paddingTop={1}>
        <Raster key={KEY} columns={columns} rows={1} cells={compose(tick * FRAME_MS, 0)} />
      </Box>
    )
  })
}
