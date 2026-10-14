/**
 * 「Tiptap 协同接入」实例的 DOM 舞台外壳（与共享 canvas 外壳等价的 DOM 版）：
 * 左右两个 pane 分别承载客户端 A 的编辑器与客户端 B 的只读投影，顶部 caption
 * 标注两端身份（左右 caption 同时存在时共享样式会自动画出中缝分隔线），底部
 * readout 呈现派生读数。实例的释放由使用方在舞台脱离文档时调用 dispose() 完成。
 */
export interface RelayStage {
  stage: HTMLDivElement;
  paneA: HTMLDivElement;
  paneB: HTMLDivElement;
  readout: HTMLDListElement;
}

const STYLE_ID = 'tiptap-setup-stage-style';

const STYLE_TEXT = `
.ts-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
}

.ts-pane {
  min-width: 0;
  padding: 44px 16px 56px;
  overflow-y: auto;
}

.ts-pane--readonly {
  background: rgb(226 232 240 / 40%);
}

.ts-pane .tiptap {
  min-height: 100%;
  outline: none;
  font: 14px/1.7 ui-sans-serif, system-ui, sans-serif;
  color: #172033;
}

.ts-pane--readonly .tiptap {
  color: #475569;
}

.ts-pane p {
  margin: 0 0 0.6em;
}
`;

export function createRelayStage(
  doc: Document,
  captions: readonly [string, string],
): RelayStage {
  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    doc.head.append(style);
  }

  const stage = doc.createElement('div');
  stage.className = 'cs-stage';

  const panes = doc.createElement('div');
  panes.className = 'ts-panes';

  const paneA = doc.createElement('div');
  paneA.className = 'ts-pane';

  const paneB = doc.createElement('div');
  paneB.className = 'ts-pane ts-pane--readonly';

  panes.append(paneA, paneB);

  const captionA = doc.createElement('p');
  captionA.className = 'cs-caption cs-caption--left';
  captionA.textContent = captions[0];

  const captionB = doc.createElement('p');
  captionB.className = 'cs-caption cs-caption--right';
  captionB.textContent = captions[1];

  const readout = doc.createElement('dl');
  readout.className = 'cs-readout';

  stage.append(panes, captionA, captionB, readout);

  return { stage, paneA, paneB, readout };
}
