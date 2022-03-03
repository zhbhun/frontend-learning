/**
 * deprecate
 *
 * handles deprecation warnings in development
 */
export default (warning) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(warning);
  }
};
