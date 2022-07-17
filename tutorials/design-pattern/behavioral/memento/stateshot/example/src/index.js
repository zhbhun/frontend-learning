const { History } = require("stateshot");

const history = new History();

const state = {
  properties: {
    nam: "a",
    sex: 1,
  },
  style: {},
  children: [
    {
      type: "text",
      properties: {
        content: "...",
      },
    },
    {
      type: "button",
      properties: {
        content: "...",
      },
    },
  ],
};

history.pushSync(state);

state.properties.sex = 0;

history.pushSync(state);

console.log('>> 1', history.get());

console.log('>> 2', history.undo().get());

console.log('>> 3', history.redo().get());
