module.exports = {
  login: process.env.PUNCH_LOGIN || 'marcosrava',
  password: process.env.PUNCH_PWD || 'marcos123',
  downloadDir: process.env.DOWNLOAD_DIR || '/home/marcosrava/Downloads/wget',
  episodesFiles: './episodes.json'
};
