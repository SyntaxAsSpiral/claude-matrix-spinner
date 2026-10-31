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
  for (let i = 0; i < 60; i++) await clock.advance(33)
  for (const i of [0, 10, 20, 40, 59]) console.log(String(i).padStart(3), frames[i])
  expect(frames.length).toBeGreaterThan(50)
  expect(frames[59]).toMatch(/Tracing the flake input/)
  await ui.unmount()
})
