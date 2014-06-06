var download = require('./download-manager.js');
var extend = require('extend');
var fs = require('fs');
var config = require('./config.js');
var queue = [];
var url = "http://punchsub.com/";
var request = require('request');
var jcookie = request.jar();
var cheerio = require('cheerio');
var Anime = require('./models/anime.js');
var login = config.login;
var pwd = config.password;
var loginForm = {login: login, senha: pwd, B1: "Entrar"};
var data = require('./data');
var EPISODES_FILE = config.episodesFiles;
var DOWNLOAD_DIR = config.downloadDir;

try {
  extend(true, data, require(EPISODES_FILE));
} catch (e) {}


function getListAnimeById(id, resolution, type, callback) {
  type = type || 'episodios';
  var getUrl = url + 'listar/' + id + '/' + type + '/' + resolution;
  request.get({url: getUrl, json: true}, function (err, resp, body) {
    if (resp.statusCode === 404) {
      console.log('Not Found!');
      callback(404);
    } else {
      var anime = new Anime(body);
      callback(err, anime);
    }
  });
}

function getVipLink(episodeIds, callback) {
  var form = {ids: []};
  for (var i in episodeIds) {
    form.ids.push(episodeIds[i].id);
  }
  request.post({url: url + 'lista-episodios', json: true, form: form, jar: jcookie}, function (err, resp, body) {
    callback(err, body);
  });
}

function doLogin(callback) {
  request.post({
    url: url + 'login',
    json: true,
    jar: jcookie,
    form: loginForm,
    headers: {
      'Host': 'punchsub.com',
      'Origin': 'http://punchsub.,com',
      'Referer': 'http://punchsub.com/principal'
    }
  }, function (err, resp, body) {
    callback(err, body);
  });
}

doLogin(doLoginCallback);

function doLoginCallback(err, _data) {
  var keys = Object.keys(data);
  var j = 0;
  var qi = 0;
  var t = 0;
  var animeId = keys[j];
  var types = ['episodios', 'filmes', 'ovas'];
  var reso = ['eps', 'movies', 'ovas'];
  var type = types[t];
  var resolution = data[animeId].reso[reso[t]];

  if (!resolution)
    loopManager();
  else
    getListAnimeById(animeId, resolution, type, getListCallback);

  function getListCallback(err, anime) {
    if (err) {
      console.log(data[animeId].name + ' ' + reso[t] + ' not found');
    } else {
      data[animeId].name = anime.name;
      for (var i in anime.episodes) {
        var episode = anime.episodes[i];
        data[animeId][reso[t]] = data[animeId][reso[t]] || {};
        if (!data[animeId][reso[t]][episode.number]) {
          console.log('adding ' + anime.name + ' ' + anime.type + ' ' + episode.number + ' to queue');
          data[animeId][reso[t]][episode.number] = false;
          queue.push({anime: anime, episode: episode});
        }
      }
    }
    loopManager();
  }

  function loopManager() {
    j++;
    if (j === keys.length) {
      t++;
      type = types[t];
      j = 0;
      if (t === reso.length) {
        getVipLink([queue[qi].episode], function (err, body) {
          var downloadUrl = url + body[queue[qi].episode.id] + '/';
          var downloadAnime =  queue[qi].anime;
          var episodeNumber = queue[qi].episode.number;
          download(downloadUrl, downloadAnime, episodeNumber, DOWNLOAD_DIR, data, downloadCallback);
        });
        return;
      }
    }
    animeId = keys[j];
    var resolution = data[animeId].reso[reso[t]];

    if (!resolution)
      loopManager();
    else
      getListAnimeById(animeId, resolution, type, getListCallback);
  }

  function downloadCallback(code) {
    if (code !== 0) {
      doLogin(doLoginCallback);
      return;
    }
    qi++;
    if (qi === queue.length) return;
    getVipLink([queue[qi].episode], function (err, body) {
      var downloadUrl = url + body[queue[qi].episode.id] + '/';
      var downloadAnime =  queue[qi].anime;
      var episodeNumber = queue[qi].episode.number;
      download(downloadUrl, downloadAnime, episodeNumber, DOWNLOAD_DIR, data, downloadCallback);
    });
  }
}

process.on('uncaughtException', function (err) {
  console.log("writing...");
  fs.writeFileSync(EPISODES_FILE, JSON.stringify(data, null, 2));
  throw err;
});

process.on('exit', function (err) {
  console.log("writing...");
  fs.writeFileSync(EPISODES_FILE, JSON.stringify(data, null, 2));
});

process.on('SIGINT', function () {
  console.log("writing...");
  fs.writeFileSync(EPISODES_FILE, JSON.stringify(data, null, 2));
  process.exit(0);
});
