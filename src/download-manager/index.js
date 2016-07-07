/*jslint indent: 2, node: true*/
"use strict";

var fs = require('fs');
var config = require('../../config.js');
var path = require('path');
var newLine = process.platform.indexOf('win') !== -1 ? '\x0D\x0A' : '\r';
var Promise = require('bluebird');

function downloaded(data, anime, ep, code, status) {
  var type = {"Episódio": 'eps', "Ova": 'ovas', "Filme": 'movies'};
  data[anime.id][type[anime.type.trim()]][ep] = true;
  console.log("writing...");
  fs.writeFileSync(config.episodesFiles, JSON.stringify(data, null, 2));
}

function download(obj) {
  return new Promise(function (resolve, reject) {
    obj = obj || {};
    var wget, util, length, indexOfPcent, percent, speed,
      url = obj.url,
      anime = obj.anime,
      ep = obj.ep,
      dir = obj.dir,
      data = obj.data,
      spawn = require('child_process').spawn,
      directory = path.resolve(dir, anime.name.replace(/[^a-z0-9]/gi, '_')),
      wgetParams = [ '--directory-prefix=' + directory, '--no-check-certificate', '--continue', url];
    wgetParams.push('--trust-server-names');
    if (config.limitRate) {
      wgetParams.push('--limit-rate=' + config.limitRate);
    }
    wget = spawn('wget', wgetParams);
    util = require('util');

    wget.stderr.on('data', function (buffer, code) {
      var d = buffer.toString();
      if (d.indexOf('Length:') !== -1) {
        length = parseInt(d.substring(d.indexOf(': ') + 2, d.indexOf(' (')), 10);
      }
      if (d.indexOf('% ') !== -1) {
        indexOfPcent = d.indexOf('%');
        percent = d.substring(indexOfPcent - 3, indexOfPcent + 1);
        speed = d.substring(indexOfPcent + 2, indexOfPcent + 7);
        process.stdout.write(anime.name + ' ' + ep + ' ' + percent + ' ' + speed + newLine);
        //process.stdout.write(d);
        if (percent.trim() === '100%') {
          console.log(anime.name + ' ' + ep + ' ' + percent);
          downloaded(data, anime, ep);
        }

      }
      if (d.indexOf('The file is already fully retrieved') !== -1) {
        downloaded(data, anime, ep);
      }
    });
    wget.on('exit', function (code) {
      if (code === 0) {
        resolve({code: code});
      } else {
        reject({code: code});
      }
      console.log('Child process exited with exit code ' + code);
    });


    return;
  });
}

module.exports = download;
