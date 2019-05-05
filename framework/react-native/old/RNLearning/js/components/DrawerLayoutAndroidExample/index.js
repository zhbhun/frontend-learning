import ContentTest from './ContentTest';
import LockModeTest from './LockModeTest';
import PositionTest from './PositionTest';
import StatusBarTest from './StatusBarTest';
import EventTest from './EventTest';

export const framework = 'React';

export const displayName = 'DrawerLayoutAndroidExample';

export const title = '<DrawerLayoutAndroid>';

export const description = 'React component that wraps the platform DrawerLayout (Android only). The Drawer (typically used for navigation) is rendered with renderNavigationView and direct children are the main view (where your content goes). The navigation view is initially not visible on the screen, but can be pulled in from the side of the window specified by the drawerPosition prop and its width can be set by the drawerWidth prop.';

export const examples = [
  ContentTest,
  LockModeTest,
  PositionTest,
  StatusBarTest,
  EventTest,
];

