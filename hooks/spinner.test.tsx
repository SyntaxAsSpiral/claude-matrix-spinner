import { expect, mock, test } from 'claude-code/testing'

test('the spinner paints a Raster and blits frames', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
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
  await $.tool.call({ tool: 'mcp__matrix-spinner__status', text: 'Tracing the flake input' })

  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'r',
    props: { word: 'x', message: null, suffix: '…', mode: 'thinking' },
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
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
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
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
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
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
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
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
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

test('a long think earns one nudge on the next tool result', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.blit', () => ({ value: {} }))
  on('tool.call', () => ({ result: {} }))
  let thinkFor = 30000
  on('turn.step', async function* (_, e: any) {
    yield { kind: 'thinking', index: 0, text: 'x' }
    await clock.advance(thinkFor)
    yield { kind: 'text', index: 1, text: 'y' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: { output_tokens: 10, input_tokens: 0, model: 'm' } } as any
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 'long1' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'n',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
  })
  for await (const _ of $.turn.step({ turnId: 'long1', index: 0, model: 'm', messageCount: 1 } as any)) {}
  const first: any = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect((first.context ?? []).join(' ')).toContain('mcp__matrix-spinner__status')
  const second: any = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect((second.context ?? []).length).toBe(0)

  // a short think earns nothing
  thinkFor = 5000
  await $.turn.start({ text: 'again', turnId: 'long2' })
  for await (const _ of $.turn.step({ turnId: 'long2', index: 0, model: 'm', messageCount: 1 } as any)) {}
  const third: any = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect((third.context ?? []).length).toBe(0)
  await ui.unmount()
})

async function nudgeContext($: any, on: any, thinkFor: number) {
  const clock = mock.clock(on)
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId }))
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.blit', () => ({ value: {} }))
  on('tool.call', () => ({ result: {} }))
  on('turn.step', async function* (_: any, e: any) {
    yield { kind: 'thinking', index: 0, text: 'x' }
    await clock.advance(thinkFor)
    yield { kind: 'text', index: 1, text: 'y' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: { output_tokens: 10, input_tokens: 0, model: 'm' } } as any
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 's1' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 's',
    props: { word: 'Working', message: null, suffix: '…', mode: 'thinking' },
  })
  for await (const _ of $.turn.step({ turnId: 's1', index: 0, model: 'm', messageCount: 1 } as any)) {}
  const r: any = await $.tool.call({ tool: 'Bash', command: 'ls' })
  await ui.unmount()
  return (r.context ?? []).join(' ')
}

test('longThinkSeconds lowers the threshold', { options: { longThinkSeconds: 3 } }, async ($, on) => {
  expect(await nudgeContext($, on, 5000)).toContain('mcp__matrix-spinner__status')
})

test('longThinkSeconds raises the threshold', { options: { longThinkSeconds: 60 } }, async ($, on) => {
  expect(await nudgeContext($, on, 30000)).toBe('')
})

test('longThinkSeconds 0 turns the nudge off', { options: { longThinkSeconds: 0 } }, async ($, on) => {
  expect(await nudgeContext($, on, 30000)).toBe('')
})

test('an empty verb from the tool leaves the engine verb alone', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 'e1' })
  const r: any = await $.tool.call({ tool: 'mcp__matrix-spinner__status', text: '   ' })
  expect(r.result).toBe('ok')
})

async function paintedColours($: any, on: any, theme: string) {
  on('config.list', () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme }] }) as any)
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('tool.register', () => ({ value: { tool: 'mcp__matrix-spinner__status' } }))
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
  expect(colours.has(0xea9d34)).toBe(true)
  expect(colours.has(0x8839ef)).toBe(true)
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
  expect(colours.has(0xea9d34)).toBe(false)
  await ui.unmount()
})
