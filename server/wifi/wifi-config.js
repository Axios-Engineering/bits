(function() {
  'use strict';

  const CONNECTION = require('../nmcli/connection-constants');
  const UtilIp = require('../util/ip-util');

  const UI_MODES = {
    BRIDGE: 'bridge',
    HOTSPOT: 'hotspot',
    CLIENT: 'client',
    NONE: 'none'
  };

  const HOTSPOT_REGEX = new RegExp(/ap/);

  class WifiConfig {

    /**
     * Create a new instance of WifiConfig
     * @param {NetworkDevice} networkDevice - a nmcli NetworkDevice object
     */
    constructor(networkDevice) {
      this.networkDevice = networkDevice;
      this.name = this._computeName(networkDevice);
      this.mode = this._computeMode(networkDevice);
      this.hotspot = this._computeHotspot(networkDevice);
      this.client = this._computeClient(networkDevice);
    }

    static get MODES() {
      return UI_MODES;
    }

    calculateDns(address) {
      if (!address || !this.hotspot.address) {
        this.hotspot.resolveBitsId = false;
        return Promise.resolve(this);
      }
      if (UtilIp.areAddressEqual(this.hotspot.address, address)) {
        this.hotspot.resolveBitsId = true;
      } else {
        this.hotspot.resolveBitsId = false;
      }
      return Promise.resolve(this);
    }

    _getModeFromConnection(connection) {
      /*
       We based the mode on the connection name since both client mode and access point mode use
       the same nmcli designation ('infrastructure')
        */
      if (HOTSPOT_REGEX.test(connection[CONNECTION.DETAILS.WIRELESS.MODE])) {
        return UI_MODES.HOTSPOT;
      } else if (connection['connection.mode'] === 'bridge') {
        return 'bridge';
      } else {
        return UI_MODES.CLIENT;
      }
    }

    _computeName(networkDevice) {
      return networkDevice.name;
    }

    _computeMode(networkDevice) {
      let mode = UI_MODES.NONE;
      if (this.isConnected()) {
        mode = this._getModeFromConnection(networkDevice.connection);
      }
      return mode;
    }

    _computeHotspot(networkDevice) {
      const hotspot = {};
      if (this.isConnected() && (this.isHotspot() || this.mode === 'bridge')) {
        hotspot.ssid = networkDevice.connection[CONNECTION.DETAILS.WIRELESS.SSID];
        hotspot.password = networkDevice.connection[CONNECTION.DETAILS.WIRELESS.PASSWORD];
        hotspot.band = networkDevice.connection[CONNECTION.DETAILS.WIRELESS.BAND];
        hotspot.channel = networkDevice.connection[CONNECTION.DETAILS.WIRELESS.CHANNEL];
        hotspot.isAutoConnect = networkDevice.connection[CONNECTION.DETAILS.CONNECTION.AUTO_CONNECT];
        hotspot.address = networkDevice.connection[CONNECTION.DETAILS.IP_V4.ADDRESSES];
      }
      return hotspot;
    }

    _computeClient(networkDevice) {
      let client = {};
      if (this.isConnected() && !this.isHotspot()) {
        client.ssid = networkDevice.connection[CONNECTION.DETAILS.WIRELESS.SSID];
        client.password = networkDevice.connection[CONNECTION.DETAILS.WIRELESS.PASSWORD];
        client.security = networkDevice.connection[CONNECTION.DETAILS.WIRELESS.SECURITY];
        client.isAutoConnect = networkDevice.connection[CONNECTION.DETAILS.CONNECTION.AUTO_CONNECT];
      }
      return client;
    }

    setHotspotConfig(ssid, passphrase, band, channel, isAutoConnect) {
      this.hotspot.ssid = ssid;
      this.hotspot.passphrase = passphrase;
      // TODO parse this from the connection ipv4.addresses
      this.hotspot.address = '10.49.0.1/24';
      this.hotspot.band = band;
      this.hotspot.channel = channel;
      this.hotspot.isAutoConnect = isAutoConnect;
      // TODO somehow maintain this state....
      this.hotspot.resolveBitsId = true;
    }

    setClientConfig(ssid, passphrase, security, signal) {
      this.client.ssid = ssid;
      this.client.passphrase = passphrase;
      this.client.security = security;
      this.client.signal = signal;
    }

    isHotspot() {
      return this.mode === UI_MODES.HOTSPOT;
    }

    isConnected() {
      if (this.networkDevice.connection === undefined || this.networkDevice.connection === null || !this.networkDevice.hasOwnProperty('connection')) {
        return false;
      }
      return true;
    }

  } // End Class

  module.exports = WifiConfig;
})();
