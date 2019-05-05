export default {
  path: 'demo',
  title: 'Demo',
  routes: [
    require('./HelloMessage').default,
    require('./MarkdownEditor').default,
    require('./TicTacToe').default,
    require('./Timer').default,
    require('./TodoApp').default,
  ],
};
