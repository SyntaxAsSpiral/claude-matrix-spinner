import { expect, mock, test } from 'claude-code/testing'

// Inline registers are re-eval'd in their own environment. A closure over
// this file is a free variable there, and the hook is skipped. Every name
// below is a literal for that reason.

// The writer is the gerunds contract: plugin state key `verb`, set with
// $.state.set({ plugin: 'gerunds', key: 'verb' }, text). Seated at user tier,
// inside the spinner, which is the seat where a word-prop rewrite never runs.
function gerunds(on: any) {
  on('tool.call', { tool: 'mcp__gerunds__status' }, async ($: any, e: any) => {
    const text = String(e.text ?? '').trim()
    if (text === '') return { result: 'ok' }
    await $.state.set({ plugin: 'gerunds', key: 'verb' }, text)
    $.ui.invalidate('ui.render')
    return { result: 'ok' }
  })
}

const WORD = { message: null, suffix: '…', mode: 'thinking' as const }

test('with gerunds absent the spinner settles the engine word', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId }))
  on('config.list', () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'auto' }] }) as any)
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const frames: string[] = []
  on('ui.blit', (_: any, e: any) => {
    const w = new Uint32Array((Uint8Array as any).fromBase64(e.cells).buffer)
    let s = ''
    for (let i = 0; i < w.length; i += 3) s += String.fromCodePoint(w[i])
    frames.push(s)
    return { value: {} }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 'alone' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'a',
    props: { ...WORD, word: 'Sauteing' },
  })
  for (let i = 0; i < 24; i++) await clock.advance(45)
  expect(frames[frames.length - 1]).toContain('Sauteing')
  await ui.unmount()
})

test('a user-tier gerunds writer sets the verb and restarts the scramble and the gleam', {
  plugins: [{ name: 'gerunds', tier: 'user', register: gerunds }],
}, async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId }))
  on('config.list', () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'auto' }] }) as any)
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const frames: { chars: string; mark: number; far: number }[] = []
  on('ui.blit', (_: any, e: any) => {
    const w = new Uint32Array((Uint8Array as any).fromBase64(e.cells).buffer)
    let chars = ''
    for (let i = 0; i < w.length; i += 3) chars += String.fromCodePoint(w[i])
    frames.push({ chars, mark: w[1], far: w[18 * 3 + 1] })
    return { value: {} }
  })
  on('tool.call', async (_$: any, e: any, next: any) => next(e))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 'main' })
  const ui = await $.ui.mount({
    plugin: 'matrix-spinner', surface: 'terminal', component: 'Spinner', requestId: 'r',
    props: { ...WORD, word: 'Working' },
  })
  for (let i = 0; i < 60; i++) await clock.advance(45)
  expect(frames[frames.length - 1].chars).toContain('Working')
  await $.tool.call({ tool: 'mcp__gerunds__status', text: 'Frolicking' })
  await clock.advance(45)
  const fresh = frames[frames.length - 1]
  expect(fresh.chars).not.toContain('Working')
  expect(fresh.chars).not.toContain('Frolicking')
  expect(fresh.mark).toBe(0xffffff)
  expect(fresh.far).not.toBe(0xffffff)
  for (let i = 0; i < 24; i++) await clock.advance(45)
  expect(frames[frames.length - 1].chars).toContain('Frolicking')
  await ui.unmount()
})
