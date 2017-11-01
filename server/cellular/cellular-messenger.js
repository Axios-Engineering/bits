(function() {
  'use strict';

  const TAG = 'NETWORK_MGR:CELLULAR:MESSENGER';
  const debug = require('debug')(TAG);

  // Reference to the Messenger super class from base. We will extend our messenger from this.
  const Messenger = global.helper.Messenger;

  const API_KEY = 'networkManager#cellular#';

  function generateEventString(eventName) {
    return API_KEY + eventName;
  }

  const EVENTS = {
    GET_CONFIGS: generateEventString('get-configs'),
    APPLY: generateEventString('apply')
  };

  /**
   * An array of scopes that define who/what can access certain functions or NULL to
   * specify that anything server side can access the function but other systems, the UI, etc...
   * cannot access the function.
   * @type {Array}
   */
  const SCOPES = ['networking'];

  class CellularMessenger extends Messenger {

    constructor(cellularDeviceManager) {
      super();
      debug('constructor');
      this._cellularDeviceManager = cellularDeviceManager;
    }

    _onGetConfigs() {
      debug('_onGetConfigs');
      return this._cellularDeviceManager.getDevices();
    }

    _onApplyConfigs(metadata, data) {
      debug('_onApplyConfigs', data);
      return this._cellularDeviceManager.applyChanges(data);
    }

    load(messageCenter) {
      return Promise.resolve()
        .then(() => {
          this._messageCenter = messageCenter;
        })
        .then(() => this.addRequestListener(EVENTS.GET_CONFIGS, {scopes: SCOPES}, this._onGetConfigs.bind(this), this._messageCenter))
        .then(() => this.addRequestListener(EVENTS.APPLY, {scopes: SCOPES}, this._onApplyConfigs.bind(this), this._messageCenter));
    }

  }// End Class

  module.exports = CellularMessenger;
})();
