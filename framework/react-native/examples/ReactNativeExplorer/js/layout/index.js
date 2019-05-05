import Box from './Box';
import Flexbox from './Flexbox';

export default {
  path: 'layout',
  component: {
    title: 'Layout',
    description: '',
  },
  childRoutes: [
    Box,
    Flexbox,
  ],
};
