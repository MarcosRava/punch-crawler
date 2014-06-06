#PUNCH Crawler

A crawler to download your animes from http://punchsub.com using your vip account (require wget >= 1.15, nodejs >= 0.10 installed).

http://eternallybored.org/misc/wget/

* continue interrupted downloads
* download movies, episodes and ovas
* force login when session has expired

##Usage

1. Put your anime code on data.json and resolution. example:

  * One Piece:
  * punch url: http://punchsub.com/principal#listar/8/episodios/hd/1
  * code: 8
  * data.json:
    <pre>
    {
      "8": {
        "reso": {
          "eps": "hd", //Episodes resolution,
          "movies": "hd", //Movies resolution
        }
      }
    }
  </pre>
  * adding Soul Eater:
  * punch url: http://punchsub.com/principal#listar/32/episodios/hd/1
  * code: 32
  * data.json:
    <pre>
    {
      "8": {
        "reso": {
          "eps": "hd", //Episodes resolution,
          "movies": "hd", //Movies resolution
        }
      }
    },
      "32": {
         "reso": {
           "eps": "hd", //Episodes resolution,
         }
      }
  }
</pre>
2. adding download directory and punch credentials on config.js
<pre>
    module.exports = {
      login: "fool",
      password: "****",
      downloadDir: "/home/Downloads/"
    };
</pre>
3. run it!
<pre>
  npm install
  node index.js
</pre>

