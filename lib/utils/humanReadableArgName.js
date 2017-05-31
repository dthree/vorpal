/**
 * Makes an argument name pretty for help.
 */
module.exports = function humanReadableArgName(arg) {
  const name = arg.name + (arg.variadic ? '...' : '');

  return arg.required ? `<${name}>` : `[${name}]`;
};
