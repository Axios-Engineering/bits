(function() {
  'use strict';

  class DeviceUnavailableError extends Error {
    constructor(deviceName, deviceConsumer) {
      super('Device ' + deviceName + ' is locked for use by ' + deviceConsumer);
    }
  }

  module.exports = DeviceUnavailableError;
})();
