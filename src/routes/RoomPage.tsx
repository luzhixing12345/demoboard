import { useSync } from '@tldraw/sync'
import {
  AssetRecordType,
  getHashForString,
  type Editor,
  type TLAssetStore,
  type TLBookmarkAsset,
  Tldraw,
  uniqueId,
} from 'tldraw'

type RoomPageProps = {
  roomId: string
}

export function RoomPage({ roomId }: RoomPageProps) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const socketOrigin = `${wsProtocol}//${window.location.host}`
  const readonly = new URLSearchParams(window.location.search).get('readonly') === '1'

  const store = useSync({
    uri: `${socketOrigin}/connect/${encodeURIComponent(roomId)}${readonly ? '?readonly=1' : ''}`,
    assets: multiplayerAssets,
  })

  return (
    <main className="room-page">
      <div className="whiteboard">
        <Tldraw
          store={store}
          onMount={(editor: Editor) => {
            editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
            if (readonly) {
              editor.updateInstanceState({ isReadonly: true })
            }
          }}
        />
      </div>
    </main>
  )
}

const multiplayerAssets: TLAssetStore = {
  async upload(_asset, file) {
    const objectName = `${uniqueId()}-${file.name}`
    const url = `/uploads/${encodeURIComponent(objectName)}`
    const response = await fetch(url, {
      method: 'PUT',
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`)
    }

    return { src: url }
  },
  resolve(asset) {
    return asset.props.src
  },
}

async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: 'asset',
    type: 'bookmark',
    meta: {},
    props: {
      src: url,
      description: '',
      image: '',
      favicon: '',
      title: '',
    },
  }

  try {
    const response = await fetch(`/unfurl?url=${encodeURIComponent(url)}`)
    if (!response.ok) return asset

    const data = await response.json()
    asset.props.description = data?.description ?? ''
    asset.props.image = data?.image ?? ''
    asset.props.favicon = data?.favicon ?? ''
    asset.props.title = data?.title ?? ''
  } catch (error) {
    console.error(error)
  }

  return asset
}
