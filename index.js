/** ***********************************************************************
 * COPYRIGHT (c) 2017 LGS INNOVATIONS - ALL RIGHTS RESERVED
 * LGS INNOVATIONS PROPRIETARY - USE PURSUANT TO COMPANY INSTRUCTIONS
 *************************************************************************/

(() => {
  'use strict';
  const UtilChildPromise = global.utils.UtilChildProcess;
  const NMCLI_CMD = 'nmcli';
  const NMCLI_ARGS = ['-v'];

  // BITS libs
  const BondingManager = require('./server/bonding/bonding-manager');
  const EthernetDeviceManager = require('./server/ethernet/ethernet-device-manager');
  const WifiDeviceManager = require('./server/wifi/wifi-device-manager');
  const CellularDeviceManager = require('./server/cellular/cellular-device-manager');
  const NmcliManager = require('./server/nmcli/nmcli-manager');
  const BridgeManager = require('./server/bridge/bridge-device-manager');
  const RadioManager = require('./server/radio/radio-manager');

  class NetworkManagerApp {
    constructor() {
      this._nmcliManager = new NmcliManager();
      this._wifiDeviceManager = new WifiDeviceManager(this._nmcliManager);
      this._ethernetDeviceManager = new EthernetDeviceManager(this._nmcliManager);
      this._cellularDeviceManager = new CellularDeviceManager(this._nmcliManager);
      this._bondingManager = new BondingManager(this._nmcliManager);
      this._bridgeManager = new BridgeManager(this._nmcliManager);
      this._radioManager = new RadioManager();
    }

    load(messageCenter) {
      return UtilChildPromise.createSpawnPromise(NMCLI_CMD, NMCLI_ARGS)
      .then(result => {
        const test = result.stdout[0].replace(/(\r\n|\n|\r)/gm, '');
        const ver = test.match(/^.*version (\d).(\d.)(\d).*$/);
        if ('0' === ver[1]) {
          return Promise.reject(new Error('Unsupported Hardware/Configuration - Incorrect NMCLI version'));
        }
      })
      .catch(err => {
        // If there is no NMCLI, then we should bail as we can never hope to work
        if ('ENOENT' !== err.code) {
          throw err;
        }
        return Promise.reject(new Error('Unsupported Hardware/Configuration - Incorrect NMCLI version'));
      })
      .then(() => this._nmcliManager.load())
      .then(() => this._wifiDeviceManager.load(messageCenter))
      .then(() => this._ethernetDeviceManager.load(messageCenter))
      .then(() => this._cellularDeviceManager.load(messageCenter))
      .then(() => this._bridgeManager.load(messageCenter))
      .then(() => this._bondingManager.load(messageCenter))
      .then(() => this._radioManager.load(messageCenter));
    }

    unload() {
      return Promise.resolve()
        .then(() => this._radioManager.unload())
        .then(() => this._bridgeManager.unload())
        .then(() => this._bondingManager.unload())
        .then(() => this._cellularDeviceManager.unload())
        .then(() => this._ethernetDeviceManager.unload())
        .then(() => this._wifiDeviceManager.unload())
        .then(() => this._nmcliManager.unload());
    }

  } // End Class

  module.exports = new NetworkManagerApp();
})();
