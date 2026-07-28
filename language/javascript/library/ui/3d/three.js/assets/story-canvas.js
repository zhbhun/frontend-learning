/*
把命令式的 three.js 场景接到 Storybook 的 args 上。

Storybook 每次改动 args 都会重新调用 render，如果每次都新建场景就会不断创建 WebGL 上下文，
很快撞到浏览器的上下文数量上限。所以这里在闭包里只建一次舞台和场景实例，之后每次 render
都复用同一个 DOM 节点，只把新的 args 应用到实例上。

readout 显示 Controls 面板给不出的派生值，例如可见观察盒尺寸、矩阵里实际生效的 fov。
captions 用于分屏场景，给左右两个视图各标一个说明。
*/

const READOUT_INTERVAL = 100;

export function sceneStory({ create, apply, readout, captions }) {
  let stage;
  let instance;
  let readoutEl;
  let lastPaint = 0;

  return (args) => {
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'cs-stage';

      const canvas = document.createElement('canvas');
      stage.append(canvas);

      captions?.forEach((text, index) => {
        const caption = document.createElement('p');
        caption.className = index === 0 ? 'cs-caption cs-caption--left' : 'cs-caption cs-caption--right';
        caption.textContent = text;
        stage.append(caption);
      });

      if (readout) {
        readoutEl = document.createElement('dl');
        readoutEl.className = 'cs-readout';
        stage.append(readoutEl);
      }

      instance = create(canvas, (snapshot) => {
        if (!readoutEl) {
          return;
        }

        // 场景每帧都推快照，这里限速到 10fps，避免读数刷新拖慢渲染。
        const now = performance.now();
        if (now - lastPaint < READOUT_INTERVAL) {
          return;
        }
        lastPaint = now;
        paint(readoutEl, readout(snapshot));
      });
    }

    apply(instance, args);
    return stage;
  };
}

function paint(root, entries) {
  if (root.childElementCount !== entries.length * 2) {
    root.replaceChildren();

    for (const [label] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      root.append(term, document.createElement('dd'));
    }
  }

  const terms = root.querySelectorAll('dt');
  const values = root.querySelectorAll('dd');

  entries.forEach(([label, value], index) => {
    const text = String(value);

    if (terms[index].textContent !== label) {
      terms[index].textContent = label;
    }

    if (values[index].textContent !== text) {
      values[index].textContent = text;
    }
  });
}
