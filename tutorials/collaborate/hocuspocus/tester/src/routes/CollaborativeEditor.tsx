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
  const [user] = useState(() => ({
    name: getRandomName(),
    color: getRandomColor(),
  }))
  const [status, setStatus] = useState('连接中...')
  const [document] = useState(() => new Y.Doc())
  const [fragments, setFragments] = useState<Y.XmlFragment[]>([])
  const provider = useMemo(() => {
    console.log(document)
    const provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:5174',
      name: 'tester',
      document: document,
      onStatus: ({ status }) => {
        setStatus(
          status === 'connected'
            ? '已连接'
            : status === 'connecting'
              ? '连接中...'
              : '已断开',
        )
      },
      onSynced: () => {
        const fragments = document.getMap('fragments')
        setFragments(
          ['a', 'b'].map((key) => {
            if (fragments.has(key)) {
              const fragment = fragments.get(key) as Y.XmlFragment
              if (fragment instanceof Y.XmlFragment) {
                return fragment
              }
            }
            const fragement = new Y.XmlFragment()
            fragments.set(key, fragement)
            return fragement
          }),
        )
      },
    })
    return provider
  }, [document])
  useEffect(() => {
    return () => {
      provider.destroy()
    }
  }, [provider])
  useEffect(() => {
    return () => {
      document.destroy()
    }
  }, [document])
  if (!document) {
    return <div>加载编辑器...</div>
  }
  return (
    <div>
      <div className="flex items-center justify-between p-4 bg-[#fff8f1] rounded-lg border border-[#c9c1b9]">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: user.color }}
          />
          <span className="font-medium">{user.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${status === '已连接' ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span className="text-sm text-gray-600">{status}</span>
        </div>
      </div>
      {fragments.map((fragment, index) => (
        <Temp
          key={index}
          document={document}
          fragment={fragment}
          provider={provider}
          user={user}
        />
      ))}
    </div>
  )
}

function Temp({
  document,
  fragment,
  provider,
  user,
}: {
  document: Y.Doc
  fragment: Y.XmlFragment
  provider: HocuspocusProvider
  user: {
    name: string
    color: string
  }
}) {
  const extensions: Extensions = useMemo(() => {
    return [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: document,
        fragment,
        provider,
      }),
      CollaborationCaret.configure({
        provider,
        user,
      }),
    ]
  }, [document, fragment, provider, user])
  const editor = useEditor({
    extensions,
    content: '<p>开始协同编辑...</p>',
  })
  return (
    <div className="prose max-w-none">
      <EditorContent
        editor={editor}
        className="border border-[#c9c1b9] rounded-lg p-4 min-h-[400px] bg-white focus-within:border-[#1f1f1f] transition-colors"
      />
    </div>
  )
}
