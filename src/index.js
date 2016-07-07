/*jslint indent: 2, node: true, nomen: true*/
"use strict";

var request = require('request-promise');
var cheerio = require('cheerio');
var Promise = require('bluebird');
var promiseChain = require('promise-chain');
var extend = require('extend');
var fs = require('fs');
var path = require('path');

var downloadManager = require('./download-manager');
var config = require('../config.js');
var Anime = require('./models/anime.js');
var data = require('../data');
var url = "https://punchsub.zlx.com.br/";

var jcookie = request.jar();
var login = config.login;
var pwd = config.password;
var loginForm = {login: login, senha: pwd, B1: "Entrar"};
var headers = {};
var tries = 0;
var EPISODES_FILE = path.resolve(__dirname, '../', config.episodesFiles);
var DOWNLOAD_DIR = config.downloadDir;
var ANIME_IDS = Object.keys(data);
var ANIME_CONTENT_TYPE = {
  'eps': {
    str: 'episodios',
    key: 'eps'
  },
  'movies': {
    str: 'filmes',
    key: 'movies'
  },
  'ovas': {
    str: 'ovas',
    key: 'ovas'
  }
};

extend(true, data, require(EPISODES_FILE));

function doLogin() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  return request.post({
    url: url + 'login',
    json: true,
    jar: jcookie,
    form: loginForm,
    simple: false, // to allow redirect
    headers: {
      'Origin': url,
      'Referer': url
    }
  });
}

function getVipLink(episodeIds) {
  var form = {ids: episodeIds}, i;
  return request({uri: url + 'lista-episodios', method: 'POST', json: true, form: form, jar: jcookie, headers: headers})
    .then(function (body) {
      if (!body) {
        throw new Error("Maybe you are not logged in");
      }
      return body;
    });
}

function downloadVip() {
  var item = this;
  var episode = item.episode,
    anime = item.anime;
  return getVipLink([episode.id])
  .then(function (body) {
    var linkObj = body[episode.id];
    var downloadUrl = url + linkObj.versao + '/';
    var downloadObj = {
      url: downloadUrl,
      anime: anime,
      ep: episode.number,
      dir: DOWNLOAD_DIR,
      data: data
    };
    console.log(downloadObj.url, 'Saving on', DOWNLOAD_DIR);
    return downloadManager(downloadObj);
  })
}


function sortByPriority(a, b) {
  var animeA = data[a],
    animeB = data[b];
  if (!animeA.priority && !animeB.priority) {
    return 0;
  }
  if (animeA.priority && !animeB.priority) {
    return -1;
  }
  if (!animeA.priority && animeB.priority) {
    return 1;
  }
  return parseInt(animeA.priority, 10) - parseInt(animeB.priority, 10);
}

function getListAnimeById(id, resolution, type) {
  var content = type.str,
    getUrl = url + 'listar/' + id + '/' + content + '/' + resolution;

  return request.get({url: getUrl, json: true, headers: headers})
    .then(function (body) {
      var anime = new Anime(body);
      return anime;
    })
      .catch(function (err) {
      if (err.statusCode === 404) {
        console.error("Not found!", data[id].name, resolution, type.str);
      }
  });
}

function getList() {
  var animeId = this.animeId, resolution = this.resolution, type = this.type;
  if (!resolution) {
    console.log('not in data', data[animeId].name, type.str);
    return Promise.resolve();
  }
  return getListAnimeById(animeId, resolution, type)
    .then(function (anime) {
      if (!anime) {
        return ;
      }
      data[animeId].name = anime.name;
      var i, episode, animeData, promises, queue = [];
      console.log('verifying ', anime.name, type.str);
      for (i in anime.episodes) {
        episode = anime.episodes[i];
        animeData = data[animeId][type.key] || {};
        if (!animeData[episode.number]) {
          console.log('adding ' + anime.name + ' ' + anime.type + ' ' + episode.number + ' to queue');
          animeData[episode.number] = false;
          data[animeId][type.key] = animeData;
          queue.push({anime: anime, episode: episode});
        }
      }
      promises = Array.apply(null, Array(queue.length)).map(Function.prototype.valueOf, downloadVip);
      return promiseChain(promises, queue);
    })
    .catch(function (err) {
      console.log(data[animeId].name + ' id: ' + animeId, err);
      throw err;
    });
}

function populate(resource) {
  var i, promises, j, context = [];

  ANIME_IDS = ANIME_IDS.sort(sortByPriority);

  for (i = 0; i < ANIME_IDS.length; i++) {
    var animeId = ANIME_IDS[i];
    var animeData = data[animeId];
    for (j in animeData.reso) {
      var type = ANIME_CONTENT_TYPE[j];
      var resolution = animeData.reso[j];
      console.log('anime', i+1, 'of',  ANIME_IDS.length, animeData.name, type.str);
      context.push({animeId: animeId, resolution: resolution, type: type})
    }
  }
  promises = Array.apply(null, Array(context.length)).map(Function.prototype.valueOf, getList);
  return promiseChain(promises, context);
}

doLogin().then(populate)
.catch(function (err) {
  console.log(err);
  exit(err);
})

function exit(err) {
  console.log("writing... \nexit", err);
  fs.writeFileSync(EPISODES_FILE, JSON.stringify(data, null, 2));
  if (err && err.code === 8 && tries < 3) {
    tries++;
    setTimeout(function () {
      tries--;
    }, 360000)
    return doLogin().then(populate)
      .catch(function (err) {
        console.log(err);
        exit(err);
      });
  }
}

process.on('uncaughtException', function (err) {
  exit(err);
});

process.on('exit', function (err) {
  exit(err);
});

process.on('SIGINT', function (err) {
  exit(err);
  process.exit(0);
});
