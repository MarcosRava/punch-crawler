var downloadManager = require('./download-manager.js');
var extend = require('extend');
var fs = require('fs');
var config = require('./config.js');
var queue = [];
var url = "https://punchsub.zlx.com.br/";
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
var Q = require('q');
var headers = {
  //":authority": "punchsub.zlx.com.br",
  //":path:/lista-episodios
  //":scheme": "https",
  "origin" : "https://punchsub.zlx.com.br",
  "referer" :"https://punchsub.zlx.com.br/",
  "user-agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
  "x-firephp-version": "0.0.6",
  "x-requested-with": "XMLHttpRequest"

};
var GLOBALS = {
 qi: 0,
 j: 0,
 t: 0,
 keys: Object.keys(data),
 types: ['episodios', 'filmes', 'ovas'],
 reso: ['eps', 'movies', 'ovas'],
};

try {
  extend(true, data, require(EPISODES_FILE));
} catch (e) {}


function getListAnimeById(id, resolution, type) {
  var deferred = Q.defer();
  var type = type || 'episodios';
  var getUrl = url + 'listar/' + id + '/' + type + '/' + resolution;
  request.get({url: getUrl, json: true, headers: headers}, function (err, resp, body) {
    console.log(getUrl)
    if (err || resp.statusCode === 404) {
      console.log(getUrl, 'Not Found!', err, id);
      console.log(body)
      return deferred.reject(err || resp.statusCode);
    } else {
      var anime = new Anime(body);
      deferred.resolve( anime);
    }
  });
  return deferred.promise;
}

function getVipLink(episodeIds) {
  var deferred = Q.defer();
  var form = {ids: []};
  for (var i in episodeIds) {
    form.ids.push(episodeIds[i].id);
  }
  request.post({url: url + 'lista-episodios', json: true, form: form, jar: jcookie, headers: headers}, function (err, resp, body) {
    if (err || resp.statusCode >= 400) {
      return deferred.reject(err || resp.statusCode);
    }
    //console.log(body, resp.statusCode)
    deferred.resolve(body);
  });
  return deferred.promise;
}

function doLogin() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
  var deferred = Q.defer();
  request.post({
    url: url + 'login',
    json: true,
    headers: headers,
    jar: jcookie,
    form: loginForm,
    headers: {
      'Origin': url,
      'Referer': url
    }
  }, function (err, resp, body) {
    if (err || resp.statusCode >= 400) {
      return deferred.reject(err || body);
    }
    deferred.resolve(body);
  });

  return deferred.promise
}

start();

function start() {
  doLogin()
  .then(function (_data) {
    console.log('logged');
    var animeId = GLOBALS.keys[GLOBALS.j];
    var type = GLOBALS.types[GLOBALS.t];
    var resolution = data[animeId].reso[GLOBALS.reso[GLOBALS.t]];

    var _keys = [];

    for(var k in GLOBALS.keys) {
      var d = data[GLOBALS.keys[k]];
      _keys[k] = {id: GLOBALS.keys[k], priority: d.priority} ;
    }

    _keys = _keys.sort(function(a,b) {
      if (!a.priority && !b.priority) return 0;
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return parseInt(a.priority) - parseInt(b.priority);
    });

    for(var _k in GLOBALS.keys) {
       GLOBALS.keys[_k] = _keys[_k].id;
    }
    if (!resolution)
      loopManager({animeId:animeId, type:type});
    else
      getList(animeId, resolution, type)
  })
  .fail(function (err) {
    console.err(err);
  })
}

function getList(animeId, resolution, type) {
  getListAnimeById(animeId, resolution, type)
  .then(function (anime) {
    data[animeId].name = anime.name;
    for (var i in anime.episodes) {
      var episode = anime.episodes[i];
      data[animeId][GLOBALS.reso[GLOBALS.t]] = data[animeId][GLOBALS.reso[GLOBALS.t]] || {};
      if (!data[animeId][GLOBALS.reso[GLOBALS.t]][episode.number]) {
        console.log('adding ' + anime.name + ' ' + anime.type + ' ' + episode.number + ' to queue');
        data[animeId][GLOBALS.reso[GLOBALS.t]][episode.number] = true;
        queue.push({anime: anime, episode: episode});
      }
    }
    loopManager({animeId:animeId, type:type});
  })
  .fail(function (err) {
    console.log(data[animeId].name + ' ' + GLOBALS.reso[GLOBALS.t] + ' not found ', + err);
    return loopManager();
  })
}

function loopManager(obj) {
  var obj = obj || {};
  var type = obj.type;
  var animeId = obj.animeId;
  GLOBALS.j++;
  if (GLOBALS.j === GLOBALS.keys.length) {
    GLOBALS.t++;
    type = GLOBALS.types[GLOBALS.t];
    GLOBALS.j = 0;
  console.log(GLOBALS.j, 'j', GLOBALS.keys.length,GLOBALS.t, GLOBALS.reso.length)
  console.log([queue[GLOBALS.qi].episode]);
    if (GLOBALS.t === GLOBALS.reso.length) {
      downloadVip([queue[GLOBALS.qi].episode])
      .fail(function (err) {
        console.log('787878788')
        console.err(err);

      });
      return;
    }
  }
  animeId = GLOBALS.keys[GLOBALS.j];
  var resolution = data[animeId].reso[GLOBALS.reso[GLOBALS.t]];

  if (!resolution){
    loopManager({animeId:animeId, type:type});
  }
  else {
    getList(animeId, resolution, type);
  }
}

function download(obj) {
  downloadManager(obj)
  .then (function (result) {
    GLOBALS.qi++;
    if (GLOBALS.qi === queue.length) {
      return;
    }
    return downloadVip([queue[GLOBALS.qi].episode]);
  })
  .fail (function (err) {
    console.err(err);
    console.log('do login again...');
    start();
  })
}

function downloadVip(episode) {
  getVipLink(episode)
  .then(function (body) {
    var linkObj = body[queue[GLOBALS.qi].episode.id];
    var downloadUrl = url + linkObj.versao + '/';
    var downloadAnime =  queue[GLOBALS.qi].anime;
    var episodeNumber = queue[GLOBALS.qi].episode.number;
    var downloadObj = {
          url: downloadUrl,
          anime: downloadAnime,
          ep: episodeNumber,
          dir: DOWNLOAD_DIR,
          data: data
          };
    console.log(downloadObj.url)
    return download(downloadObj);
  })
}

function exit() {
  console.log("writing...");
  fs.writeFileSync(EPISODES_FILE, JSON.stringify(data, null, 2));
}

process.on('uncaughtException', function (err) {
  if (queue && queue.length > 0) {
    //return loopManager();
  }
  console.log("writing...");
  fs.writeFileSync(EPISODES_FILE, JSON.stringify(data, null, 2));
  throw err;
});

process.on('exit', function (err) {
  exit();
});

process.on('SIGINT', function () {
  console.log("writing...");
  fs.writeFileSync(EPISODES_FILE, JSON.stringify(data, null, 2));
  process.exit(0);
});
