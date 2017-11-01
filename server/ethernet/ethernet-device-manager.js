(() => {
  'use strict';

  const bitsLogger = global.LoggerFactory.getLogger();

    // Bits Libraries
  const NMCLI = require('../nmcli/nmcli-constants');

  const EventEmitter = require('events');

  const EthernetConfig = require('./ethernet-config');
  const IpUtil = require('../util/ip-util');
  const Messenger = require('./ethernet-messenger');
  const BRIDGE_NAME = 'br0';

  class EthernetDeviceManager extends EventEmitter {
    constructor(nmcliManager) {
      super();
      this._nmcliManager = nmcliManager;
      this._messenger = new Messenger(this);
      this._nmcliType = nmcliManager.DEVICE.TYPES.ETHERNET;

      this._promiseChain = Promise.resolve();
    }

    list() {
      return this._nmcliManager.getDevices()
          .then(devices => devices.filter(device => this._nmcliType === device.type))
          .then(filteredDevices => {
            return filteredDevices.map(device => {
              return new EthernetConfig(device);
            });
          });
    }

    update(config) {
        // data [{ name, dhcp, ip, netmask, gateway, dns1, dns2}]
      this._promiseChain = this._promiseChain.then(() => {
        switch (config.mode) {

          case EthernetConfig.MODES.BRIDGE:
            return Promise.resolve()
            .then(() => this._applyBridge(config));

          case EthernetConfig.MODES.SHARED:
            return this._validateShared(config)
                  .then(validConfig => this._applyShared(validConfig));

          case EthernetConfig.MODES.DHCP:
                // TODO create dhcp oneline
            return this._validateDhcp(config)
                  .then(validConfig => this._applyDhcp(validConfig));

          case EthernetConfig.MODES.STATIC:
            return this._validateStatic(config)
                  .then(validConfig => this._applyStatic(validConfig));

          case EthernetConfig.MODES.NONE:
                // TODO figure out what to do if we get a mode none...probably just do the dhcp thing for now or ignore
            return Promise.resolve()
                  .then(() => this._applyNone(config));

          default:
            return Promise.reject('Unknown mode');
        }
      })
          .then(() => {
            bitsLogger.debug('Successfully set the ethernet config');
          })
          .catch(err => {
            bitsLogger.error('Error setting ethernet config', err);
            return Promise.reject(err);
          });

      const chain = this._promiseChain;
      this._promiseChain = this._promiseChain.catch(err => {
        bitsLogger.error('Error setting ethernet config', err);
      });
      return chain;
    }

    _validateDhcp(config) {
        // TODO figure out if we need to validate anything here but for now just return since we ignore the other params
        // We set to true for ethernet always just in case. This way an interface will always attempt to come up
      config.isAutoConnect = true;
      return Promise.resolve(config);
    }

    _validateShared(config) {
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
        // We set to true for ethernet always just in case. This way an interface will always attempt to come up
      config.isAutoConnect = true;

      if (!IpUtil.isValidIpV4Address(config.address)) {
        return Promise.reject('Invalid IPv4 address!', config.address);
      }

      if (!IpUtil.isValidIpV4Address(config.subnet)) {
        return Promise.reject('Invalid IPv4 subnet!', config.subnet);
      }

      if (config.gateway && !IpUtil.isValidIpV4Address(config.gateway)) {
        return Promise.reject('Invalid IPv4 gateway!', config.gateway);
      }

      if (config.dnsOne && !IpUtil.isValidIpV4Address(config.dnsOne)) {
        return Promise.reject('Invalid IPv4 dnsOne!', config.dnsOne);
      }

      if (config.dnsTwo && !IpUtil.isValidIpV4Address(config.dnsTwo)) {
        return Promise.reject('Invalid IPv4 dnsTwo!', config.dnsTwo);
      }

        // If no problems just resolve the config
      return Promise.resolve(config);
    }

    _applyBridge(config) {
      const iface = config.name;

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
    }

    _applyNone(config) {
      return this._nmcliManager.setConnectionDown(config.name);
    }

    _applyDhcp(config) {
        // For DHCP we don't even need to tell nmcli anything, it will automatically configure the connection
        // nmcli c add type ethernet con-name test1 ifname enx847beb55af6b autoconnect yes
      const cmd = [
        NMCLI.OPTIONS.CONNECTION,
        NMCLI.OPTIONS.ADD,
        NMCLI.OPTIONS.TYPE,
        NMCLI.OPTIONS.ETHERNET,
        NMCLI.OPTIONS.CON_NAME,
        config.name,
        NMCLI.OPTIONS.IFNAME,
        config.name,
        NMCLI.OPTIONS.AUTOCONNECT,
        NMCLI.OPTIONS.YES
      ];

      return this._nmcliManager.setConnectionDown(config.name)
          .then(() => this._nmcliManager.execNmcli(cmd))
          .then(() => this._nmcliManager.setConnectionUp(config.name));
    }

    _applyShared(config) {
      let cmd = [
        NMCLI.OPTIONS.CONNECTION,
        NMCLI.OPTIONS.ADD,
        NMCLI.OPTIONS.TYPE,
        NMCLI.OPTIONS.ETHERNET,
        NMCLI.OPTIONS.CON_NAME,
        config.name,
        NMCLI.OPTIONS.IFNAME,
        config.name,
        NMCLI.OPTIONS.AUTOCONNECT,
        NMCLI.OPTIONS.YES,
        NMCLI.ARGS.DOUBLE_DASH,
        NMCLI.CONNECTION_KEYS.IP_V4.METHOD,
        NMCLI.CONNECTION_VALS.IP_V4.METHODS.SHARED,
        NMCLI.CONNECTION_KEYS.IP_V4.ADDRESSES,
        IpUtil.composeSlashNotationAddress(config.address, config.subnet)
      ];

      return this._nmcliManager.setConnectionDown(config.name)
        .then(() => this._nmcliManager.execNmcli(cmd))
        .then(() => this._nmcliManager.setConnectionUp(config.name));
    }

    _applyStatic(config) {
      // create static connection ONELINE
      // nmcli con add type ethernet con-name test-lab ifname enx847beb55af6b autoconnect yes -- ipv4.method manual ipv4.addresses 10.10.10.10/24 ipv4.gateway 10.10.10.254 ipv4.dns "8.8.8.8 8.8.4.4"

      let cmd = [
        NMCLI.OPTIONS.CONNECTION,
        NMCLI.OPTIONS.ADD,
        NMCLI.OPTIONS.TYPE,
        NMCLI.OPTIONS.ETHERNET,
        NMCLI.OPTIONS.CON_NAME,
        config.name,
        NMCLI.OPTIONS.IFNAME,
        config.name,
        NMCLI.OPTIONS.AUTOCONNECT,
        NMCLI.OPTIONS.YES,
        NMCLI.ARGS.DOUBLE_DASH,
        NMCLI.CONNECTION_KEYS.IP_V4.METHOD,
        NMCLI.CONNECTION_VALS.IP_V4.METHODS.MANUAL,
        NMCLI.CONNECTION_KEYS.IP_V4.ADDRESSES,
        IpUtil.composeSlashNotationAddress(config.address, config.subnet)
      ];

      if (config.gateway) {
        cmd = cmd.concat([
          NMCLI.CONNECTION_KEYS.IP_V4.GATEWAY,
          config.gateway
        ]);
      }

      if (config.dnsOne && config.dnsTwo) {
        cmd = cmd.concat([
          NMCLI.CONNECTION_KEYS.IP_V4.DNS,
          config.dnsOne + ',' + config.dnsTwo
        ]);
      } else if (config.dnsOne) {
        cmd = cmd.concat([
          NMCLI.CONNECTION_KEYS.IP_V4.DNS,
          config.dnsOne
        ]);
      } else if (config.dnsTwo) {
        cmd = cmd.concat([
          NMCLI.CONNECTION_KEYS.IP_V4.DNS,
          config.dnsTwo
        ]);
      }

      return this._nmcliManager.setConnectionDown(config.name)
        .then(() => this._nmcliManager.execNmcli(cmd))
        .then(() => this._nmcliManager.setConnectionUp(config.name));
    }

    load(messageCenter) {
      return this._messenger.load(messageCenter);
    }

    unload(messageCenter) {
      return this._messenger.unload(messageCenter);
    }

  } // End Class

  module.exports = EthernetDeviceManager;
})();
