export type Shape = { label: string }
export type Verb = { at: number; text: string }

declare module 'claude-code' {
  interface PluginState {
    'matrix-spinner': { shape: Shape | null; verbs: Verb[] }
  }
}
