var Episode;
var  E_POSITION = {
  "id" : 0,
  "number" : 1,
  "links" : 5
};
var initfunctions = {};

module.exports = (function () {
  function Episode(args) {
    for (var attr in E_POSITION) {
      this[attr] = args[E_POSITION[attr]];
    }
    for (var func in initfunctions) initfunctions[func].call(this);
  }
  return Episode;
})();

