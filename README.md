#PUNCH Crawler

A crawler to download your animes from http://punchsub.com using your vip account (require wget installed).

* continue interrupted downloads
* download movies, episodes and ovas
* force login when session has expired

##Usage

1. Put your anime code on data.json and resolution. example:

  * One Piece:
  * punch url: http://punchsub.com/principal#listar/8/episodios/hd/1
  * code: 8
  * data.json:
        {
          "8": {
            "reso": {
              "eps": "hd", //Episodes resolution,
              "movies": "hd", //Movies resolution
            }
          }
        }
  * adding Soul Eater:
  * punch url: http://punchsub.com/principal#listar/32/episodios/hd/1
  * code: 32
  * data.json:
          {
            "8": {
              "reso": {
                "eps": "hd", //Episodes resolution,
                "movies": "hd", //Movies resolution
              }
            },
            "32": {
              "reso": {
                "eps": "hd", //Episodes resolution,
              }
            }
          }
2. adding download directory and punch credentials on config.js
        module.exports = {
          login: "fool",
          password: "****",
          downloadDir: "/home/Downloads/"
        };
3. run it!
        node index.js


**Note:** when program stop, data.json will be modified with anime episodes
