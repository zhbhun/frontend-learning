import * as Y from 'yjs'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { useEditor, EditorContent, Extensions } from '@tiptap/react'
import { useEffect, useMemo, useState } from 'react'

const getRandomColor = () => {
  const colors = [
    '#ffcc00',
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#ffeaa7',
    '#dfe6e9',
    '#a29bfe',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

const getRandomName = () => {
  const names = [
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
    'Henry',
  ]
  return names[Math.floor(Math.random() * names.length)]
}

export default function CollaborativeEditor() {
  const [status, setStatus] = useState('连接中...')

  const [root] = useState(() => new Y.Doc())
  const [document, setDocument] = useState<Y.Doc | null>(null)

  const provider = useMemo(() => {
    console.log(root)
    const provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:5174',
      name: 'example-document',
      document: root,
      onStatus: ({ status }) => {
        setStatus(
          status === 'connected'
            ? '已连接'
            : status === 'connecting'
              ? '连接中...'
              : '已断开',
        )
      },
      onSynced() {
        setDocument(root)
      },
    })
    return provider
  }, [root])
  useEffect(() => {
    return () => {
      provider.destroy()
    }
  }, [provider])

  if (!document) {
    return <div>加载编辑器...</div>
  }

  return (
    <>
      <Temp id="a" status={status} document={document} provider={provider} />
      <Temp id="b" status={status} document={document} provider={provider} />
    </>
  )
}

function Temp({
  id,
  status,
  document,
  provider,
}: {
  id: string,
  status: string
  document: Y.Doc
  provider: HocuspocusProvider
}) {
  const [userName] = useState(getRandomName())
  const [userColor] = useState(getRandomColor())
  const extensions: Extensions = useMemo(() => {
    return [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: document,
        field: id,
        provider,
      }),
      CollaborationCaret.configure({
        provider,
        user: { name: userName, color: userColor },
      }),
    ]
  }, [id, document, provider, userName, userColor])
  const editor = useEditor({
    extensions,
    content: '<p>开始协同编辑...</p>',
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between p-4 bg-[#fff8f1] rounded-lg border border-[#c9c1b9]">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: userColor }}
          />
          <span className="font-medium">{userName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${status === '已连接' ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span className="text-sm text-gray-600">{status}</span>
        </div>
      </div>

      <div className="prose max-w-none">
        <EditorContent
          editor={editor}
          className="border border-[#c9c1b9] rounded-lg p-4 min-h-[400px] bg-white focus-within:border-[#1f1f1f] transition-colors"
        />
      </div>
    </div>
  )
}
