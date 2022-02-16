/* eslint-disable no-restricted-syntax */
/* tslint-disable member-ordering */

/**
 * Effects Plugin
 *
 * Plugin for handling async actions
 */
const effectsPlugin = {
  exposed: {
    // expose effects for access from dispatch plugin
    effects: {},
  },

  // add effects to dispatch so that dispatch[modelName][effectName] calls an effect
  onModel(model) {
    if (!model.effects) {
      return;
    }
    for (const effectName of Object.keys(model.effects)) {
      this.validate([
        [
          !!effectName.match(/\//),
          `Invalid effect name (${model.name}/${effectName})`,
        ],
        [
          typeof model.effects[effectName] !== 'function',
          `Invalid effect (${model.name}/${effectName}). Must be a function`,
        ],
      ]);
      this.effects[`${model.name}/${effectName}`] = model.effects[
        effectName
      ].bind(this.dispatch[model.name]);
      // add effect to dispatch
      // is assuming dispatch is available already... that the dispatch plugin is in there
      this.dispatch[model.name][effectName] = this.createDispatcher.apply(
        this,
        [model.name, effectName],
      );
      // tag effects so they can be differentiated from normal actions
      this.dispatch[model.name][effectName].isEffect = true;
    }
  },

  // process async/await actions
  middleware(store) {
    return next => async (action) => {
      // async/await acts as promise middleware
      if (action.type in this.effects) {
        await next(action);
        return this.effects[action.type](
          action.payload,
          store.getState(),
          action.meta,
        );
      }
      return next(action);
    };
  },
};

export default effectsPlugin;
