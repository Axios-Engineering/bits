(() => {
  'use strict';

  // TODO make this the single point for nmcli constants and remove everything else

  const ARGS = {
    TERSE: '-t',
    FIELDS: '-f',
    SHOW_SECRETS: '-s',
    ACTIVE: '--active',
    DOUBLE_DASH: '--'
  };

  // TODO map these under the appropriate sections IE WIFI, eth, etc, connection, general, etc...
  const OPTIONS = {
    DEVICE: 'device',
    CONNECTION: 'connection',
    RADIO: 'radio',
    ETHERNET: 'ethernet',
    WIFI: 'wifi',
    MODIFY: 'modify',
    CON_NAME: 'con-name',
    HOTSPOT: 'hotspot',
    ADD: 'add',
    TYPE: 'type',
    UP: 'up',
    DOWN: 'down',
    DISCONNECT: 'disconnect',
    CONNECT: 'connect',
    LIST: 'list',
    SHOW: 'show',
    IFNAME: 'ifname',
    RESCAN: 'rescan',
    SSID: 'ssid',
    AUTOCONNECT: 'autoconnect',
    WIFI_MODE: 'mode',
    PASSWORD: 'password',
    NO: 'no',
    YES: 'yes',
    DELETE: 'delete',
    ALL: 'all',
    BRIDGE: 'bridge',
    BRIDGE_SLAVE: 'bridge-slave',
    MASTER: 'master'
  };

  const CONNECTION_KEYS = {
    CONNECTION: {
      UUID: 'connection.uuid',
      NAME: 'connection.id',
      TYPE: 'connection.type',
      INTERFACE_NAME: 'connection.interface-name',
      AUTO_CONNECT: 'connection.autoconnect'
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

  const CONNECTION_VALS = {
    CONNECTION: {
      TYPES: {
        ETHERNET: '802-3-ethernet',
        WIFI: '802-11-wireless',
        VLAN: 'vlan'
      }
    },
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

  const CONSTANTS = {
    ARGS: ARGS,
    OPTIONS: OPTIONS,
    CONNECTION_KEYS: CONNECTION_KEYS,
    CONNECTION_VALS: CONNECTION_VALS
  };

  module.exports = CONSTANTS;
})();
