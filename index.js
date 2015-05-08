var download = require('./download-manager.js');
var extend = require('extend');
var fs = require('fs');
var config = require('./config.js');
var queue = [];
var url = "http://punchsub.net/";
var request = require('request');
var jcookie = request.jar();
var cheerio = require('cheerio');
var Anime = require('./models/anime.js');
var login = config.login;
var pwd = config.password;
var loginForm = {
  login: login,
  senha: pwd,
  B1: "Entrar"
};
var data = require('./data');
var EPISODES_FILE = config.episodesFiles;
var DOWNLOAD_DIR = config.downloadDir;
var Q = require('q');


extend(true, data, require(EPISODES_FILE));

function getListAnimeById(id, resolution, type) {
  var deferred = Q.defer();
  var type = type || 'episodios';
  var getUrl = url + 'listar/' + id + '/' + type + '/' + resolution;
  request.get({
    url: getUrl,
    json: true
  }, function (err, resp, body) {
    if (err) {
      console.error(err);
      deferred.reject(err);
    }
    if (resp.statusCode === 404) {
      console.log('Not Found!');
      deferred.reject(body);
    } else {
      var anime = new Anime(body);
      deferred.resolve(anime);
    }
  });
  return deferred.promise;
}

function getVipLink(episodeIds) {
  var deferred = Q.defer();
  var form = {
    ids: []
  };
  for (var i in episodeIds) {
    form.ids.push(episodeIds[i].id);
  }
  request.post({
    url: url + 'lista-episodios',
    json: true,
    form: form,
    jar: jcookie
  }, function (err, resp, body) {
    if (err) {
      console.error(err);
      deferred.reject(err);
    }
    if (resp.statusCode === 404) {
      console.log('Not Found!');
      deferred.reject(body);
    } else {
      var anime = new Anime(body);
      deferred.resolve(anime);
    }
  });
  return deferred.promise;
}

function doLogin() {
  var deferred = Q.defer();
  request.post({
    url: url + 'login',
    json: true,
    jar: jcookie,
    form: loginForm,
    headers: {
      'Host': 'punchsub.net',
      'Origin': 'http://punchsub.net',
      'Referer': 'http://punchsub.net/principal'
    }
  }, function (err, resp, body) {
    if (err) {
      return defered.reject(err);
    }
    if (resp.statusCode >= 400) {
      console.error(resp.statusCode, body);
      return deferred.reject(body);
    }
    console.log('logged');
    deferred.resolve(body);
  });
  return deferred.promise;
}

//doLogin(doLoginCallback);
parseData()

function parseData() {
  var deferred = Q.defer();
  doLogin().then(function (body) {
    var keys = Object.keys(data);
    var j = 0;
    var qi = 0;
    var t = 0;
    var animeId = keys[j];
    var types = ['episodios', 'filmes', 'ovas'];
    var reso = ['eps', 'movies', 'ovas'];
    var type = types[t];
    var resolution = data[animeId].reso[reso[t]];

    var _keys = [];

    for (var k in keys) {
      var d = data[keys[k]];
      _keys[k] = {
        id: keys[k],
        priority: d.priority
      };
    }

    _keys = _keys.sort(function (a, b) {
      if (!a.priority && !b.priority) return 0;
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return parseInt(a.priority) - parseInt(b.priority);
    });

    for (var _k in keys) {
      keys[_k] = _keys[_k].id;
    }
    if (!resolution) {
      loopManager();
    } else {
      getList(animeId, resolution, type);
    }
  }).fail(function (err) {
    console.error(err);
  }) ;
}

function loopManager() {
  j++;
  if (j === keys.length) {
    t++;
    type = types[t];
    j = 0;
    if (t === reso.length) {
      getLink([queue[qi].episode]);

      function getLink(episode) {
        getVipLink(episode)
          .then(function (body) {
            var downloadUrl = url + body[queue[qi].episode.id] + '/';
            var downloadAnime = queue[qi].anime;
            var episodeNumber = queue[qi].episode.number;
            makeDownload(downloadUrl, downloadAnime, episodeNumber, DOWNLOAD_DIR, data);
          })
          .fail(function (err) {
            console.error(err, queue[qi].anime.name, queue[qi].episode.number);
          });
      }
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

function makeDownload(code) {
  download(downloadUrl, downloadAnime, episodeNumber, DOWNLOAD_DIR, data)
    .then(function (code) {
      qi++;
      if (qi === queue.length) return;
      getVipLink(episode)
        .then(function (body) {
          var downloadUrl = url + body[queue[qi].episode.id] + '/';
          var downloadAnime = queue[qi].anime;
          var episodeNumber = queue[qi].episode.number;
          makeDownload(downloadUrl, downloadAnime, episodeNumber, DOWNLOAD_DIR, data);
        })
        .fail(function (err) {
          console.error(err, queue[qi].anime.name, queue[qi].episode.number);
        });
    })
    .fail(function (code) {
      parseData();
    })
}

function getList(animeId, resolution, type) {
  getListAnimeById(animeId, resolution, type)
    .then(function (anime) {
      data[animeId].name = anime.name;
      for (var i in anime.episodes) {
      console.log(i)
        var episode = anime.episodes[i];
        data[animeId][reso[t]] = data[animeId][reso[t]] || {};
        if (!data[animeId][reso[t]][episode.number]) {
          console.log('adding ' + anime.name + ' ' + anime.type + ' ' + episode.number + ' to queue');
          data[animeId][reso[t]][episode.number] = false;
          queue.push({
            anime: anime,
            episode: episode
          });
        }
      }

      loopManager();
    })
    .fail(function (err) {
      console.log(data[animeId].name + ' ' + reso[t] + ' not found', err);
      loopManager();
    });
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
