(() => {
  'use strict';

  const Daemon = global.helper.Daemon;
  const BaseModuleApi = global.helper.BaseModuleApi;
  const UtilFs = global.helper.FS;
  const path = require('path');
  const logger = global.LoggerFactory.getLogger();
  const CONFIGS_DIR = 'hostapd-configs';
  const WifiConfig = require('../wifi-config');
  const ActivityApi = global.helper.BaseActivityApi;

  class HostApdService {
    constructor() {
      this._daemons = {};

      this._boundStdout = this._stdout.bind(this);
      this._boundStderr = this._stderr.bind(this);
      this._boundError = this._onError.bind(this);

      this._timeout = {};
    }

    load(messageCenter) {
      this._activityApi = new ActivityApi(messageCenter);
      this._moduleApi = new BaseModuleApi(messageCenter);
      return Promise.resolve()
      .then(() => this._moduleApi.getDataDirectory('network-manager'))
      .then(dataDir => {
        this._hostApdConfigs = path.resolve(dataDir, CONFIGS_DIR);
        return this._ensureDirectoryExists(this._hostApdConfigs);
      })
      .then(() => UtilFs.readdir(this._hostApdConfigs))
      .then(files => {
        return files.map(file => {
          const configPath = path.resolve(this._hostApdConfigs, file);
          const name = file.split('.')[0];
          this._daemons[name] = new Daemon('hostapd', [configPath], {restart: true});
          this._daemons[name].interface = name; // Super hacky dont do this. I am sorry programming gods
          this._daemons[name].on('stdout', this._boundStdout);
          this._daemons[name].on('stderr', this._boundStderr);
          this._daemons[name].on('error', this._boundError);
          return this._daemons[name].start();
        });
      });
    }

    unload() {
      return Promise.resolve()
      .then(() => Object.keys(this._daemons).map(name => {
        this._daemons[name].removeListener('stdout', this._boundStdout);
        this._daemons[name].removeListener('stderr', this._boundStderr);
        this._daemons[name].removeListener('error', this._boundError);
        return this._daemons[name].shutdown()
        .then(() => {
          delete this._daemons[name];
        });
      }));
    }

    _stdout(data) {
      logger.debug(data.toString());
    }

    _stderr(data) {
      logger.warn(data.toString());
    }

    _onError(what, daemon) {
      const inter = daemon.interface;
      const configPath = path.resolve(this._hostApdConfigs, inter + '.conf');

      if (!this._timeout[inter]) {
        this._timeout[inter] = {timeout: null, count: 0};
      }
      clearTimeout(this._timeout[inter].timeout);
      this._timeout[inter].timeout = setTimeout(() => {
        this._timeout[inter].count = 0;
      }, 10000);
      this._timeout[inter].count += 1;

      // Timeout occured
      if (3 < this._timeout[inter].count) {
        clearTimeout(this._timeout[inter].timeout);
        return this._daemons[inter].shutdown()
        .then(() => {
          this._daemons[inter].removeListener('stdout', this._boundStdout);
          this._daemons[inter].removeListener('stderr', this._boundStderr);
          this._daemons[inter].removeListener('error', this._boundError);
          delete this._daemons[inter];
        })
        .then(() => this._activityApi.create({title: 'Error with starting ' + inter + ': reseting interface to off', projectName: 'Network Manager', icon: 'icons:error'}))
        .then(() => UtilFs.unlink(configPath))
        .catch(err => {
          logger.error('Could not shutdown access point');
        });
      }
    }

    getConnection(device) {
      const configPath = path.join(this._hostApdConfigs, device.name + '.conf');
      return Promise.resolve()
      .then(() => UtilFs.readFile(configPath))
      .then(contents => {
        const config = {};
        const params = contents.toString().split('\n');
        params.forEach(line => {
          const parsed = line.split('=');
          if (parsed.length === 2) {
            const key = parsed[0];
            const value = parsed[1];
            config[key] = value;
          }
        });
        return config;
      })
      .then(config => {
        const entry = {};
        const wifiKey = '802-11-wireless';
        const wifiSecurity = '802-11-wireless-security';

        const connectionKey = 'connection';

        entry[connectionKey + '.autoconnect'] = 'yes';
        entry['connection.mode'] = 'bridge';

        // Used to match the nmcli configs
        entry[`${wifiKey}.ssid`] = config.ssid;
        entry[`${wifiSecurity}.psk`] = config.wpa_passphrase;
        entry[`${wifiSecurity}.key-mgmt`] = 'wpa-psk';
        entry[`${wifiKey}.band`] = 'bg';
        entry[`${wifiKey}.channel`] = config.channel;

        device.connection = entry;
        return device;
      })
      .catch(err => {
        return Promise.resolve(device);
      })
      .then(newDevice => {
        return new WifiConfig(newDevice);
      });
    }
    shutdownAccessPoint(name) {
      const configPath = path.resolve(this._hostApdConfigs, name + '.conf');
      return Promise.resolve()
      .then(() => {
        if (this._daemons[name]) {
          this._daemons[name].removeListener('stdout', this._boundStdout);
          this._daemons[name].removeListener('stderr', this._boundStderr);
          this._daemons[name].removeListener('error', this._boundError);
          return this._daemons[name].shutdown()
          .then(() => {
            delete this._daemons[name];
          });
        }
      })
      .then(() => UtilFs.unlink(configPath));
    }

    createHotspot(config) {
      const configPath = path.resolve(this._hostApdConfigs, config.name + '.conf');
      return Promise.resolve()
      .then(() => UtilFs.unlink(configPath))
      .catch(() => Promise.resolve())
      .then(() => UtilFs.writeFile(configPath, this._generateConfigString(config)))
      .then(() => {
        if (this._daemons[config.name]) {
          this._daemons[name].removeListener('stdout', this._boundStdout);
          this._daemons[name].removeListener('stderr', this._boundStderr);
          this._daemons[name].removeListener('error', this._boundError);
          return this._daemons[config.name].shutdown()
          .then(() => {
            delete this._daemons[config.name];
          });
        } else {
          return Promise.resolve();
        }
      })
      .then(() => {
        this._daemons[config.name] = new Daemon('hostapd', [configPath], {restart: true});
        this._daemons[config.name].interface = config.name;
        this._daemons[config.name].on('stdout', this._boundStdout);
        this._daemons[config.name].on('stderr', this._boundStderr);
        this._daemons[config.name].on('error', this._boundError);

        return this._daemons[config.name].start();
      });
    }

    _generateConfigString(config) {
      const ssid = `ssid=${config.hotspot.ssid}\n`;
      const password = `wpa_passphrase=${config.hotspot.password}\n`;
      const inter = `interface=${config.name}\n`;
      const bridge = 'bridge=br0\n';
      const channel = `channel=${config.hotspot.channel}\n`;
      const mode = 'hw_mode=g\n';
      const driver = 'driver=nl80211\n';
      const enc = 'rsn_pairwise=CCMP\n';
      const wpaVersion = 'wpa=2\n';
      const wpaKeyMgmt = 'wpa_key_mgmt=WPA-PSK\n';
      const wpaPairwise = 'wpa_pairwise=TKIP CCMP';

      return ssid + password + inter + bridge + channel + mode + driver + enc + wpaVersion + wpaKeyMgmt + wpaPairwise;
    }

    _ensureDirectoryExists(dir) {
      return UtilFs.mkdir(dir)
      .catch(err => {
        if (err.code === 'EEXIST') {
          return Promise.resolve();
        } else {
          return Promise.reject(err);
        }
      });
    }

  }// End Class

  module.exports = HostApdService;
})();
