/*jslint indent: 2, node: true, nomen: true*/
"use strict";

var Anime;
var Episode = require('./episode.js');
var  P_POSITION = {
  "id" : 0,
  "name" : 1,
  "_progress" : 2,
  "_tags": 3,
  "status": 4,
  "sinopse": 6,
  "resolutions": 7,
  "type": 8,
  "dashName": 9
};
var initfunctions = {};

module.exports = (function () {
  function Anime(args) {
    var attr, func, ep, episode;
    for (attr in P_POSITION) {
      this[attr] = args.p[P_POSITION[attr]];
    }
    for (func in initfunctions) {
      initfunctions[func].call(this);
    }
    this.episodes = {};
    for (ep in args.e) {
      episode = new Episode(args.e[ep]);
      this.episodes[episode.number] = episode;
    }
  }
  return Anime;
}());

initfunctions.setTags = function setTags() {
  this.tags = this._tags.split(', ');
  delete this._tags;
};

initfunctions.setProgress = function setProgress() {
  var split = this._progress.split('/');
  this.total = split[1];
  this.totalReleased = split[0];
  delete this._progress;
};
