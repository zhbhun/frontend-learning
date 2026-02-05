import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './routes/Home';
import BasicEditor from './routes/BasicEditor';
import MarkdownEditor from './routes/MarkdownEditor';
import CollaborativeEditor from './routes/CollaborativeEditor';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/basic', label: 'Basic Editor' },
  { to: '/markdown', label: 'Markdown Editor' },
  { to: '/collaborative', label: 'Collaborative Editor' },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col gap-6 p-8 px-6 pb-14 max-md:p-6 max-md:px-4 max-md:pb-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] m-0">Tiptap 示例</h1>
        <nav className="flex gap-3 flex-wrap">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                [
                  'py-2 px-3.5 rounded-full border border-[#c9c1b9] text-inherit no-underline bg-[#fff8f1] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
                  isActive &&
                    '!bg-[#1f1f1f] !text-[#fff8f1] !border-[#1f1f1f]',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              to={item.to}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/basic" element={<BasicEditor />} />
          <Route path="/markdown" element={<MarkdownEditor />} />
          <Route path="/collaborative" element={<CollaborativeEditor />} />
        </Routes>
      </main>
    </div>
  );
}
