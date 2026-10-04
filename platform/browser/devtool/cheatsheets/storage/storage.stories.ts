import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import specimenSource from './storage-specimen.ts?raw';
import {
  createStorageSpecimen,
  type StorageActionId,
  type StorageSpecimenInstance,
  type StorageTargetId,
} from './storage-specimen';

interface SpecimenArgs {
  target: StorageTargetId;
  action: StorageActionId;
}

/*
  与其他课程的 DOM 标本相同的生命周期：舞台只创建一次，参数变化只触发一次操作；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
*/
const renderSpecimen = (() => {
  let stage: HTMLElement | undefined;
  let instance: StorageSpecimenInstance | undefined;

  return (args: SpecimenArgs) => {
    if (!stage || !instance) {
      stage = document.createElement('div');
      instance = createStorageSpecimen(stage);

      const observedStage = stage;
      const observedInstance = instance;
      requestAnimationFrame(() => {
        const parent = observedStage.parentElement;
        if (!parent) {
          return;
        }

        const observer = new MutationObserver(() => {
          if (!observedStage.isConnected) {
            observer.disconnect();
            observedInstance.dispose();

            if (stage === observedStage) {
              stage = undefined;
              instance = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    instance.update(args);
    return stage;
  };
})();

const meta = {
  id: 'storage',
  title: '应用与安全/浏览器存储调试',
  tags: ['!dev'],
  args: {
    target: 'local',
    action: 'write',
  },
  argTypes: {
    target: {
      name: '存储类型',
      description:
        '选择要操作的存储；打开 DevTools 的 Application 面板，在左侧树对应分栏对照观察写入的数据。',
      control: {
        type: 'select',
        labels: {
          local: 'localStorage（持久键值对）',
          session: 'sessionStorage（会话级键值对）',
          cookie: 'Cookies（字段级编辑）',
          indexeddb: 'IndexedDB（demo-notes，只读查看）',
          cache: 'Cache Storage（demo-assets-v1，只读查看）',
        },
      },
      options: ['local', 'session', 'cookie', 'indexeddb', 'cache'],
    },
    action: {
      name: '操作',
      description:
        '对该存储执行一次真实读写：write 写入 3 条样例、read 读取回显、remove 删除一条样例、clear 清空该类存储。',
      control: {
        type: 'select',
        labels: {
          write: 'write（写入 3 条样例）',
          read: 'read（读取并回显）',
          remove: 'remove（删除一条样例）',
          clear: 'clear（清空该类存储）',
        },
      },
      options: ['write', 'read', 'remove', 'clear'],
    },
  },
  render: renderSpecimen,
  parameters: storySource(specimenSource),
} satisfies Meta<SpecimenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Specimen: Story = {};
