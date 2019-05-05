import React, { PureComponent } from 'react';
import { InfiniteLoader, List } from 'react-virtualized';
import chatHistory from '../../utils/chatHistory';

class InfiniteList extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      list: chatHistory(10)
    };
  }

  isRowLoaded = ({ index }) => !!this.state.list[index];

  loadMoreRows = ({ startIndex, stopIndex }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = this.state.list.concat(chatHistory(10));
        this.setState({
          list
        });
        resolve(list);
      }, 2500);
    });
  };

  rowRenderer = ({ key, index, style }) => {
    const { name, text } = this.state.list[index];
    return (
      <div key={key} style={style}>
        <strong>{`${index + 1}. ${name}: `}</strong>
        <span>{text}</span>
      </div>
    );
  };

  render() {
    const { list } = this.state;
    return (
      <InfiniteLoader
        isRowLoaded={this.isRowLoaded}
        loadMoreRows={this.loadMoreRows}
        rowCount={Infinity}
        threshold={1}
      >
        {({ onRowsRendered, registerChild }) => (
          <List
            ref={registerChild}
            width={300}
            height={600}
            rowCount={list.length}
            rowHeight={100}
            rowRenderer={this.rowRenderer}
            onRowsRendered={onRowsRendered}
          />
        )}
      </InfiniteLoader>
    );
  }
}

export default InfiniteList;
