export function sceneSource(source) {
  return {
    docs: {
      source: {
        type: 'code',
        language: 'jsextra',
        code: source
      }
    }
  };
}
