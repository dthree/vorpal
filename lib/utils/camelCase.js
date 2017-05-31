module.exports = function camelCase(string) {
  return string.split('-').reduce((str, word) => str + word[0].toUpperCase() + word.slice(1));
};
