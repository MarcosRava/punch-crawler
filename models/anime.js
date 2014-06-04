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
  "dashName": 9,
};
var initfunctions = {};

module.exports = (function () {
  function Anime(args) {
    for (var attr in P_POSITION) {
      this[attr] = args.p[P_POSITION[attr]];
    }
    for (var func in initfunctions) initfunctions[func].call(this);
    this.episodes = {};
    for (var epi in args.e) {
      var episode = new Episode(args.e[epi]);
      this.episodes[episode.number] = episode;
    }
  }
  return Anime;
})();

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
