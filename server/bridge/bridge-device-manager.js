(() => {
  'use strict';

  // Bits Libraries
  const NMCLI = require('../nmcli/nmcli-constants');

  const EventEmitter = require('events');

  const EthernetConfig = require('../ethernet/ethernet-config');

  const BridgeConfig = require('./bridge-config');
  const IpUtil = require('../util/ip-util');
  const Messenger = require('./bridge-messenger');

  const logger = global.LoggerFactory.getLogger();

  const BRIDGE_NAME = 'br0';

  const DEFAULT_EMPTY_CONFIG = {
    name: 'br0',
    type: 'bridge',
    connection: null,
    state: 'inactive',
    isAvailable: false,
    consumer: null
  };
  class BridgeDeviceManager extends EventEmitter {
    constructor(nmcliManager) {
      super();
      this._nmcliManager = nmcliManager;
      this._messenger = new Messenger(this);
      this._nmcliType = nmcliManager.DEVICE.TYPES.Bridge;

      this._nmcliType = 'bridge';
      this._slaveType = 'bridge-slave';

      this._promiseChain = Promise.resolve();
    }

    list() {
      return this._nmcliManager.getDevices()
        .then(devices => devices.filter(device => this._nmcliType === device.type))
        .then(filteredDevices => {
          return filteredDevices.map(device => {
            return new BridgeConfig(device);
          });
        })
        .then(configs => {
          if (configs.length === 0) {
            return [new BridgeConfig(DEFAULT_EMPTY_CONFIG)]; // Super hacky way to ensure the same ui
          } else {
            return configs;
          }
        });
    }

    _listSlaves() {
      return this._nmcliManager.getConnections()
        .then(devices => devices.filter(device => {
          return this._slaveType === device.type;
        }))
        .then(filteredDevices => {
          return filteredDevices.map(device => {
            return new EthernetConfig(device);
          });
        });
    }
    update(config) {
      // data [{ name, dhcp, ip, netmask, gateway, dns1, dns2}]
      this._promiseChain = this._promiseChain
        .then(() => {
          switch (config.mode) {

            case BridgeConfig.MODES.SHARED:
              return this._validateShared(config)
                .then(validConfig => this._applyShared(validConfig));

            case BridgeConfig.MODES.DHCP:
              // TODO create dhcp oneline
              return this._validateDhcp(config)
                .then(validConfig => this._applyDhcp(validConfig));

            case BridgeConfig.MODES.STATIC:
              return this._validateStatic(config)
                .then(validConfig => this._applyStatic(validConfig));

            case BridgeConfig.MODES.NONE:
              // TODO figure out what to do if we get a mode none...probably just do the dhcp thing for now or ignore
              return Promise.resolve()
                .then(() => this._applyNone(config));

            default:
              return Promise.reject('Unknown mode');
          }
        });

      const chain = this._promiseChain;
      this._promiseChain = this._promiseChain.catch(err => {
        logger.error('Error setting bridge config', err);
      });
      return chain;
    }

    delete(config) {
      return this._nmcliManager.setConnectionDown(BRIDGE_NAME);
    }

    _validateChildren(config) {
      if (!config.ifaceArray || config.ifaceArray.length <= 0) {
        logger.error('Invalid child array', config);
        return Promise.reject(new Error('Invalid iface array'));
      } else {
        return Promise.resolve(config);
      }
    }
    _setUpChildren(config) {
      return Promise.all(config.ifaceArray.map(iface => {
        const cmd = [
          NMCLI.OPTIONS.CONNECTION,
          NMCLI.OPTIONS.ADD,
          NMCLI.OPTIONS.TYPE,
          NMCLI.OPTIONS.BRIDGE_SLAVE,
          NMCLI.OPTIONS.CON_NAME,
          iface,
          NMCLI.OPTIONS.IFNAME,
          iface,
          NMCLI.OPTIONS.AUTOCONNECT,
          NMCLI.OPTIONS.YES,
          NMCLI.OPTIONS.MASTER,
          BRIDGE_NAME
        ];

        return this._nmcliManager.setConnectionDown(iface)
          .then(() => this._nmcliManager.execNmcli(cmd))
          .then(() => this._nmcliManager.setConnectionUp(iface));
      }));
    }

    _validateDhcp(config) {
      // TODO figure out if we need to validate anything here but for now just return since we ignore the other params
      // We set to true for Bridge always just in case. This way an interface will always attempt to come up
      config.isAutoConnect = true;
      return Promise.resolve(config);
    }

    _validateShared(config) {
      // We set to true for Bridge always just in case. This way an interface will always attempt to come up
      // We set to true for ethernet always just in case. This way an interface will always attempt to come up
      config.isAutoConnect = true;

      if (!IpUtil.isValidIpV4Address(config.address)) {
        return Promise.reject('Invalid IPv4 address!', config.address);
      }

      if (!IpUtil.isValidIpV4Address(config.subnet)) {
        return Promise.reject('Invalid IPv4 subnet!', config.subnet);
      }

      // If no problems just resolve the config
      return Promise.resolve(config);
    }

    _validateStatic(config) {
      // We set to true for Bridge always just in case. This way an interface will always attempt to come up
      // We set to true for ethernet always just in case. This way an interface will always attempt to come up
      config.isAutoConnect = true;

      if (!IpUtil.isValidIpV4Address(config.address)) {
        return Promise.reject('Invalid IPv4 address!', config.address);
      }

      if (!IpUtil.isValidIpV4Address(config.subnet)) {
        return Promise.reject('Invalid IPv4 subnet!', config.subnet);
      }

      // If no problems just resolve the config
      return Promise.resolve(config);
    }

    _applyNone(config) {
      return this._nmcliManager.setConnectionDown(config.name)
      .then(() => this._reasignChildren(config));
    }

    _applyDhcp(config) {
      // For DHCP we don't even need to tell nmcli anything, it will automatically configure the connection
      // nmcli c add type Bridge con-name test1 ifname enx847beb55af6b autoconnect yes
      const cmd = [
        NMCLI.OPTIONS.CONNECTION,
        NMCLI.OPTIONS.ADD,
        NMCLI.OPTIONS.TYPE,
        NMCLI.OPTIONS.BRIDGE,
        NMCLI.OPTIONS.CON_NAME,
        BRIDGE_NAME,
        NMCLI.OPTIONS.IFNAME,
        BRIDGE_NAME,
        NMCLI.OPTIONS.AUTOCONNECT,
        NMCLI.OPTIONS.YES,
        '--',
        'bridge.stp',
        'no'
      ];

      return this._nmcliManager.setConnectionDown(BRIDGE_NAME)
        .then(() => this._nmcliManager.execNmcli(cmd))
        .then(() => this._nmcliManager.setConnectionUp(BRIDGE_NAME))
        .then(() => this._reasignChildren(config));
    }

    _applyShared(config) {
      let cmd = [
        NMCLI.OPTIONS.CONNECTION,
        NMCLI.OPTIONS.ADD,
        NMCLI.OPTIONS.TYPE,
        NMCLI.OPTIONS.BRIDGE,
        NMCLI.OPTIONS.CON_NAME,
        BRIDGE_NAME,
        NMCLI.OPTIONS.IFNAME,
        BRIDGE_NAME,
        NMCLI.OPTIONS.AUTOCONNECT,
        NMCLI.OPTIONS.YES,
        NMCLI.ARGS.DOUBLE_DASH,
        'bridge.stp',
        'no',
        NMCLI.CONNECTION_KEYS.IP_V4.METHOD,
        NMCLI.CONNECTION_VALS.IP_V4.METHODS.SHARED,
        NMCLI.CONNECTION_KEYS.IP_V4.ADDRESSES,
        IpUtil.composeSlashNotationAddress(config.address, config.subnet)
      ];

      return this._nmcliManager.setConnectionDown(config.name)
        .then(() => this._nmcliManager.execNmcli(cmd))
        .then(() => this._nmcliManager.setConnectionUp(config.name))
        .then(() => this._reasignChildren(config));
    }

    _applyStatic(config) {
      // create static connection ONELINE
      // nmcli con add type Bridge con-name test-lab ifname enx847beb55af6b autoconnect yes -- ipv4.method manual ipv4.addresses 10.10.10.10/24 ipv4.gateway 10.10.10.254 ipv4.dns "8.8.8.8 8.8.4.4"

      let cmd = [
        NMCLI.OPTIONS.CONNECTION,
        NMCLI.OPTIONS.ADD,
        NMCLI.OPTIONS.TYPE,
        NMCLI.OPTIONS.BRIDGE,
        NMCLI.OPTIONS.CON_NAME,
        BRIDGE_NAME,
        NMCLI.OPTIONS.IFNAME,
        BRIDGE_NAME,
        NMCLI.OPTIONS.AUTOCONNECT,
        NMCLI.OPTIONS.YES,
        NMCLI.ARGS.DOUBLE_DASH,
        'bridge.stp',
        'no',
        NMCLI.CONNECTION_KEYS.IP_V4.METHOD,
        'static',
        NMCLI.CONNECTION_KEYS.IP_V4.ADDRESSES,
        IpUtil.composeSlashNotationAddress(config.address, config.subnet)
      ];

      if (config.gateway) {
        cmd = cmd.concat([
          NMCLI.CONNECTION_KEYS.IP_V4.GATEWAY,
          config.gateway
        ]);
      }

      return this._nmcliManager.setConnectionDown(config.name)
        .then(() => this._nmcliManager.execNmcli(cmd))
        .then(() => this._nmcliManager.setConnectionUp(config.name))
        .then(() => this._reasignChildren(config));
    }

    _reasignChildren(config) {
      return this._nmcliManager.getConnections()
      .then(connections => {
        return Promise.all(connections.map(connection => {
          return this._nmcliManager.getConnectionDetails(connection)
            .then(details => {
              if (details['connection.master'] === 'br0') {
                if (config.mode !== 'none') {
                  return this._nmcliManager.setConnectionUp(connection.name);
                } else if (details['connection.master'] === 'br0') {
                  return this._nmcliManager.setConnectionDown(connection.name);
                }
              }
            });
        }));
      });
    }
    load(messageCenter) {
      return this._messenger.load(messageCenter);
    }

    unload(messageCenter) {
      return this._messenger.unload(messageCenter);
    }

  } // End Class

  module.exports = BridgeDeviceManager;
})();
