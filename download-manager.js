var fs = require('fs');
var config = require('./config.js');
var path = require('path');
var Q = require('q');

var newLine = process.platform.indexOf('win') !== -1 ? '\033[0G': '\r';
function download(url, anime, ep, dir, data) {
  var deferred = Q.defer();
  var spawn = require('child_process').spawn;
  var directory = path.resolve(dir, anime.name.replace(/[^a-z0-9]/gi, '_'));
  var wgetParams = [ '--directory-prefix=' + directory, '--continue', url];
  wgetParams.push('--trust-server-names');
  if (config.limitRate)
    wgetParams.push('--limit-rate=' + config.limitRate);
  var wget = spawn('wget', wgetParams);
  var util = require('util');
  var length;
  wget.stderr.on('data', function (data, code) {
    var d = data.toString();
    if (d.indexOf('Length:') !== -1) {
      length = parseInt(d.substring(d.indexOf(': ') + 2, d.indexOf(' (')));
    }
    if (d.indexOf('% ') !== -1) {
      var indexOfPcent = d.indexOf('%');
      var percent = d.substring(indexOfPcent - 3, indexOfPcent + 1);
      var speed = d.substring(indexOfPcent + 2, indexOfPcent + 7);
      process.stdout.write(anime.name + ' ' + ep + ' ' + percent + ' ' + speed + newLine);
      //process.stdout.write(d);
      if (percent.trim() === '100%') {
        console.log(anime.name + ' ' + ep + ' ' + percent);
        downloaded(anime, ep);
      }

    }
    if (d.indexOf('The file is already fully retrieved') !== -1)
      downloaded(anime, ep);
  });
  wget.on('exit', function (code) {
    console.log('Child process exited with exit code ' + code);
    if (code == 0) {
      deferred.resolve(code);
    }
    else {
      deferred.reject(code);
    }
  });

  function downloaded(anime, ep, code, status) {
    var type = {"Episódio": 'eps', "Ova": 'ovas', "Filme": 'movies'};
    data[anime.id][type[anime.type.trim()]][ep] = true;
    console.log("writing...");
    fs.writeFileSync(config.episodesFiles, JSON.stringify(data, null, 2));
  }

  return deferred.promise;
}

module.exports = download;
