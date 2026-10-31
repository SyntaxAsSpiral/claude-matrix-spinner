export type Shape = { label: string }

declare module 'claude-code' {
  interface PluginState {
    'matrix-spinner': { shape: Shape | null }
  }
}
