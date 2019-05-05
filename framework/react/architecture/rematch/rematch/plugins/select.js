export const select = {};

const selectPlugin = ({
  sliceState = (rootState, model) => rootState[model.name],
}) => ({
  exposed: { select },
  onInit() {
    this.validate([
      [
        typeof sliceState !== 'function',
        `The selectPlugin's getState config must be a function. Instead got type ${typeof sliceState}.`,
      ],
    ]);
  },
  onModel(model) {
    select[model.name] = {};

    Object.keys(model.selectors || {}).forEach((selectorName) => {
      this.validate([
        [
          typeof model.selectors[selectorName] !== 'function',
          `Selector (${model.name}/${selectorName}) must be a function`,
        ],
      ]);
      select[model.name][selectorName] = (state, ...args) =>
        model.selectors[selectorName].apply(state, [
          sliceState(state, model),
          ...args,
        ]);
    });
  },
});

export default selectPlugin;
