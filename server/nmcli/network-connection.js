(function() {
  'use strict';

  const defaults = {
    name: null,
    type: null,
    uuid: null,
    device: null,
    isAutoConnect: false
  };

  /**
   * Represents a Linux Network Manager connection.
   */
  class NetworkConnection {

    /**
     * Create a new instance of NmcliDevice
     * @param {string} name - the human readable name for this connection
     * @param {string} type - type of the connection (wifi, ethernet, ...)
     * @param {string} uuid - the unique id for this conneciton description
     * @param {string} device - the device associated with this connection
     * @param {boolean} isAutoConnect - is the connection active
     * @param {object} specifics - free form object with connection type specific fields
     */
    constructor(name, type, uuid, device, isAutoConnect, specifics) {
      this.name = name || defaults.name;
      this.type = type || defaults.type;
      this.uuid = uuid || defaults.uuid;
      this.device = device || defaults.device;
      this.isAutoConnect = isAutoConnect || defaults.isAutoConnect;
      this.specifics = specifics || {};
    }

    setIsAutoConnect(isAutoConnect) {
      if (typeof isAutoConnect !== 'boolean') throw new TypeError('NetworkConnection: \'isAutoConnect\' must be a boolean!');
      this.isAutoConnect = isAutoConnect;
    }

  }// End Class

  module.exports = NetworkConnection;
})();
