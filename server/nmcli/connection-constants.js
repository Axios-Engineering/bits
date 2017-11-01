(() => {
  'use strict';

  /**
   * Linux nmcli connection keys.
   * These match the connection key stored in the /etc/NetworkManager/system-connections/ connection file definitions
   * @type {{BSSID: string, MODE: string}}
   */
    // TODO eventually delete these after switching to the details
  const FIELDS = {
    BSSID: '802-11-wireless.mac-address',
    MODE: '802-11-wireless.mode',
    AUTO_CONNECT: 'connection.autoconnect',
    SSID: '802-11-wireless.ssid',
    SECURITY: '802-11-wireless-security.key-mgmt',
    PASSWORD: '802-11-wireless-security.psk',
    BAND: '802-11-wireless.band',
    CHANNEL: '802-11-wireless.channel',
    IPV4_METHOD: 'ipv4.method',
    UUID: 'connection.uuid',
    CONNECTION_NAME: 'connection.id',
    CONNECTION_TYPE: 'connection.type',
    INTERFACE_NAME: 'connection.interface-name'
  };

  // TODO start using these and add more here instead of FIELDS
  const DETAILS = {
    CONNECTION: {
      UUID: 'connection.uuid',
      NAME: 'connection.id',
      TYPE: 'connection.type',
      INTERFACE_NAME: 'connection.interface-name',
      AUTO_CONNECT: 'connection.autoconnect',
      SLAVE_TYPE: 'connection.slave-type'
    },
    // TODO start using these and add more here
    WIRELESS: {
      BSSID: '802-11-wireless.mac-address',
      MODE: '802-11-wireless.mode',
      SSID: '802-11-wireless.ssid',
      SECURITY: '802-11-wireless-security.key-mgmt',
      PASSWORD: '802-11-wireless-security.psk',
      BAND: '802-11-wireless.band',
      CHANNEL: '802-11-wireless.channel'
    },
    // TODO start using these and add more here
    IP_V4: {
      METHOD: 'ipv4.method',
      DNS: 'ipv4.dns',
      ADDRESSES: 'ipv4.addresses',
      GATEWAY: 'ipv4.gateway'
    }
  };

  /**
   * Linux nmcli connection specific fields. These are provided when issuing an nmcli connection <args> command
   * @type {{MODES: {AP: string}}}
   */
  const VALUES = {
    MODES: {
      AP: 'ap',
      AD_HOC: 'adhoc',
      INFRASTRUCTURE: 'infrastructure'
    },
    SECURITY: {WPA: 'wpa-psk'},
    IPV4_METHODS: {SHARED: 'shared'},
    // TODO Start creating more of these sub-sections and deprecate the other style
    IP_V4: {
      METHODS: {
        SHARED: 'shared',
        AUTO: 'auto',
        MANUAL: 'manual'
      }
    }
  };

  /**
   * Linux nmcli connection types.
   * @type {{ETHERNET: string, WIFI: string, VLAN: string}}
   */
  const TYPES = {
    ETHERNET: '802-3-ethernet',
    WIFI: '802-11-wireless',
    VLAN: 'vlan'
  };

  /**
   * Enum of nmcli connection related constants
   * @type {{FIELDS: {BSSID: string, MODE: string}, VALUES: {MODES: {AP: string}}, TYPES: {ETHERNET: string, WIFI: string, VLAN: string}}}
   */
  const NMCLI_CONNECTION_CONSTANTS = {
    FIELDS: FIELDS,
    DETAILS: DETAILS,
    VALUES: VALUES,
    TYPES: TYPES
  };

  module.exports = NMCLI_CONNECTION_CONSTANTS;
})();
