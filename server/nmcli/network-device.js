(function() {
  'use strict';

  /**
   * Represents the default configuration for an interface configuration. This will be applied in the constructor
   * and then potentially overwritten by any supplied config.
   * @type {{name: null, isHidden: boolean, state: LinkState, isHotspot: boolean}}
   */
  const defaults = {
    name: null,
    type: 'ethernet',
    connection: null
  };

  /**
   * Represents a network device such as wifi, ethernet, etc..
   * This is a combination of the nmcli device list output with Bits specific
   * fields.
   */
  class NetworkDevice {
    constructor(name, type, connection, isAvailable, state) {
      this.name = name || defaults.name;
      this.type = type || defaults.type;
      this.connection = connection || defaults.connection;
      this.state = state;

      /**
       * Bits field for marking if the device is in use. Convenience field.
       * @type {boolean}
       */
      this.isAvailable = isAvailable;
      /**
       * The Bits service that is consuming this device IE marking it as unavailable
       * @type {string}
       */
      this.consumer = null;
    }

    setName(name) {
      if (typeof name !== 'string') throw new TypeError('NmcliDevice: \'name\' must be a string!');
      this._iface = name;
    }

    setType(type) {
      if (typeof type !== 'string') throw new TypeError('NmcliDevice: \'type\' must be a string!');
      this.type = type;
    }

    setConnection(connection) {
      if (typeof connection !== 'string') throw new TypeError('NmcliDevice: \'connection\' must be a string!');
      this.connection = connection;
    }

  }// End Class

  module.exports = NetworkDevice;
})();
