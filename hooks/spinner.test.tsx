import { expect, mock, test } from 'claude-code/testing'
import { clockText } from './register'

test('the spinner paints a Raster and blits frames', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const frames: string[] = []
  on('ui.blit', (_, e: any) => {
    const w = new Uint32Array((Uint8Array as any).fromBase64(e.cells).buffer)
    let s = ''
    for (let i = 0; i < w.length; i += 3) s += String.fromCodePoint(w[i])
    frames.push(s)
    return { value: {} }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })

  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'r',
    props: { word: 'Tracing the flake input', message: null, suffix: '…', mode: 'thinking' },
  })
  expect(await ui.find({ type: 'Raster' })).toBeTruthy()
  for (let i = 0; i < 60; i++) await clock.advance(45)
  for (const i of [0, 10, 20, 40, 59]) console.log(String(i).padStart(3), frames[i])
  expect(frames.length).toBeGreaterThan(50)
  expect(frames[59]).toMatch(/Tracing the flake input/)
  await ui.unmount()
})

test('wide and combining characters never reach the Raster', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't2' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'w',
    props: { word: 'Hi͡ っ 😀 ok', message: null, suffix: '…', mode: 'thinking' },
  })
  expect(await ui.find({ type: 'Raster' })).toBeTruthy()
  await ui.unmount()
})

test('the 🜏 marker becomes a lookalike in the Raster', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't3' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'm',
    props: { word: '🜏 Glyphweaving', message: null, suffix: '…', mode: 'thinking' },
  })
  expect(await ui.find({ type: 'Raster' })).toBeTruthy()
  await ui.unmount()
})

test('the real glyph is drawn as text beside the Raster', async ($, on) => {
  mock.clock(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't4' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'g',
    props: { word: '\u{1F75E} Sublimating', message: null, suffix: '…', mode: 'thinking' },
  })
  expect(await ui.find({ type: 'Raster' })).toBeTruthy()
  expect((await ui.find({ type: 'Text', text: /\u{1F75E}/u }))?.text).toContain('\u{1F75E}')
  await ui.unmount()
})

test('the readout counts tokens and thinking time', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const frames: string[] = []
  on('ui.blit', (_, e: any) => {
    const w = new Uint32Array((Uint8Array as any).fromBase64(e.cells).buffer)
    let s = ''
    for (let i = 0; i < w.length; i += 3) s += String.fromCodePoint(w[i])
    frames.push(s)
    return { value: {} }
  })
  on('turn.step', async function* (_, e: any) {
    yield { kind: 'thinking', index: 0, text: 'x'.repeat(400) }
    await clock.advance(3000)
    yield { kind: 'thinking', index: 0, text: 'x'.repeat(400) }
    yield { kind: 'text', index: 1, text: 'y'.repeat(800) }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: { output_tokens: 733, input_tokens: 0, model: 'm' } } as any
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't5' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'r',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
  })
  const run = $.turn.step({ turnId: 't5', index: 0, model: 'm', messageCount: 1 } as any)
  for await (const _ of run) {}
  await clock.advance(2000)
  console.log(frames[frames.length - 1]?.trim())
  expect(frames[frames.length - 1]).toMatch(/↓ 733 tokens/)
  expect(frames[frames.length - 1]).toMatch(/thought for/)
  await ui.unmount()
})

async function paintedColours($: any, on: any, theme: string) {
  on('config.list', () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme }] }) as any)
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const colours = new Set<number>()
  on('ui.blit', (_: any, e: any) => {
    const w = new Uint32Array((Uint8Array as any).fromBase64(e.cells).buffer)
    for (let i = 1; i < w.length; i += 3) colours.add(w[i])
    return { value: {} }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 'p1' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'p',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
  })
  return { colours, ui }
}

test('a light Claude Code theme gets the light palette', async ($, on) => {
  const clock = mock.clock(on)
  const { colours, ui } = await paintedColours($, on, 'light-daltonized')
  for (let i = 0; i < 40; i++) await clock.advance(45)
  expect(colours.has(0xc2540a)).toBe(true)
  expect(colours.has(0x1e2030)).toBe(true)
  expect(colours.has(0x383b50)).toBe(true)
  expect(colours.has(0xffffff)).toBe(false)
  expect(colours.has(0xf6c177)).toBe(false)
  await ui.unmount()
})

test('a dark theme and the auto theme get the dark palette', async ($, on) => {
  const clock = mock.clock(on)
  const { colours, ui } = await paintedColours($, on, 'auto')
  for (let i = 0; i < 40; i++) await clock.advance(45)
  expect(colours.has(0xf6c177)).toBe(true)
  expect(colours.has(0xffffff)).toBe(true)
  expect(colours.has(0xc2540a)).toBe(false)
  await ui.unmount()
})

async function framesOf($: any, on: any) {
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const frames: { chars: string; mark: number }[] = []
  on('ui.blit', (_: any, e: any) => {
    const w = new Uint32Array((Uint8Array as any).fromBase64(e.cells).buffer)
    let chars = ''
    for (let i = 0; i < w.length; i += 3) chars += String.fromCodePoint(w[i])
    frames.push({ chars, mark: w[1] })
    return { value: {} }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 'f1' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'f',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
  })
  return { frames, ui }
}

test('letters that have not landed are scrambled, never dots', async ($, on) => {
  const clock = mock.clock(on)
  const { frames, ui } = await framesOf($, on)
  await clock.advance(45)
  expect(frames[0].chars.slice(8, 16)).not.toContain('.')
  await ui.unmount()
})

test('the gleam bounces: the next sweep starts on the other side', async ($, on) => {
  const clock = mock.clock(on)
  const { frames, ui } = await framesOf($, on)
  await clock.advance(45)
  expect(frames[0].mark).not.toBe(0xffffff) // the first sweep starts at the right end
  for (let i = 0; i < 60; i++) await clock.advance(45) // it finishes
  await ui.redraw({ word: 'Again', message: null, suffix: '…', mode: 'thinking' })
  await clock.advance(45)
  expect(frames[frames.length - 1].mark).toBe(0xffffff) // the second starts at the left, on the mark
  await ui.unmount()
})

test('thought for holds for three seconds, then scrambles away', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const seen: { chars: string; colours: number[] }[] = []
  on('ui.blit', (_: any, e: any) => {
    const w = new Uint32Array((Uint8Array as any).fromBase64(e.cells).buffer)
    let chars = ''
    const colours: number[] = []
    for (let i = 0; i < w.length; i += 3) { chars += String.fromCodePoint(w[i]); colours.push(w[i + 1]) }
    seen.push({ chars, colours })
    return { value: {} }
  })
  on('turn.step', async function* (_: any, e: any) {
    yield { kind: 'thinking', index: 0, text: 'x' }
    await clock.advance(2000)
    yield { kind: 'text', index: 1, text: 'y' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: { output_tokens: 10, input_tokens: 0, model: 'm' } } as any
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 'th' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'th',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
  })
  for await (const _ of $.turn.step({ turnId: 'th', index: 0, model: 'm', messageCount: 1 } as any)) {}
  const start = seen.length
  await clock.advance(2900)
  const holding = seen[seen.length - 1]
  expect(holding.chars).toMatch(/thought for \d+s/)
  await clock.advance(400) // 3.3 s after thinking ended: the letters are scrambling
  const scrambling = seen[seen.length - 1]
  expect(scrambling.chars).not.toMatch(/thought for/)
  expect(scrambling.chars).toMatch(/tokens/) // the rest of the readout is untouched
  await clock.advance(1000)
  const gone = seen[seen.length - 1].chars
  expect(gone).not.toMatch(/thought/)
  expect(gone).toMatch(/tokens\)/) // the closing bracket has slid up against it
  expect(start).toBeGreaterThan(0)
  await ui.unmount()
})

test('before a turn the spinner leaves the engine drawing alone', async ($, on) => {
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'idle',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
  })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  expect(await ui.find({ type: 'Raster' })).toBeFalsy()
  await ui.unmount()
})

test('the readout clock reads 14s, then 1m 5s', () => {
  expect(clockText(0)).toBe('0s')
  expect(clockText(14)).toBe('14s')
  expect(clockText(59)).toBe('59s')
  expect(clockText(60)).toBe('1m 0s')
  expect(clockText(65)).toBe('1m 5s')
  expect(clockText(3599)).toBe('59m 59s')
})
