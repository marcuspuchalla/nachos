/** Incremental RFC 8742 decoder. Framing consumes each input byte once. */
import type { CborNode } from './scanner'
import { createScanner, resolveOptions, sourceMapFor } from './scanner'
import type { ParseOptions, CborValue, SourceMapEntry } from './types'

export interface SequenceStreamOptions extends ParseOptions {
  /** Per-item limits use ParseOptions.limits. These two limits cover the stream. */
  maxSequenceBytes?: number
  maxItems?: number
}
export interface StreamItem {
  index: number
  start: number
  end: number
  value: CborValue
  /** Node/source-map offsets are relative to this item's start. */
  node: CborNode
  sourceMap: SourceMapEntry[]
}
type Frame = { major: number; remaining: number | null; count: number }

export function createSequenceDecoder(input: SequenceStreamOptions = {}) {
  const options = resolveOptions({ ...input, allowTrailingData: false }), limits = options.limits!
  const maxBytes = input.maxSequenceBytes ?? Number.MAX_SAFE_INTEGER, maxItems = input.maxItems ?? 10000
  for (const value of [maxBytes, maxItems]) if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid sequence limit')
  let buffer = new Uint8Array(0), length = 0, total = 0, index = 0, ended = false, failure: unknown
  let major = 0, additional = 0, headerLeft = -1, argument = 0n, payloadLeft = 0
  const frames: Frame[] = []
  const live = () => { if (failure) throw failure; if (ended) throw new Error('CBOR sequence decoder is closed') }
  const finishValue = (): boolean => {
    while (frames.length) {
      const parent = frames[frames.length - 1]!
      parent.count++
      if (parent.remaining === null) {
        const maximum = parent.major === 5 ? limits.maxMapSize! * 2 : limits.maxArrayLength!
        if (parent.count > maximum) throw new Error('Indefinite sequence item exceeds collection limit')
        return false
      }
      if (--parent.remaining > 0) return false
      frames.pop()
    }
    return true
  }
  const framedHeader = (): boolean => {
    headerLeft = -1
    if (major === 2 || major === 3) {
      if (additional === 31) frames.push({ major, remaining: null, count: 0 })
      else {
        if (argument > BigInt(limits.maxStringLength!) || argument > BigInt(limits.maxInputSize! - length)) throw new Error('Stream string exceeds input/string limit')
        payloadLeft = Number(argument)
        if (!payloadLeft) return finishValue()
      }
    } else if (major === 4 || major === 5 || major === 6) {
      if (major !== 6 && additional !== 31 && argument > BigInt(major === 4 ? limits.maxArrayLength! : limits.maxMapSize!)) throw new Error('Stream collection exceeds limit')
      const remaining = major === 6 ? 1 : additional === 31 ? null : Number(argument) * (major === 5 ? 2 : 1)
      if (remaining === 0) return finishValue()
      frames.push({ major, remaining, count: 0 })
    } else return finishValue()
    if (frames.filter(f => f.major === 6).length > limits.maxTagDepth! || frames.filter(f => f.major !== 6).length > limits.maxDepth!) throw new Error('Stream nesting depth exceeds limit')
    return false
  }
  const write = (chunk: Uint8Array): StreamItem[] => {
    live()
    try {
      if (!(chunk instanceof Uint8Array)) throw new Error('Sequence chunks must be Uint8Array')
      if (total + chunk.length > maxBytes) throw new Error('Sequence byte limit exceeded')
      const result: StreamItem[] = [], started = Date.now()
      for (const byte of chunk) {
        if (Date.now() - started > limits.maxParseTime!) throw new Error('Sequence parse timeout')
        if (index >= maxItems) throw new Error('Sequence item limit exceeded')
        if (length >= limits.maxInputSize!) throw new Error('Stream item exceeds input limit')
        if (length === buffer.length) {
          const grown = new Uint8Array(Math.min(limits.maxInputSize!, Math.max(32, buffer.length * 2)))
          grown.set(buffer); buffer = grown
        }
        buffer[length++] = byte; total++
        let complete = false
        if (payloadLeft) { if (--payloadLeft === 0) complete = finishValue() }
        else if (headerLeft > 0) {
          argument = argument * 256n + BigInt(byte)
          if (--headerLeft === 0) complete = framedHeader()
        } else {
          major = byte >> 5; additional = byte & 31
          const parent = frames[frames.length - 1]
          if (byte === 255) {
            if (!parent || parent.remaining !== null) throw new Error('Unexpected sequence break')
            if (parent.major === 5 && parent.count % 2) throw new Error('Break between map key and value')
            frames.pop(); complete = finishValue()
          } else {
            if (parent && (parent.major === 2 || parent.major === 3) && (major !== parent.major || additional === 31)) throw new Error('Invalid indefinite string chunk')
            if (additional >= 28 && additional <= 30 || additional === 31 && (major < 2 || major > 5)) throw new Error('Invalid CBOR sequence header')
            if (additional === 31 && !options.allowIndefinite) throw new Error('Indefinite sequence item is not allowed')
            headerLeft = additional < 24 || additional === 31 ? 0 : 2 ** (additional - 24)
            argument = headerLeft ? 0n : BigInt(additional)
            if (!headerLeft) complete = framedHeader()
          }
        }
        if (complete) {
          const bytes = buffer.slice(0, length), node = createScanner(bytes, options).scan(0)
          result.push({ index: index++, start: total - length, end: total, value: node.value, node, sourceMap: sourceMapFor(node) })
          length = 0; headerLeft = -1
        }
      }
      return result
    } catch (error) { failure = error; buffer = new Uint8Array(0); throw error }
  }
  const finish = (): void => {
    live()
    if (length) { failure = new Error(`Truncated CBOR sequence item at byte ${total - length}`); throw failure }
    ended = true; buffer = new Uint8Array(0)
  }
  return { write, finish, get bytesRead() { return total }, get itemsRead() { return index } }
}

/** Works with Node async iterables and browser ReadableStreams; honors backpressure. */
export async function* decodeSequenceStream(source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options?: SequenceStreamOptions): AsyncGenerator<StreamItem> {
  const decoder = createSequenceDecoder(options)
  for await (const chunk of source) for (const item of decoder.write(chunk)) yield item
  decoder.finish()
}
