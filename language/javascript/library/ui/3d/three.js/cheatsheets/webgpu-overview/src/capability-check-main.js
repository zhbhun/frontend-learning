import { addMetric, bindButton, bindSelect, clearMetrics, formatError, writeStatus } from './shared-ui.js';

let powerPreference = '';

bindSelect('power-preference', (value) => {
  powerPreference = value;
});
bindButton('run-check', runCapabilityCheck);

runCapabilityCheck();

async function runCapabilityCheck() {
  clearMetrics('capability-list');
  writeStatus('summary-state', '正在检测 WebGPU 能力...');

  const secureContext = window.isSecureContext === true;
  addMetric(
    'capability-list',
    'secure context',
    secureContext ? '通过：当前页面处在安全上下文' : '未通过：WebGPU 需要 HTTPS、localhost 或等价安全上下文',
    secureContext ? 'ok' : 'fail'
  );

  const gpu = navigator.gpu;
  addMetric(
    'capability-list',
    'navigator.gpu',
    gpu ? '存在：可以继续请求 GPUAdapter' : '不存在：当前浏览器或上下文没有暴露 WebGPU 入口',
    gpu ? 'ok' : 'fail'
  );

  if (!secureContext || !gpu) {
    writeStatus('summary-state', '当前环境不能继续请求 WebGPU adapter，页面仍可作为检测模板使用。', 'warn');
    return;
  }

  try {
    const adapterOptions = powerPreference ? { powerPreference } : undefined;
    const adapter = await gpu.requestAdapter(adapterOptions);

    if (!adapter) {
      addMetric('capability-list', 'requestAdapter', '返回 null：浏览器没有提供可用 adapter', 'fail');
      writeStatus('summary-state', 'WebGPU 入口存在，但没有拿到 adapter。', 'warn');
      return;
    }

    addMetric('capability-list', 'requestAdapter', '成功：已取得 GPUAdapter');
    addMetric('capability-list', 'adapter features', formatFeatureList(adapter.features));
    addMetric('capability-list', 'adapter limits', formatLimits(adapter.limits));
    addMetric('capability-list', 'adapter info', formatAdapterInfo(adapter.info));

    const device = await adapter.requestDevice();
    addMetric('capability-list', 'requestDevice', '成功：已取得 GPUDevice，随后主动 destroy 释放检测资源');

    device.lost.then((info) => {
      addMetric('capability-list', 'device lost', `${info.reason || 'unknown'}：${info.message || '没有额外信息'}`, 'warn');
    });

    device.destroy();
    writeStatus('summary-state', '检测完成：当前浏览器可以创建 WebGPU device。');
  } catch (error) {
    addMetric('capability-list', '检测异常', formatError(error), 'fail');
    writeStatus('summary-state', '检测过程中出现异常，通常要检查浏览器开关、驱动或安全上下文。', 'fail');
  }
}

function formatFeatureList(features) {
  const names = Array.from(features ?? []);

  if (names.length === 0) {
    return '没有额外 feature；基础渲染仍可能可用';
  }

  return names.slice(0, 12).join('、') + (names.length > 12 ? ` 等 ${names.length} 项` : '');
}

function formatLimits(limits) {
  if (!limits) {
    return '当前浏览器没有暴露 limits';
  }

  return [
    `maxTextureDimension2D=${limits.maxTextureDimension2D}`,
    `maxBindGroups=${limits.maxBindGroups}`,
    `maxBufferSize=${limits.maxBufferSize}`
  ].join('；');
}

function formatAdapterInfo(info) {
  if (!info) {
    return '当前浏览器没有暴露 adapter.info';
  }

  const pairs = Object.entries(info).filter(([, value]) => value);
  return pairs.length ? pairs.map(([key, value]) => `${key}=${value}`).join('；') : 'adapter.info 没有可显示字段';
}
