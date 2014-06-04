var fs = require('fs');
var config = require('./config.js');

function download(url, anime, ep, dir, data, callback) {
  var spawn = require('child_process').spawn;
  var wgetParams = [ '--directory-prefix=' + dir + anime.name, '--trust-server-names', '--continue', url];
  //wgetParams.push('--limit-rate=50k');
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
      process.stdout.write(anime.name + ' ' + ep + ' ' + percent + ' ' + speed + '\r');
      if (percent.trim() === '100%') {
        console.log(anime.name + ' ' + ep + ' ' + percent);
        downloaded(anime, ep);
      }

    }
    if (d.indexOf('The file is already fully retrieved') !== -1)
      downloaded(anime, ep);
  });
  wget.on('exit', function (code) {
    callback(code);
    console.log('Child process exited with exit code ' + code);
  });

  function downloaded(anime, ep, code, status) {
    var type = {"Episódio": 'eps', "Ova": 'ovas', "Filme": 'movies'};
    data[anime.id][type[anime.type.trim()]][ep] = true;
    console.log("writing...");
    fs.writeFileSync(config.episodesFiles, JSON.stringify(data, null, 2));
  }
}

module.exports = download;
