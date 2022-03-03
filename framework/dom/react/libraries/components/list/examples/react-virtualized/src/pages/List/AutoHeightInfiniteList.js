import React, { PureComponent } from 'react';
import {
  AutoSizer,
  CellMeasurerCache,
  CellMeasurer,
  InfiniteLoader,
  List
} from 'react-virtualized';
import chatHistory from '../../utils/chatHistory';
import './AutoHeightInfiniteList.css';

class AutoHeightInfiniteList extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      list: chatHistory(15)
    };
    this.cache = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 100
    });
    this.mostRecentWidth = null;
  }

  isRowLoaded = ({ index }) => !!this.state.list[index];

  loadMoreRows = ({ startIndex, stopIndex } = {}) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = this.state.list.concat(chatHistory(15));
        this.setState({
          list
        });
        resolve(list);
      }, 2500);
    });
  };

  rowRenderer = ({ key, index, style, parent }) => {
    const { name, text } = this.state.list[index];
    return (
      <CellMeasurer
        cache={this.cache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
        width={this.mostRecentWidth}
      >
        <div className="AutoHeightInfiniteList-item" key={key} style={style}>
          <strong>{`${index + 1}. ${name}: `}</strong>
          <span>{text}</span>
        </div>
      </CellMeasurer>
    );
  };

  render() {
    const { list } = this.state;
    return (
      <div className="AutoHeightInfiniteList">
        <AutoSizer>
          {autoSizerParams => {
            if (
              this.mostRecentWidth &&
              this.mostRecentWidth !== autoSizerParams.width
            ) {
              this.cache.clearAll();
              // list && list.recomputeRowHeights();
            }

            this.mostRecentWidth = autoSizerParams.width;

            return (
              <InfiniteLoader
                isRowLoaded={this.isRowLoaded}
                loadMoreRows={this.loadMoreRows}
                minimumBatchSize={15}
                rowCount={Infinity}
                threshold={1}
              >
                {({ onRowsRendered, registerChild }) => (
                  <List
                    ref={registerChild}
                    className="AutoHeightInfiniteList-list"
                    width={autoSizerParams.width}
                    height={autoSizerParams.height}
                    rowCount={list.length}
                    rowHeight={this.cache.rowHeight}
                    rowRenderer={this.rowRenderer}
                    estimatedRowSize={100}
                    onRowsRendered={onRowsRendered}
                    deferredMeasurementCache={this.cache}
                  />
                )}
              </InfiniteLoader>
            );
          }}
        </AutoSizer>
      </div>
    );
  }
}

export default AutoHeightInfiniteList;
