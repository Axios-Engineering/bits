(function() {
  'use strict';

  // For dev logs
  const DEBUG_TAG = 'NETWORK_MGR:BONDING:DEVICE_MANAGER';
  const debug = require('debug')(DEBUG_TAG);
  const bitsLogger = global.LoggerFactory.getLogger();
  const BondingMessenger = require('./bonding-messenger');

  // Node libs
  // const os = require('os');
  // const inspect = require('util').inspect;
  // const UDEV_TYPE = 'gsm';
  // const CONNECTION = require('../nmcli/connection-constants');

  // Bits Libraries

  class BondingManager {

    constructor(nmcliManager) {
      debug('constructor');
      this._nmcliManager = nmcliManager;
      this._messenger = new BondingMessenger(this);
      this._applyPromiseChain = Promise.resolve();
    }

    getDevices() {
      return this._nmcliManager.getDevices()
        .then(devices => devices.map(device => {
          return {
            name: device.name,
            connection: device.connection ? device.connection.name : null
          };
        }));
    }

    bondInterfaces(ifaceArray) {
      debug('ifaceArray', ifaceArray);
      return this.unbondInterfaces(ifaceArray)
        .then(() => {
          const createBondMaster = ['connection', 'add', 'type', 'bond', 'con-name', 'bond0', 'ifname', 'bond0', 'mode', 'balance-rr'];
          return this._nmcliManager.execNmcli(createBondMaster)
            .then(() => ifaceArray.reduce((chain, iface) => {
              return chain.then(() => {
                const connectionName = 'bond-slave-' + iface;
                const createBondSlave = ['connection', 'add', 'type', 'bond-slave', 'con-name', connectionName, 'ifname', iface, 'master', 'bond0'];
                return this._nmcliManager.execNmcli(createBondSlave)
                  .then(() => this._nmcliManager.setConnectionUp(connectionName));
              });
            }, Promise.resolve()));
        })
        .then(() => this._nmcliManager.setConnectionUp('bond0'));
      // nmcli con add type bond con-name mybond0 ifname mybond0 mode active-backup
      // NOTE also try mode 802.3ad which is link aggregation
      //  nmcli con add type bond-slave ifname ens7 master mybond0
      //  nmcli con add type bond-slave ifname ens3 master mybond0
      //  nmcli con up bond-slave-ens7
      //  nmcli con up bond-slave-ens3
      //  nmcli con up bond-mybond0
    }

    unbondInterfaces(ifaceArray) {
      debug('unbondInterfaces', ifaceArray);
      //  return ifaceArray.reduce((chain, iface) => {
      //    return chain.then(() => {
      //      const connectionName = 'bond-slave-' + iface;
      //      return this._nmcliManager.setConnectionDown(connectionName);
      //    })
      //  }, Promise.resolve())
      //    .then(() => this._nmcliManager.execNmcli(['device', 'disconnect', 'bond0']));
      // // TODO delete bond0

      return this._nmcliManager.execNmcli(['device', 'disconnect', 'bond0'])
        .then(() => ifaceArray.reduce((chain, iface) => {
          return chain.then(() => {
            const connectionName = 'bond-slave-' + iface;
            return this._nmcliManager.setConnectionDown(connectionName);
          });
        }, Promise.resolve()));
    }

    applyChanges(config) {
      this._applyPromiseChain = this._applyPromiseChain
        .then(() => {
          if (config.setBondingEnabled) {
            return this.bondInterfaces(config.ifaceArray);
          } else {
            return this.unbondInterfaces(config.ifaceArray);
          }
        })
        .then(() => {
          return bitsLogger.debug('Bond successfully applied');
        })
        .catch(err => {
          bitsLogger.error('Failed to apply Bond!', err);
          this._applyPromiseChain = Promise.resolve();
          throw err;
        });
      return this._applyPromiseChain;
    }

    load(messageCenter) {
      return this._messenger.load(messageCenter);
    }

    unload() {
      return Promise.resolve();
    }

  } // End Class

  module.exports = BondingManager;
})();
