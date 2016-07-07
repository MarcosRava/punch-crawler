/*jslint indent: 2, node: true, nomen: true*/
"use strict";

var Episode;
var E_POSITION = {
  "id" : 0,
  "number" : 1,
  "links" : 5
};
var initfunctions = {};

module.exports = (function () {
  function Episode(args) {
    var attr, func;
    for (attr in E_POSITION) {
      this[attr] = args[E_POSITION[attr]];
    }
    for (func in initfunctions) {
      initfunctions[func].call(this);
    }
  }
  return Episode;
}());

