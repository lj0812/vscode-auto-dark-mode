export type ColorItem = {
  key: string,
  value: string
}

export type ColorMap = {
  [x: string]: string
}

export type RgbaColor = {
  r: number,
  g: number,
  b: number,
  a?: number
}

export type CssStyleAttrs = {
  lang?: string,
  module?: boolean,
  scoped?: boolean,
  'auto-injected'?: boolean,
}

export type VueComplierStyle = {
  attrs: CssStyleAttrs,
  content: string,
  end?: number,
  lang?: string,
  module?: boolean | string,
  start: number,
  type: string,
  startLine: number,
  endLine: number,
  value: string,
  lineCount: number,
  newLineCount?: number,
  injectLocation: [number, number]
}

export type Position = {
  start: number,
  end: number
}