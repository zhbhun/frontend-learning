import { Routes, Route } from 'react-router'
import { Home } from './pages/home'
import { Hello } from './pages/hello'
import { Whiteboard } from './pages/whiteboard'
import { BrushTester } from './pages/brush'
import { RectTester } from './pages/object/rect'
import { TextTester } from './pages/object/text'
import { ITextTester } from './pages/object/itext'
import { TextboxTester } from './pages/object/textbox'
import { LabeledDemo } from './pages/object/labeled'
import { GroupTester } from './pages/object/group'
import { ModifyEventTester } from './pages/event/modify'
import { ControlEventTester } from './pages/event/control'
import { EditingEventTester } from './pages/event/editing'
import { MouseEventTester } from './pages/event/mouse'
import { SelectEventTester } from './pages/event/select'
import { ClipPathTester } from './pages/style/clippath'
import ControlVisibilityDemo from './pages/control/visibility'
import ControlPropsDemo from './pages/control/props'
import CustomControlDemo from './pages/control/custom'
import ResizeControlDemo from './pages/control/resize'
import { SelectionTester } from './pages/interaction/selection'
import { DragDropTester } from './pages/interaction/dragdrop'
import { AnimationTester } from './pages/animation'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="hello" element={<Hello />} />
      <Route path="whiteboard" element={<Whiteboard />} />
      <Route path="brush" element={<BrushTester />} />
      <Route path="object/rect" element={<RectTester />} />
      <Route path="object/text" element={<TextTester />} />
      <Route path="object/itext" element={<ITextTester />} />
      <Route path="object/textbox" element={<TextboxTester />} />
      <Route path="object/labeled" element={<LabeledDemo />} />
      <Route path="object/group" element={<GroupTester />} />
      <Route path="event/modify" element={<ModifyEventTester />} />
      <Route path="event/control" element={<ControlEventTester />} />
      <Route path="event/editing" element={<EditingEventTester />} />
      <Route path="event/mouse" element={<MouseEventTester />} />
      <Route path="event/select" element={<SelectEventTester />} />
      <Route path="style/clippath" element={<ClipPathTester />} />
      <Route path="control/visibility" element={<ControlVisibilityDemo />} />
      <Route path="control/props" element={<ControlPropsDemo />} />
      <Route path="control/custom" element={<CustomControlDemo />} />
      <Route path="control/resize" element={<ResizeControlDemo />} />
      <Route path="interaction/selection" element={<SelectionTester />} />
      <Route path="interaction/dragdrop" element={<DragDropTester />} />
      <Route path="animation" element={<AnimationTester />} />
    </Routes>
  )
}

export default App
