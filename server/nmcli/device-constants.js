(() => {
  'use strict';

  /**
   * Linux nmcli device specific fields. These are provided when issuing an nmcli device <args> command
   * @type {{MAC: string}}
   */
  const FIELDS = {
    MAC: 'GENERAL.HWADDR'
  };

  /**
   * Linux nmcli device types
   * @type {{ETHERNET: string, WIFI: string, LOOPBACK: string}}
   */
  const TYPES = {
    ETHERNET: 'ethernet',
    WIFI: 'wifi',
    LOOPBACK: 'loopback'
  };

  const MODES = {
    CLIENT: 'infrastructure',
    HOTSPOT: 'ap',
    NONE: 'none'
  };

  /**
   * Enum of nmcli device constants
   * @type {{FIELDS: {MAC: string}, TYPES: {ETHERNET: string, WIFI: string, LOOPBACK: string}}}
   */
  const NMCLI_DEVICE_CONSTANTS = {
    FIELDS: FIELDS,
    TYPES: TYPES,
    MODES: MODES
  };

  module.exports = NMCLI_DEVICE_CONSTANTS;
})();
