/**
 * 「离线编辑与恢复」实例的 DOM 舞台外壳（与共享 canvas 外壳同一套 cs-* 样式）：
 * 左侧 pane 承载本端 Tiptap 编辑器（或「等待本地库恢复」占位），右侧以只读文本
 * 呈现服务器房间文档的投影（服务器没有编辑器，直接读 Y.XmlFragment），顶部
 * caption 标注两侧身份，底部 readout 呈现派生读数。实例的释放由使用方在舞台
 * 脱离文档时调用 dispose() 完成。
 */
export interface OfflineStage {
  stage: HTMLDivElement;
  editorPane: HTMLDivElement;
  serverPane: HTMLDivElement;
  readout: HTMLDListElement;
}

const STYLE_ID = 'editor-offline-stage-style';

const STYLE_TEXT = `
.eo-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
}

.eo-pane {
  min-width: 0;
  padding: 44px 16px 56px;
  overflow-y: auto;
}

.eo-pane--server {
  background: rgb(226 232 240 / 40%);
}

.eo-pane .tiptap {
  min-height: 100%;
  outline: none;
  font: 14px/1.7 ui-sans-serif, system-ui, sans-serif;
  color: #172033;
}

.eo-pane p {
  margin: 0 0 0.6em;
}

.eo-waiting {
  margin: 0;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
  color: #64748b;
}

.eo-server-view {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font: 14px/1.7 ui-sans-serif, system-ui, sans-serif;
  color: #475569;
}
`;

export function createOfflineStage(
  doc: Document,
  captions: readonly [string, string],
): OfflineStage {
  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    doc.head.append(style);
  }

  const stage = doc.createElement('div');
  stage.className = 'cs-stage';

  const panes = doc.createElement('div');
  panes.className = 'eo-panes';

  const editorPane = doc.createElement('div');
  editorPane.className = 'eo-pane';

  const serverPane = doc.createElement('div');
  serverPane.className = 'eo-pane eo-pane--server';

  panes.append(editorPane, serverPane);

  const captionLeft = doc.createElement('p');
  captionLeft.className = 'cs-caption cs-caption--left';
  captionLeft.textContent = captions[0];

  const captionRight = doc.createElement('p');
  captionRight.className = 'cs-caption cs-caption--right';
  captionRight.textContent = captions[1];

  const readout = doc.createElement('dl');
  readout.className = 'cs-readout';

  stage.append(panes, captionLeft, captionRight, readout);

  return { stage, editorPane, serverPane, readout };
}
