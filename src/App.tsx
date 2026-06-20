import { RoomPage } from './routes/RoomPage.tsx'

export function App() {
  const path = window.location.pathname

  if (path === '/') {
    window.history.replaceState(null, '', '/room/demo')
  }

  const match = window.location.pathname.match(/^\/room\/([^/]+)\/?$/)
  const roomId = match?.[1] ?? 'demo'

  return <RoomPage roomId={roomId} />
}
