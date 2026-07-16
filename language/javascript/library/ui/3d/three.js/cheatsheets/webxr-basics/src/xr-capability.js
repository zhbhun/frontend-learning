export async function detectImmersiveVrSupport() {
  const result = {
    secureContext: window.isSecureContext,
    hasNavigatorXr: 'xr' in navigator,
    immersiveVrSupported: false,
    errorName: '',
    errorMessage: ''
  };

  if (!result.secureContext || !result.hasNavigatorXr) {
    return result;
  }

  try {
    result.immersiveVrSupported = await navigator.xr.isSessionSupported('immersive-vr');
  } catch (error) {
    result.errorName = error?.name ?? 'UnknownError';
    result.errorMessage = error?.message ?? '无法检测 immersive-vr';
  }

  return result;
}

export function describeCapability(result) {
  if (!result.secureContext) {
    return '当前页面不是 secure context，WebXR 入口保持 fallback。';
  }

  if (!result.hasNavigatorXr) {
    return '浏览器没有 navigator.xr，使用普通 WebGL 对照场景。';
  }

  if (result.errorName) {
    return `检测被拒绝：${result.errorName}`;
  }

  if (!result.immersiveVrSupported) {
    return '当前设备或浏览器不支持 immersive-vr，普通 WebGL 继续渲染。';
  }

  return 'immersive-vr 可用，可以尝试页面里的 VR 按钮。';
}
