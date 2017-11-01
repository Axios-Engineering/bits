(function() {
  'use strict';

  // For dev logs
  const DEBUG_TAG = 'NETWORK_MGR:CELLULAR:DEVICE_MANAGER';
  const debug = require('debug')(DEBUG_TAG);
  const bitsLogger = global.LoggerFactory.getLogger();
  const NetworkDeviceManager = require('../network-device-manager');
  const UtilChildProcess = global.helper.ChildProcess;
  const CellularMessenger = require('./cellular-messenger');

  // Node libs
  // const os = require('os');
  // const inspect = require('util').inspect;
  const UDEV_TYPE = 'gsm';
  // const CONNECTION = require('../nmcli/connection-constants');

  // Bits Libraries

  class CellularDeviceManager extends NetworkDeviceManager {

    constructor(nmcliManager) {
      debug('constructor');
      super(nmcliManager, CellularMessenger, UDEV_TYPE, 'gsm');
      this._applyPromiseChain = Promise.resolve();
    }

    get EVENTS() {
      return super.EVENTS;
    }

    /**
     * Get an array of cellular configs
     * @override
     * @return {promise} to get modems
     */
    getDevices() {
      return this._nmcliManager.getDevices()
        .then(devices => devices.filter(device => {
          return device.type === 'gsm';
        }))
        .then(devices => devices.map(device => {
          debug('getDevices', device.connection);
          return {
            name: device.name,
            isDataEnabled: Boolean(device.connection),
            connection: device.connection ? device.connection.name : null,
            // TODO find the apn property
            apn: device.connection ? device.connection['gsm.apn'] : null
          };
        }));
    }

    startCellularData(config) {
      debug('startCellularData', config);
      // TODO cleanup into an mmcli parser maybe? or extend our modem manager to do this
      return this.stopCellularData(config)
        .then(() => UtilChildProcess.createSpawnPromise('mmcli', ['-L']))
        .then(result => {
          return result.stdout.reduce((matches, line) => {
            let match = line.match(/\/org\/freedesktop\/ModemManager1\/Modem\/(\d+?)\s/g);
            if (match) {
              return matches.concat(match);
            } else {
              return matches;
            }
          }, []);
        })
        .then(result => {
          return Promise.all(result.map(modemRaw => {
            let modem = (/\/org\/freedesktop\/ModemManager1\/Modem\/(\d+?)\s/g).exec(modemRaw)[1];
            return UtilChildProcess.createSpawnPromise('mmcli', ['-e', '-m', modem])
              .then(() => UtilChildProcess.createSpawnPromise('mmcli', ['-m', modem, '--3gpp-register-home']));
          }));
        })
        .then(() => {
          debug('creating connection');
          const paramsForNmcli = ['connection', 'add', 'type', 'gsm', 'con-name', config.name, 'ifname', config.name, 'apn', config.apn, '--', 'connection.autoconnect', 'no'];
          return this._nmcliManager.execNmcli(paramsForNmcli);
        })
        .then(() => {
          debug('set connection up');
          return this._nmcliManager.setConnectionUp(config.name);
        });
    }

    stopCellularData(config) {
      return this._nmcliManager.setConnectionDown(config.name);
    }

    /**
     * Handler for message center apply
     * @param {object} config - the cellular config object to apply
     * @return {promise} - to apply
     */
    applyChanges(config) {
      this._applyPromiseChain = this._applyPromiseChain
        .then(() => {
          if (config.isDataEnabled) {
            return this.startCellularData(config);
          } else {
            return this.stopCellularData(config);
          }
        })
        .then(() => {
          return bitsLogger.debug('Cellular config successfully applied');
        })
        .catch(err => {
          bitsLogger.error('Failed to apply Cellular configs!', err);
          return Promise.reject(err);
        });
      return this._applyPromiseChain;
    }

  } // End Class

  module.exports = CellularDeviceManager;
})();
