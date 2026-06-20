import { InMemorySyncStorage, TLSocketRoom } from '@tldraw/sync-core'
import type { TLRecord } from 'tldraw'

const rooms = new Map<string, TLSocketRoom<TLRecord, void>>()

export function makeOrLoadRoom(roomId: string): TLSocketRoom<TLRecord, void> {
  const safeRoomId = sanitizeRoomId(roomId)
  const existing = rooms.get(safeRoomId)

  if (existing && !existing.isClosed()) {
    return existing
  }

  const room = new TLSocketRoom<TLRecord, void>({
    storage: new InMemorySyncStorage<TLRecord>({}),
    onSessionRemoved(room, args) {
      if (args.numSessionsRemaining === 0) {
        room.close()
        rooms.delete(safeRoomId)
      }
    },
  })

  rooms.set(safeRoomId, room)
  return room
}

function sanitizeRoomId(roomId: string) {
  return roomId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'demo'
}
