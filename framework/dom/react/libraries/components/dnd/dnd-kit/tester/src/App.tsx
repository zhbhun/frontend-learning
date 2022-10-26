import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id });

  const style = {
    position: "relative",
    transform: CSS.Transform.toString(transform),
    transition,
  } as any;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {props.id}
      <input />
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        213
      </div>
    </div>
  );
}

function App() {
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6]);
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      123
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid">
          {items.map((id, index) => (
            <SortableItem key={id} id={index + 2} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  function handleDragEnd(event) {
    // const { active, over } = event;

    // if (active.id !== over.id) {
    //   setItems((items) => {
    //     const oldIndex = items.indexOf(active.id);
    //     const newIndex = items.indexOf(over.id);

    //     return arrayMove(items, oldIndex, newIndex);
    //   });
    // }
  }
}

export default App;
