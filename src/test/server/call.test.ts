import { ProtoCat } from '../..'
import { GreetingService } from '../../../dist/test/api/v1/hello_grpc_pb'
import { path2Fragments } from '../../lib/misc/grpc-helpers'
import {
  ExtractMiddleware,
  ExtractServices,
} from '../../lib/server/application'
import { Middleware, ServiceImplementation } from '../../lib/server/call'

describe('Context extension types', () => {
  const app = new ProtoCat({ GreetingService }, () => ({
    uid: '',
  }))

  // Inferred middleware context
  app.use((call, next) => {
    call.uid = '123'
  })

  // Explicit middleware context
  const mdw: ExtractMiddleware<typeof app> = (call, next) => {
    call.uid = '123'
    if (call.path === '/cats.v1.Greeting/ClientStream') {
      // good
    }
    // @ts-expect-error
    if (call.path === '/cats.v1.zblept/ClientStream') {
      // causes error, typo in path
    }
  }
  app.use(mdw)

  const unaryHandler: ExtractServices<
    typeof app
  >['GreetingService']['unary'] = call => call.uid

  const serverStreamHandler: ServiceImplementation<typeof GreetingService, { uid: string }>['serverStream'] = call => call.uid

  const serviceImpl: ExtractServices<typeof app>['GreetingService'] = {
    bidi: call => call.uid,
    clientStream: call => call.uid,
    serverStream: call => call.uid,
    unary: call => call.uid,
  }

  // Service definition inferred and explicit
  app.addService('GreetingService', {
    bidi: call => call.uid,
    unary: [unaryHandler],
    serverStream: serverStreamHandler,
    clientStream: [call => call.uid, serviceImpl.clientStream],
  })
  const serviceImplGeneric: ServiceImplementation<typeof GreetingService, { uid: string }> = {
    bidi: call => call.uid,
    clientStream: call => call.uid,
    serverStream: call => call.uid,
    unary: call => call.uid,
  }

  const genericMiddleware: Middleware = call => call
  app.addService('GreetingService', {
    bidi: [call => call, serviceImplGeneric.bidi],
    clientStream: serviceImplGeneric.clientStream,
    serverStream: [genericMiddleware, serviceImplGeneric.serverStream],
    unary: serviceImplGeneric.unary,
  })
  test('Type check', jest.fn())
})
describe('path2Fragments', () => {
  test('Parses package, service and method', () => {
    const paths = [
      {
        path: '/cats.v1.Cat/GetCat',
        expect: { package: 'cats.v1', service: 'Cat', method: 'GetCat' },
      },
      {
        path: '/Cat/GetCat',
        expect: { package: '', service: 'Cat', method: 'GetCat' },
      },
      {
        path: '',
        expect: { package: '', service: '', method: '' },
      },
    ]
    for (const p of paths) {
      expect(path2Fragments(p.path)).toMatchObject(p.expect)
    }
  })
})
