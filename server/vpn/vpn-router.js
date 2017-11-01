(() => {
  'use strict';

  const path = require('path');
  const express = require('express');
  const multer = require('multer');
  const fs = require('fs-promise');
  const UtilOs = require(path.join(global.paths.baseServerDir, 'server/utils/os'));
  const logger = global.LoggerFactory.getLogger();
  const Router = express.Router;

  const vpnRoute = '/api/network-manager';

  class VpnRouter {
    constructor(manager) {
      this._manager = manager;
      this._router = new Router();
      UtilOs.createTemporaryDirectory()
      .then(UPLOADS_DIR => {
        const storage = multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, UPLOADS_DIR);
          }
        });

        const upload = multer({storage: storage});

        this._router.route('/vpn/upload')
        .post(upload.array('file'), (req, res, next) => {
          const files = req.files;

          if (!Array.isArray(files) || 0 >= files.length) {
            return next(new TypeError('request must contain files'));
          }

          const errors = [];
          const warnings = [];

          files.reduce((promise, file) => {
            return promise.then(configs => {
              // This is where we should decrypt it
              return this.base.getModuleManager().getDataDirectory('network-manager')
              .then(CONFIGS_DIR => {
                return fs.rename(file.path, path.join(CONFIGS_DIR, './vpn-configs', file.originalname))
                .then(() => {
                  configs.push({
                    path: path.join(CONFIGS_DIR, './vpn-configs', file.originalname),
                    name: file.originalname
                  });
                  return configs;
                });
              });
            });
          }, Promise.resolve([]))
          .then(configs => {
            return this._manager.newConfigs(configs);
          })
          .then(configs => {
            const response = {
              configs: configs,
              errors: errors,
              warnings: warnings
            };
            const status = (0 < configs.length ? 200 : 400);
            res.status(status).json(response);
          })
          .catch(err => {
            logger.warn('There was an error uploading vpn configs', err);
            next(err);
          });
        });
      });
    }

    load(base) {
      this.base = base;
      return Promise.resolve()
      .then(() => {
        return base.getBaseServer().use(vpnRoute, this._router);
      });
    }

    unload(base) {
      this.base = null;
      return Promise.resolve()
      .then(() => {
        return base.getBaseServer().removeMiddleware(vpnRoute, this._router);
      });
    }

    getRouter() {
      return this._router;
    }
  }
  module.exports = VpnRouter;
})();
