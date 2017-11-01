(function() {
  'use strict';

  const CONNECTION = require('../nmcli/connection-constants');
  const IpUtil = require('../util/ip-util');

  const MODES = {
    BRIDGE: 'bridge',
    SHARED: 'shared',
    DHCP: 'dhcp',
    STATIC: 'static',
    NONE: 'none'
  };

  const DEFAULTS = {
    AUTO_CONNECT: true,
    MODE: MODES.NONE,
    SUBNET: null,
    DNS_ONE: null,
    DNS_TWO: null,
    GATEWAY: null
  };

  class EthernetConfig {

    /**
     * Create a new instance of EthernetConfig
     * @param {NetworkDevice} networkDevice - a nmcli NetworkDevice object
     */
    constructor(networkDevice) {
      this.networkDevice = networkDevice;
      this.name = networkDevice.name;
      this.isAutoConnect = this._computeAutoConnect(networkDevice);
      this.mode = this._computeMode(networkDevice);

      let decomposedAddress = this._decomposeNmcliAddresses(networkDevice);
      this.address = decomposedAddress.address;
      this.subnet = decomposedAddress.subnet;

      let decomposedDns = this._decomposeDns(networkDevice);
      this.dnsOne = decomposedDns.one;
      this.dnsTwo = decomposedDns.two;

      this.gateway = this._computeGateway(networkDevice);
      this._connectionUuid = this._computeUuid(networkDevice);
    }

    static get MODES() {
      return MODES;
    }

    _decomposeNmcliAddresses(networkDevice) {
      let decomposedAddress = {address: null, subnet: null};
      if (this.isConnected()) {
        let nmcliAddresses = networkDevice.connection[CONNECTION.DETAILS.IP_V4.ADDRESSES];
        if (nmcliAddresses) {
          return IpUtil.decomposeSlashNotationAddress(nmcliAddresses);
        }
      }
      // Same form object as would be returned but this allows us to
      return decomposedAddress;
    }

    _decomposeDns(networkDevice) {
      let decomposedDns = {one: null, two: null};
      if (this.isConnected()) {
        // DNS is listed as a string of comma separated values: DNS1,DNS2 ipv4.dns: 8.8.8.8,8.8.4.4
        let dns = networkDevice.connection[CONNECTION.DETAILS.IP_V4.DNS];
        if (dns) {
          let dnsArray = dns.split(new RegExp(/,/));
          decomposedDns.one = dnsArray[0];
          decomposedDns.two = dnsArray[1];
        }
      }
      return decomposedDns;
    }

    _computeUuid(networkDevice) {
      if (networkDevice.connection) {
        return networkDevice.connection[CONNECTION.DETAILS.UUID];
      } else {
        return null;
      }
    }
    _computeMode(networkDevice) {
      if (!this.isConnected()) {
        return DEFAULTS.MODE;
      }

      if (networkDevice.connection[CONNECTION.DETAILS.CONNECTION.SLAVE_TYPE] === 'bridge') {
        return 'bridge';
      }

      let method = networkDevice.connection[CONNECTION.DETAILS.IP_V4.METHOD];
      if (method === undefined || method === null) {
        return DEFAULTS.MODE;
      }

      // The nmcli designations do not match dhcp and static exactly so we have to convert
      switch (method) {
        case CONNECTION.VALUES.IP_V4.METHODS.MANUAL:
          return MODES.STATIC;
        case CONNECTION.VALUES.IP_V4.METHODS.AUTO:
          return MODES.DHCP;

        case CONNECTION.VALUES.IP_V4.METHODS.SHARED:
          return MODES.SHARED;
        default:
          return MODES.NONE;
      }
    }

    _computeAutoConnect(networkDevice) {
      if (!this.isConnected()) {
        return DEFAULTS.AUTO_CONNECT;
      }
      return networkDevice.connection[CONNECTION.DETAILS.CONNECTION.AUTO_CONNECT];
    }

    _computeGateway(networkDevice) {
      if (!this.isConnected()) {
        return DEFAULTS.GATEWAY;
      }
      return networkDevice.connection[CONNECTION.DETAILS.IP_V4.GATEWAY];
    }

    isDhcp() {
      return this.mode === MODES.DHCP;
    }

    isConnected() {
      if (this.networkDevice.connection === undefined || this.networkDevice.connection === null || !this.networkDevice.hasOwnProperty('connection')) {
        return false;
      }
      return true;
    }

  }// End Class

  module.exports = EthernetConfig;
})();
