import cors from '@fastify/cors'
import middie from '@fastify/middie'
import websocketPlugin from '@fastify/websocket'
import fastify from 'fastify'
import { readFile, stat } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
import type { RawData } from 'ws'
import { loadAsset, storeAsset } from './assets.js'
import { makeOrLoadRoom } from './rooms.js'
import { unfurl } from './unfurl.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..')
const DIST_DIR = join(ROOT_DIR, 'dist')
const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'
const isProduction = process.env.NODE_ENV === 'production'

const app = fastify({
  logger: false,
})

await app.register(cors, { origin: true })
await app.register(websocketPlugin)

await app.register(async (app) => {
  app.get('/connect/:roomId', { websocket: true }, (socket, req) => {
    const roomId = (req.params as { roomId: string }).roomId
    const sessionId = (req.query as { sessionId?: string }).sessionId
    const isReadonly = (req.query as { readonly?: string }).readonly === '1'

    if (!sessionId) {
      socket.close(1008, 'Missing sessionId')
      return
    }

    const caughtMessages: RawData[] = []
    const collectMessagesListener = (message: RawData) => {
      caughtMessages.push(message)
    }

    socket.on('message', collectMessagesListener)

    const room = makeOrLoadRoom(roomId)
    room.handleSocketConnect({ sessionId, socket, isReadonly })

    socket.off('message', collectMessagesListener)

    for (const message of caughtMessages) {
      socket.emit('message', message)
    }
  })
})

app.addContentTypeParser('*', (_, __, done) => done(null))

app.put('/uploads/:id', async (req, res) => {
  const id = (req.params as { id: string }).id
  await storeAsset(id, req.raw)
  res.send({ ok: true })
})

app.get('/uploads/:id', async (req, res) => {
  const id = (req.params as { id: string }).id
  const data = await loadAsset(id)
  res.header('Content-Security-Policy', "default-src 'none'")
  res.header('X-Content-Type-Options', 'nosniff')
  res.send(data)
})

app.get('/unfurl', async (req, res) => {
  const url = (req.query as { url?: string }).url
  if (!url) {
    res.code(400).send({ error: 'Missing url query parameter' })
    return
  }

  try {
    res.send(await unfurl(url))
  } catch {
    res.send({ title: '', description: '', image: '', favicon: '' })
  }
})

if (isProduction) {
  app.get('/*', async (req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`).pathname
    const file = await readDistFile(pathname)

    if (file) {
      res.type(getContentType(file.path)).send(file.content)
      return
    }

    if (req.headers.accept?.includes('text/html')) {
      const index = await readFile(join(DIST_DIR, 'index.html'))
      res.type('text/html').send(index)
      return
    }

    res.code(404).send({ error: 'Not found' })
  })
} else {
  const vite = await createViteServer({
    root: ROOT_DIR,
    server: {
      middlewareMode: true,
      host: HOST,
    },
    appType: 'spa',
  })

  await app.register(middie)
  app.use((req, res, next) => {
    const url = req.url ?? ''
    if (url.startsWith('/connect') || url.startsWith('/uploads') || url.startsWith('/unfurl')) {
      next()
      return
    }

    vite.middlewares(req, res, next)
  })
}

await app.listen({ host: HOST, port: PORT })
printServerUrls()

async function readDistFile(pathname: string): Promise<{ path: string; content: Buffer } | null> {
  const decodedPath = decodeURIComponent(pathname)
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1)
  const filePath = resolve(DIST_DIR, relativePath)

  if (!filePath.startsWith(`${DIST_DIR}/`) && filePath !== join(DIST_DIR, 'index.html')) {
    return null
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) return null
    return { path: filePath, content: await readFile(filePath) }
  } catch {
    return null
  }
}

function getContentType(filePath: string) {
  if (filePath.endsWith('.html')) return 'text/html'
  if (filePath.endsWith('.js')) return 'text/javascript'
  if (filePath.endsWith('.css')) return 'text/css'
  if (filePath.endsWith('.json')) return 'application/json'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.png')) return 'image/png'
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg'
  if (filePath.endsWith('.webp')) return 'image/webp'
  if (filePath.endsWith('.ico')) return 'image/x-icon'
  if (filePath.endsWith('.woff2')) return 'font/woff2'
  return 'application/octet-stream'
}

function printServerUrls() {
  const localUrl = `http://localhost:${PORT}/room/demo`
  const lanUrls = getLanAddresses().map((address) => `http://${address}:${PORT}/room/demo`)

  console.log('')
  console.log('Demoboard is running')
  console.log(`Local: ${localUrl}`)

  if (lanUrls.length > 0) {
    console.log('LAN:')
    for (const url of lanUrls) {
      console.log(`  ${url}`)
    }
  } else {
    console.log('LAN: no active IPv4 network address found')
  }

  console.log('')
}

function getLanAddresses() {
  const ignoredPrefixes = ['127.', '169.254.', '172.17.', '172.18.', '172.19.', '172.20.']
  const addresses = new Set<string>()

  for (const interfaces of Object.values(networkInterfaces())) {
    for (const net of interfaces ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue
      if (ignoredPrefixes.some((prefix) => net.address.startsWith(prefix))) continue
      addresses.add(net.address)
    }
  }

  return [...addresses]
}
