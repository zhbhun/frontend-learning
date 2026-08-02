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

      // stage 被 Storybook 从 DOM 移除时（导航离开当前 docs 页），释放场景资源与
      // WebGL 上下文。否则连续浏览多个含 Canvas 的课程时，旧上下文累积会撞到
      // 浏览器每标签页约 16 个的 WebGL 上下文上限。stage 此时还未挂载，挂载后
      // 再监听它的父级（Storybook 的 #root），childList 变化即代表 stage 被清走。
      requestAnimationFrame(() => {
        const parent = stage.parentElement;
        if (!parent) {
          return;
        }

        const observer = new MutationObserver(() => {
          if (!stage.isConnected) {
            observer.disconnect();
            // 先让课程自己停渲染循环、dispose three.js 资源（已实现 dispose 的课程）。
            instance?.dispose?.();
            // 再强制丢失 canvas 的 WebGL 上下文，腾出浏览器的上下文配额。上下文
            // 丢失时绑定其上的 GPU 资源（纹理/buffer/program）一并释放，所以即使
            // 课程没实现 dispose，也不会留下占配额的旧上下文。canvas.getContext
            // 在已有上下文的画布上返回同一实例，不会新建上下文。
            stage.querySelectorAll('canvas').forEach((canvas) => {
              try {
                const gl =
                  canvas.getContext('webgl2') || canvas.getContext('webgl');
                gl?.getExtension('WEBGL_lose_context')?.loseContext();
              } catch {
                // 上下文已丢失或不可用时忽略。
              }
            });
          }
        });
        observer.observe(parent, { childList: true });
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
