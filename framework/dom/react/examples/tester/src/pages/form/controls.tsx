import React, { ChangeEvent, useCallback, useState } from "react";

interface FormState {
  text?: string;
  color?: string;
  date?: string;
  time?: string;
  number?: string;
  range?: string;
  checked?: boolean;
  radio?: boolean;
  textarea?: string;
  select?: string;
  file?: any;
}

export default function ControlsTester() {
  const [state, setState] = useState<FormState>({});
  const handleChange = useCallback(
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | ChangeEvent<HTMLTextAreaElement>
        | ChangeEvent<HTMLSelectElement>
    ) => {
      const inputElement = event.target;
      let value: any = inputElement.value;
      if (inputElement.type === "checkbox" || inputElement.type === "radio") {
        value = (inputElement as HTMLInputElement).checked;
      }
      setState((currState) => {
        return {
          ...currState,
          [inputElement.name]: value,
        };
      });
    },
    [setState]
  );
  return (
    <form>
      <div>
        <span>text: </span>
        <input
          type="text"
          name="text"
          value={state.text}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>color: </span>
        <input
          type="color"
          name="color"
          value={state.color}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>date: </span>
        <input
          type="date"
          name="date"
          value={state.date}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>time: </span>
        <input
          type="time"
          name="time"
          value={state.time}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>number: </span>
        <input
          type="number"
          name="number"
          value={state.number}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>range: </span>
        <input
          type="range"
          name="range"
          value={state.range}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>checkbox: </span>
        <input
          type="checkbox"
          name="checkbox"
          checked={state.checked}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>radio: </span>
        <input
          type="radio"
          name="radio"
          checked={state.radio}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>textarea: </span>
        <textarea
          name="textarea"
          value={state.textarea}
          onChange={handleChange}
        />
      </div>
      <div>
        <span>select: </span>
        <select name="select" value={state.textarea} onChange={handleChange}>
          <option value="">请选择</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>
      <div>
        <span>file: </span>
        <input
          type="file"
          name="file"
          onChange={handleChange}
        />
      </div>
    </form>
  );
}
