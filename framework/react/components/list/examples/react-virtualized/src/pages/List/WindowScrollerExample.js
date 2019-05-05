import React from 'react';
import { List, WindowScroller } from 'react-virtualized';
import { NAMES } from '../../constants/dataset';

// List data as an array of strings
const list = NAMES;

function rowRenderer({
  key, // Unique key within array of rows
  index, // Index of row within collection
  isScrolling, // The List is currently being scrolled
  isVisible, // This row is visible within the List (eg it is not an overscanned row)
  style // Style object to be applied to row (to position it)
}) {
  return (
    <div key={key} style={style}>
      {list[index]}
    </div>
  );
}

const WindowScrollerExample = () => (
  <WindowScroller>
    {({
      width,
      height,
      isScrolling,
      onChildScroll,
      scrollTop,
      registerChild
    }) => (
      <div>
        <header>Table header</header>
        <div ref={registerChild}>
          <List
            autoHeight
            width={width}
            height={height}
            isScrolling={isScrolling}
            onScroll={onChildScroll}
            scrollTop={scrollTop}
            rowCount={list.length}
            rowHeight={20}
            rowRenderer={rowRenderer}
          />
        </div>
      </div>
    )}
  </WindowScroller>
);

export default WindowScrollerExample;
