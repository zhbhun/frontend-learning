import { addons } from 'storybook/manager-api';

addons.setConfig({
  layoutCustomisations: {
    showToolbar: () => false,
    // Docs 页下方只服务组件工作台的 Addon panel 对阅读器是噪音。
    showPanel: () => false,
  },
});
