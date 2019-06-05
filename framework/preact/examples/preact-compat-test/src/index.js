const React = require('react');
const { createContext } = require('preact-context');

React.createContext = createContext;
React.default.createContext = createContext;

window.a = React;
window.b = React.default;

require('./setup');
