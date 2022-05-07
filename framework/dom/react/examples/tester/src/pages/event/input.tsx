import React from "react";

export default function InputEventTester() {
  return (
    <div>
      <input
        onChange={(e: any) => console.log("change", e.target.value)}
        onInput={(e: any) => console.log("input", e.target.value)}
      />
    </div>
  );
}
