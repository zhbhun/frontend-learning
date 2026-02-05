import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/react'
import { Markdown } from '@tiptap/markdown'

export default function MarkdownEditor() {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content:
      '# Hello Markdown\n\n这是一个 **所见即所得** 的 Markdown 编辑器。\n\n## 功能特性\n\n- 输入 `# ` 创建标题\n- 输入 `**文本**` 加粗\n- 输入 `*文本*` 斜体\n- 输入 `- ` 创建列表\n- 输入 `> ` 创建引用\n\n> 试试直接输入 Markdown 语法！',
    contentType: 'markdown',
  })

  const handleExport = () => {
    if (editor) {
      const markdown = editor.getMarkdown()
      console.log('Exported Markdown:', markdown)

      // 创建下载
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'document.md'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && editor) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const markdown = event.target?.result as string
        editor.commands.setContent(markdown, { contentType: 'markdown' })
      }
      reader.readAsText(file)
    }
  }

  return (
    <section className="bg-[#fff8f1] rounded-[20px] p-6 shadow-[0_10px_30px_rgba(31,31,31,0.08)]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="m-0">Markdown 编辑器</h2>
          <p className="text-[#5f5f5f] mt-2 mb-0">
            所见即所得，支持 Markdown 快捷输入。
          </p>
        </div>
        <div className="flex gap-2">
          <label className="py-2 px-3.5 rounded-full border border-[#c9c1b9] bg-white cursor-pointer hover:bg-[#f5f5f5] transition-colors">
            <input
              type="file"
              accept=".md,.markdown"
              onChange={handleImport}
              className="hidden"
            />
            导入
          </label>
          <button
            onClick={handleExport}
            className="py-2 px-3.5 rounded-full border border-[#c9c1b9] bg-white hover:bg-[#f5f5f5] transition-colors"
          >
            导出
          </button>
        </div>
      </div>

      <div className="border border-[#d7cbbf] rounded-2xl p-6 min-h-[500px] bg-white">
        <div className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[450px] [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:first:mt-0 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:leading-7 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ul]:mb-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_ol]:mb-4 [&_.ProseMirror_li]:mb-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#d7cbbf] [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-[#5f5f5f] [&_.ProseMirror_blockquote]:mb-4 [&_.ProseMirror_code]:bg-[#f5f5f5] [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-sm [&_.ProseMirror_pre]:bg-[#1f1f1f] [&_.ProseMirror_pre]:text-[#fff8f1] [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:mb-4 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-[#d7cbbf] [&_.ProseMirror_hr]:my-6 [&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic">
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="mt-4 p-4 bg-white rounded-lg border border-[#d7cbbf]">
        <h3 className="text-sm font-medium mb-2">快捷输入提示：</h3>
        <ul className="text-sm text-[#5f5f5f] space-y-1 ml-4 list-disc">
          <li>
            输入{' '}
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              #{' '}
            </code>{' '}
            创建一级标题
          </li>
          <li>
            输入{' '}
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              ##{' '}
            </code>{' '}
            创建二级标题
          </li>
          <li>
            输入{' '}
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              -{' '}
            </code>{' '}
            或{' '}
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              *{' '}
            </code>{' '}
            创建无序列表
          </li>
          <li>
            输入{' '}
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              1.{' '}
            </code>{' '}
            创建有序列表
          </li>
          <li>
            输入{' '}
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              &gt;{' '}
            </code>{' '}
            创建引用块
          </li>
          <li>
            使用{' '}
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              **文本**
            </code>{' '}
            加粗，
            <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
              *文本*
            </code>{' '}
            斜体
          </li>
        </ul>
      </div>
    </section>
  )
}
