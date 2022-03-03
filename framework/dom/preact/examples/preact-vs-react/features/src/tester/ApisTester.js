import React from 'react';
import ReactDOM from 'react-dom';

const renderObject = (obj, depth = 1) => {
  if (!obj) {
    return null;
  }
  return (
    <ul>
      {Object.keys(obj).sort().map((key) => {
        if (key.indexOf('__') >= 0) {
          return null;
        }
        const value = obj[key];
        const content = `${key}: ${typeof value}`;
        if (typeof value === 'object') {
          return (
            <li key={key}>
              <div>{content}</div>
              {renderObject(value, depth += 1)}
            </li>
          );
        }
        return <li key={key}>{content}</li>;
      })}
    </ul>
  );
};

function ApisTester() {
  return (
    <div className="ApisTester">
      {renderObject(Object.assign({}, React, ReactDOM))}
    </div>
  );
}

ApisTester.title = 'Apis';

export default ApisTester;
