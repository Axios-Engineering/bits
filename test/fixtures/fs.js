(() => {
  'use strict';

  const fs = require('fs');
  const path = require('path');
  const debug = require('debug')('base:UtilFs');

  class UtilFs {
    constructor() {
      throw new Error('do not create an instance');
    }

    static delayBy(timeout) {
      return new Promise(resolve => setTimeout(resolve, timeout));
    }

    static delay(timeout) {
      return UtilFs.delayBy(timeout);
    }

    static stat(path) {
      debug('stat %s', path);
      return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            resolve(stats);
          }
        });
      });
    }

    static lstat(path) {
      debug('lstat %s', path);
      return new Promise((resolve, reject) => {
        fs.lstat(path, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            resolve(stats);
          }
        });
      });
    }

    static readdir(path) {
      debug('readdir %s', path);
      return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
          if (err) {
            reject(err);
          } else {
            resolve(files);
          }
        });
      });
    }

    static mkdir(path, mode) {
      debug('mkdir %s', path);
      return new Promise((resolve, reject) => {
        fs.mkdir(path, mode, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    static _rmdir(path) {
      debug('_rmdir %s', path);
      return new Promise((resolve, reject) => {
        fs.rmdir(path, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    static rmdir(dirpath, options) {
      debug('rmdir %s', dirpath);

      options = options || {};

      const recursive = options.recursive || false;

      if (recursive) {
        return UtilFs.readdir(dirpath)
        .then(filenames => {
          return Promise.all(filenames.map(filename => {
            const filepath = path.resolve(dirpath, filename);
            return UtilFs.stat(filepath)
            .then(stats => {
              if (stats.isDirectory()) {
                return UtilFs.rmdir(filepath, options);
              } else {
                return UtilFs.unlink(filepath);
              }
            });
          }));
        })
        .then(() => {
          return UtilFs._rmdir(dirpath);
        });
      } else {
        return UtilFs._rmdir(dirpath);
      }
    }

    static appendFile(file, data, options) {
      debug('appendFile %s', file);
      return new Promise((resolve, reject) => {
        fs.appendFile(file, data, options, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    static writeFile(file, data, options) {
      debug('writeFile %s', file);
      return new Promise((resolve, reject) => {
        fs.writeFile(file, data, options, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    static readFile(file, options) {
      debug('readFile %s', file);
      return new Promise((resolve, reject) => {
        fs.readFile(file, options, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    static rename(oldPath, newPath) {
      debug('rename %s -> %s', oldPath, newPath);
      return new Promise(function(resolve, reject) {
        fs.rename(oldPath, newPath, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    static unlink(path) {
      debug('unlink %s', path);
      return new Promise((resolve, reject) => {
        fs.unlink(path, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    static copyFile(fromPath, toPath) {
      return new Promise(function(fulfill, reject) {
        // Create the read stream
        var rd = fs.createReadStream(fromPath);
        // Add 'error' event for read stream
        rd.on('error', reject);

        // Create the write stream
        var wr = fs.createWriteStream(toPath);
        // Add 'error' and 'close' events for write stream
        wr.on('error', reject);
        wr.on('close', fulfill);

        // Write the read stream to the write stream
        rd.pipe(wr);
      })
      .catch(err => {
        return UtilFs.unlink(toPath)
        .catch(err => debug('Failed to remove %s after failing to copyFile', toPath, {
          error: {
            name: err.name,
            message: err.message
          }
        }))
        .then(() => Promise.reject(err));
      });
    }

    static createReadStream(path, options) {
      debug('createReadStream %s', path);
      return fs.createReadStream(path, options);
    }

    static createWriteStream(path, options) {
      debug('createWriteStream %s', path);
      return fs.createWriteStream(path, options);
    }

    static readJSON(filename) {
      return UtilFs.readFile(filename, 'utf8').then(JSON.parse);
    }

    static readJsonFiles(arrayOfFilenames) {
      return Promise.all(arrayOfFilenames.map(UtilFs.readJSON));
    }
  }

  module.exports = UtilFs;
})();
