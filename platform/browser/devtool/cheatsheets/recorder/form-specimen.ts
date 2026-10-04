/**
 * 范例介绍：「表单流程标本」——一条完整的小用户流：输入文本 → 选择选项 →
 *   勾选同意 → 提交 → 出现成功态；漏步提交会走校验失败路径。
 * 输入与前置：无网络依赖。Recorder 录制的是真实交互，标本只对真实点击/输入
 *   作反应；Controls 的「重置」开关（recorder.stories.ts）在闭包层调用
 *   reset() 恢复初始态，供再次录制或回放前复位靶场。
 * 主要操作：在表单里输入姓名、选场次、勾选同意、点提交；或点「重置」复位。
 * 预期结果：readout 的「流程进度」五个标记逐个点亮（提交未通过显示 ⚠），
 *   「当前值」实时反映表单状态，「提交结果」在 未提交 / 校验失败 / 已提交
 *   之间切换；成功后 data-testid="success-panel" 可见——它是回放断言的
 *   天然目标。
 * 阅读主线：表单事件（input / change / submit）→ validate() → render()；
 *   所有可交互元素都带 data-testid，对应正文「选择器策略」一节。
 */

/** 场次下拉的选项：value 与显示文案一致，回放时 change 步骤直接以文案为 value。 */
const TOPICS = ['上午场', '下午场', '晚场'] as const;

/** 流程的五个步骤标记，与 readout「流程进度」一一对应。 */
const FLOW_STEPS = ['输入', '选择', '勾选', '提交', '成功'] as const;

/** 校验失败时按流程顺序报第一个缺项，正文「常见问题」的失败路径就落在这里。 */
const VALIDATION_MESSAGES = [
  '还没有输入姓名',
  '还没有选择场次',
  '还没有勾选同意',
] as const;

export interface FormSpecimenInstance {
  /** 恢复初始态：清空输入、隐藏结果面板、流程进度归零。 */
  reset(): void;
  /** 标本的监听都挂在自身子元素上，随 DOM 移除自动释放，这里无事可做。 */
  dispose(): void;
}

interface FlowState {
  name: string;
  topic: string;
  agreed: boolean;
  /** 至少点过一次提交（无论是否通过校验）。 */
  submitted: boolean;
  /** 最近一次提交通过了校验。 */
  success: boolean;
  /** 最近一次提交的校验失败原因。 */
  error: string | null;
}

const SPECIMEN_STYLES = `
.form-specimen {
  margin: 0 auto;
  padding: 14px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #f4f7fc;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.form-specimen__body {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.form-specimen__main {
  flex: 1 1 360px;
  min-width: 0;
  display: grid;
  gap: 10px;
  align-content: start;
}
.form-specimen__title {
  margin: 0;
  font-weight: 700;
  color: #172033;
}
.form-specimen__form {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #dbe3f0;
  border-radius: 6px;
  background: #ffffff;
}
.form-specimen__field {
  display: grid;
  grid-template-columns: 56px 1fr;
  align-items: center;
  gap: 8px;
}
.form-specimen__field--check {
  grid-template-columns: auto auto;
  justify-content: start;
}
.form-specimen__label {
  color: #5d6f8a;
  font-size: 12px;
}
.form-specimen__name,
.form-specimen__topic {
  padding: 5px 8px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #172033;
  font: inherit;
}
.form-specimen__submit {
  justify-self: start;
  padding: 5px 14px;
  border: 1px solid #4f7cff;
  border-radius: 6px;
  background: #4f7cff;
  color: #ffffff;
  font: inherit;
  cursor: pointer;
}
.form-specimen__error {
  margin: 0;
  color: #b45309;
  font-size: 12px;
}
.form-specimen__success {
  padding: 8px 12px;
  border: 1px solid #b7d3b2;
  border-radius: 6px;
  background: #e7f0e4;
  color: #3f5c38;
  font-size: 12px;
}
.form-specimen__hint {
  margin: 0;
  color: #5d6f67;
  font-size: 12px;
}
.form-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.form-specimen__side {
  flex: 1 1 280px;
  display: grid;
  gap: 10px;
  align-content: start;
}
.form-specimen__reset {
  justify-self: start;
  padding: 4px 12px;
  border: 1px solid #b9c6e0;
  border-radius: 6px;
  background: #f6f8fb;
  color: #334155;
  font: 12px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.form-specimen__readout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.form-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.form-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  word-break: break-all;
}
.form-specimen__readout dd[data-warn='true'] {
  color: #b45309;
}
.form-specimen__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
}
.form-specimen__chip {
  padding: 1px 6px;
  border-radius: 10px;
  background: #dbe3f0;
  color: #5d6f8a;
}
.form-specimen__chip[data-state='done'] {
  background: #d7ecd3;
  color: #2f5c2a;
}
.form-specimen__chip[data-state='warn'] {
  background: #fbe6c6;
  color: #92400e;
}
.form-specimen__arrow {
  color: #b9c6e0;
}
`;

export function createFormSpecimen(root: HTMLElement): FormSpecimenInstance {
  root.classList.add('form-specimen');
  root.innerHTML = `
    <div class="form-specimen__body">
      <div class="form-specimen__main">
        <p class="form-specimen__title">报名表单标本 · 输入 → 选择 → 勾选 → 提交</p>
        <form class="form-specimen__form" data-testid="signup-form">
          <label class="form-specimen__field">
            <span class="form-specimen__label">姓名</span>
            <input class="form-specimen__name" data-testid="name-input" type="text" name="name" placeholder="输入任意名字" autocomplete="off" />
          </label>
          <label class="form-specimen__field">
            <span class="form-specimen__label">场次</span>
            <select class="form-specimen__topic" data-testid="topic-select" name="topic">
              <option value="">请选择…</option>
              ${TOPICS.map((topic) => `<option value="${topic}">${topic}</option>`).join('')}
            </select>
          </label>
          <label class="form-specimen__field form-specimen__field--check">
            <input class="form-specimen__agree" data-testid="agree-checkbox" type="checkbox" name="agree" />
            <span class="form-specimen__label">同意接收到场提醒</span>
          </label>
          <button class="form-specimen__submit" data-testid="submit-button" type="submit">提交报名</button>
          <p class="form-specimen__error" data-testid="form-error" hidden></p>
        </form>
        <div class="form-specimen__success" data-testid="success-panel" hidden></div>
        <p class="form-specimen__hint">
          在本页打开 DevTools：<code>More tools → Recorder</code> 对整个 Storybook
          标签页录制这条流程；所有交互元素都带 <code>data-testid</code>；Controls
          的「重置」开关或标本上的重置按钮都可复位。
        </p>
      </div>
      <div class="form-specimen__side">
        <button class="form-specimen__reset" data-testid="reset-button" type="button">重置</button>
        <dl class="form-specimen__readout">
          <dt>流程进度</dt><dd class="form-specimen__steps" data-cell="steps"></dd>
          <dt>当前值</dt><dd data-cell="values">—</dd>
          <dt>提交结果</dt><dd data-cell="result">未提交</dd>
        </dl>
      </div>
    </div>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const form = root.querySelector('.form-specimen__form') as HTMLFormElement;
  const nameInput = root.querySelector('.form-specimen__name') as HTMLInputElement;
  const topicSelect = root.querySelector('.form-specimen__topic') as HTMLSelectElement;
  const agreeCheckbox = root.querySelector('.form-specimen__agree') as HTMLInputElement;
  const errorLine = root.querySelector('.form-specimen__error') as HTMLElement;
  const successPanel = root.querySelector('.form-specimen__success') as HTMLElement;
  const resetButton = root.querySelector('.form-specimen__reset') as HTMLButtonElement;
  const stepsCell = root.querySelector('[data-cell="steps"]') as HTMLElement;
  const valuesCell = root.querySelector('[data-cell="values"]') as HTMLElement;
  const resultCell = root.querySelector('[data-cell="result"]') as HTMLElement;

  let state: FlowState = freshState();

  function freshState(): FlowState {
    return { name: '', topic: '', agreed: false, submitted: false, success: false, error: null };
  }

  function setText(cell: HTMLElement, text: string, warn = false): void {
    if (cell.textContent !== text) {
      cell.textContent = text;
    }
    const nextWarn = warn ? 'true' : 'false';
    if (cell.dataset.warn !== nextWarn) {
      cell.dataset.warn = nextWarn;
    }
  }

  /** 流程五步的到达状态：前四步看表单值与提交动作，最后一步只认校验通过。 */
  function stepStates(): Array<'idle' | 'done' | 'warn'> {
    return [
      state.name !== '' ? 'done' : 'idle',
      state.topic !== '' ? 'done' : 'idle',
      state.agreed ? 'done' : 'idle',
      !state.submitted ? 'idle' : state.success ? 'done' : 'warn',
      state.success ? 'done' : 'idle',
    ];
  }

  function render(): void {
    const states = stepStates();
    const chips = FLOW_STEPS.map((label, index) => {
      const mark = states[index] === 'done' ? ' ✓' : states[index] === 'warn' ? ' ⚠' : '';
      return `<span class="form-specimen__chip" data-step="${index + 1}" data-state="${states[index]}">${label}${mark}</span>`;
    });
    stepsCell.innerHTML = chips.join('<span class="form-specimen__arrow">→</span>');

    setText(
      valuesCell,
      `名字「${state.name || '—'}」 · 场次「${state.topic || '—'}」 · 同意 ${state.agreed ? '是' : '否'}`,
    );

    if (state.success) {
      setText(resultCell, `已提交：${state.name} · ${state.topic}`);
    } else if (state.error) {
      setText(resultCell, `校验失败：${state.error}`, true);
    } else {
      setText(resultCell, '未提交');
    }

    if (state.error && !errorLine.textContent?.includes(state.error)) {
      errorLine.textContent = `${state.error}，补齐后重新提交。`;
    }
    errorLine.hidden = !state.error;
    successPanel.hidden = !state.success;
    if (state.success) {
      successPanel.textContent = `✓ 报名成功：${state.name} · ${state.topic}`;
    }
  }

  /* 校验按流程顺序报第一个缺项：回放漏掉哪一步，失败原因就指向哪一步。 */
  function validate(): string | null {
    if (!state.name) {
      return VALIDATION_MESSAGES[0];
    }
    if (!state.topic) {
      return VALIDATION_MESSAGES[1];
    }
    if (!state.agreed) {
      return VALIDATION_MESSAGES[2];
    }
    return null;
  }

  nameInput.addEventListener('input', () => {
    state.name = nameInput.value.trim();
    render();
  });

  topicSelect.addEventListener('change', () => {
    state.topic = topicSelect.value;
    render();
  });

  agreeCheckbox.addEventListener('change', () => {
    state.agreed = agreeCheckbox.checked;
    render();
  });

  /* 阻止真正的表单提交跳转：流程的「提交」只是页面内的一次状态变化。 */
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    state.submitted = true;
    state.error = validate();
    state.success = state.error === null;
    render();
  });

  resetButton.addEventListener('click', () => {
    resetForm();
  });

  function resetForm(): void {
    state = freshState();
    nameInput.value = '';
    topicSelect.value = '';
    agreeCheckbox.checked = false;
    render();
  }

  render();

  return {
    reset() {
      resetForm();
    },
    dispose() {
      /* 只挂了子元素级监听，随舞台移除自动释放。 */
    },
  };
}
