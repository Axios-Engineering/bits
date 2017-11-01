(() => {
  'use strict';

// Node libs
  const EventEmitter = require('events').EventEmitter;
  const fs = require('fs-promise');

// For bits logs
  const logger = global.LoggerFactory.getLogger();
  const VpnConfig = require('./vpn-config');
  const VpnClient = require('../clients/vpn-control-client');
  const VpnRouter = require('./vpn-router.js');
  const VPN_CONFIG_ADDED = 'vpn-config-added';
  const path = require('path');

// Database info
  const KEY_NETWORK_MAN_CONFIG = 'network-manager#vpn#selectedConfig';
  const KEY_NETWORK_MAN_AUTOSTART = 'network-manager#vpn#autostart';
  const VPN_STATUS_CHANGED = 'vpn-status-changed';

  const Daemon = global.utils.Daemon;

  /**
   * VPN Manager
   *
   * Manages the system's vpn
   */
  class VpnManager extends EventEmitter {

    constructor() {
      super();
      this._settingsModel = null;
      this._vpnConfigs = [];
      this._router = new VpnRouter(this);

      this.boundStopVpn = this._stopVpn.bind(this);

      this._openVpn = null;
    }

    load(base) {
      this.base = base;
      return VpnClient.load(base, this)
        .then(() => this.base.getModuleManager().getDataDirectory('network-manager'))
        .then(CONFIGS_DIR => fs.mkdir(path.join(CONFIGS_DIR, 'vpn-configs')))
        .catch(err => Promise.resolve()) // Mkdir if not exists
        .then(() => this._loadConfigs())
        .then(() => this._router.load(base))
        .then(() => base.settingManager.getModel())
        .then(settingsModel => {
          this._settingsModel = settingsModel;
          return this._shouldAutoStart();
        })
        .then(autoStart => {
          return this._getSelectedConfig()
            .then(name => {
              return {autoStart: autoStart, name: name};
            });
        })
        .then(configs => {
          if (configs.autoStart) {
            return this._startVpn(configs.name);
          }
        })
        .catch(err => {
          logger.error('Error loading vpn-manager', err);
          return Promise.reject(err);
        });
    }

    unload(base) {
      this.base = null;
      return this._stopVpn()
        .then(() => this._router.unload(base))
        .then(() => VpnClient.unload(base));
    }

    toggleVpn() {
      if (this._isVpnRunning()) {
        return Promise.resolve()
          .then(() => this._stopVpn());
      }

      return Promise.resolve()
        .then(() => this._startVpn());
    }

    _isVpnRunning() {
      return this._openVpn !== null;
    }

    _startVpn(name) {
      return Promise.resolve()
        .then(() => {
          if (this._openVpn) {
            return this._openVpn.shutdown();
          } else {
            return Promise.resolve();
          }
        })
        .then(() => this._getSelectedConfig())
        .then(name => this._vpnConfigs.find(config => config.getName() === name))
        .then(config => {
          if (config) {
            this._openVpn = new Daemon();
            this._openVpn.once('daemon-exit', this.boundStopVpn);
            return this._openVpn.start('openvpn', ['--config', config.getFilepath()]);
          } else {
            return Promise.resolve();
          }
        })
        .then(() => {
          logger.debug('Vpn has started');
          this.emit(VPN_STATUS_CHANGED, true);
        });
    }

    _stopVpn() {
      return Promise.resolve()
        .then(() => {
          if (this._openVpn) {
            this._openVpn.removeListener('daemon-exit', this.boundStopVpn);
            return this._openVpn.shutdown();
          }
        })
        .then(() => {
          logger.debug('Vpn has shut down');
          this._openVpn = null;
          this.emit(VPN_STATUS_CHANGED, false);
        });
    }

    _shouldAutoStart() {
      return this._settingsModel.findOne({key: KEY_NETWORK_MAN_AUTOSTART})
        .then(setting => {
          if (setting) {
            return setting.value;
          } else {
            return this._settingsModel.create({
              key: KEY_NETWORK_MAN_AUTOSTART,
              value: false
            })
              .then(() => {
                return false;
              });
          }
        });
    }

    _getSelectedConfig() {
      return this._settingsModel.findOne({key: KEY_NETWORK_MAN_CONFIG})
        .then(setting => {
          if (setting) {
            return setting.value;
          } else {
            return this._settingsModel.create({
              key: KEY_NETWORK_MAN_CONFIG,
              value: ''
            })
              .then(() => {
                return '';
              });
          }
        });
    }

    _loadConfigs() {
      return this.base.getModuleManager().getDataDirectory('network-manager')
        .then(CONFIGS_DIR => {
          return fs.readdir(path.join(CONFIGS_DIR, 'vpn-configs'))
            .then(dir => {
              dir.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item)).forEach(filename => {
                this._vpnConfigs.push(new VpnConfig(path.join(CONFIGS_DIR, 'vpn-configs', filename), filename));
              });
            });
        });
    }

    isRunning() {
      return Promise.resolve(this._openVpn !== null);
    }

    getVpnNames() {
      return Promise.all(this._vpnConfigs.map(vpn => {
        return vpn.getName();
      }));
    }

    newConfigs(configs) {
      configs.forEach(config => {
        this._vpnConfigs.push(new VpnConfig(config.path, config.name));
      });
      return this.getVpnNames()
        .then(names => {
          this.emit(VPN_CONFIG_ADDED, names);
        })
        .then(() => {
          logger.debug('Configs updated', configs);
          return configs;
        });
    }

  }// End Class

  module.exports = VpnManager;
})();
