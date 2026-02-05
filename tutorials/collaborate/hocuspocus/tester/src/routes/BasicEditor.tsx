import StarterKit from '@tiptap/starter-kit'
import { EditorContent, EditorContext, useEditor } from '@tiptap/react'
import { FloatingMenu, BubbleMenu } from '@tiptap/react/menus'
import { useMemo } from 'react'

export default function BasicEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>这里是一个最简单的 Tiptap 编辑器。</p>',
  })
  const providerValue = useMemo(() => ({ editor }), [editor])

  return (
    <section className="bg-[#fff8f1] rounded-[20px] p-6 shadow-[0_10px_30px_rgba(31,31,31,0.08)]">
      <h2>基础编辑器</h2>
      <p className="text-[#5f5f5f] mt-0">这个场景只启用 StarterKit。</p>
      <div className="border border-[#d7cbbf] rounded-2xl p-4 min-h-[220px] bg-white [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]">
        <EditorContext.Provider value={providerValue}>
          <EditorContent editor={editor} />
          <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
          <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
        </EditorContext.Provider>
      </div>
    </section>
  )
}
