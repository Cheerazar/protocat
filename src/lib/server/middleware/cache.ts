import { Middleware, ProtoCatCall } from '../call'
import { CallType } from '../../call-types'
import { Message } from 'google-protobuf'

export interface CacheImplementation<E = {}> {
  hash: (
    call: ProtoCatCall<E, Message, Message, CallType.Unary>
  ) => Promise<string> | string
  get: (key: string) => Promise<Buffer | undefined> | Buffer | undefined
  set: (key: string, value: Buffer) => void
}

export const createCache = <E = {}>(
  cache: CacheImplementation<E>
): Middleware<E> => async (call, next) => {
  if (call.type !== CallType.Unary) return next()
  const key = await cache.hash(call)
  if (!key) return next()
  let cached = await cache.get(key)
  if (!cached) {
    // cache miss
    // TODO callback?
    await next()
    cached = call.responseSerialize(call.response)
    cache.set(key, cached)
  } else {
    // cache hit
    // TODO callback?
  }
  call.bufferedResponse = cached
}
