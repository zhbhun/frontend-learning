import React from 'react';
import {
  AutoSizer,
  CellMeasurerCache,
  CellMeasurer,
  List
} from 'react-virtualized';
import { NAMES, SENTENCES } from '../../constants/dataset';
import './Chat.css';

const cache = new CellMeasurerCache({
  fixedWidth: true
});

let list;
let mostRecentWidth;

function rowRenderer(params) {
  const datum = chatHistory[params.index];

  return (
    <CellMeasurer
      cache={cache}
      columnIndex={0}
      key={params.key}
      parent={params.parent}
      rowIndex={params.index}
      width={mostRecentWidth}
    >
      <div className="chat-item" key={params.key} style={params.style}>
        <strong>
          {datum.name}
          {'：'}
          {datum.text}
        </strong>
      </div>
    </CellMeasurer>
  );
}

const Chat = () => (
  <div className="chat-container">
    <AutoSizer>
      {autoSizerParams => {
        if (mostRecentWidth && mostRecentWidth !== autoSizerParams.width) {
          cache.clearAll();
          list && list.recomputeRowHeights();
        }

        mostRecentWidth = autoSizerParams.width;

        return (
          <List
            className="chat"
            deferredMeasurementCache={cache}
            height={autoSizerParams.height}
            ref={function(ref) {
              list = ref;
            }}
            rowCount={chatHistory.length}
            rowHeight={cache.rowHeight}
            rowRenderer={rowRenderer}
            width={autoSizerParams.width}
          />
        );
      }}
    </AutoSizer>
  </div>
);

const chatHistory = [];

for (let i = 0; i < 1000; i++) {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const sentences = Math.ceil(Math.random() * 5);
  const texts = [];

  for (let x = 0; x < sentences; x++) {
    texts.push(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
  }

  chatHistory.push({
    name,
    text: texts.join(' ')
  });
}

export default Chat;
