(function() {
  'use strict';

  const TAG = 'NETWORK_MGR:BONDING:MESSENGER';
  const debug = require('debug')(TAG);

  // Reference to the Messenger super class from base. We will extend our messenger from this.
  const Messenger = global.helper.Messenger;

  const API_KEY = 'networkManager#interfaces#';

  function generateEventString(eventName) {
    return API_KEY + eventName;
  }

  const EVENTS = {
    UPDATE_INTERFACES: generateEventString('update-interfaces'),
    GET_INTERFACES: generateEventString('get-interfaces'),
    APPLY_BOND: generateEventString('apply-bond')
  };

  /**
   * An array of scopes that define who/what can access certain functions or NULL to
   * specify that anything server side can access the function but other systems, the UI, etc...
   * cannot access the function.
   * @type {Array}
   */
  const SCOPES = ['networking'];

  /**
   * The Messenger class for Wifi messages.
   * This will handle communication from both the UI and other modules on the server.
   */
  class BondingMessenger extends Messenger {

    /**
     * Create a new instance of BondingMessenger
     * @param {CellularDeviceManager} bondingManager - the current instance of Network Manager's CellularDeviceManager
     */
    constructor(bondingManager) {
      super();
      debug('constructor');
      this._bondingManager = bondingManager;
    }

    /**
     * Handle incoming request to get a list of the current wifi configurations by interface
     * @return {Promise} to get a list of the current Wi-Fi configurations.
     * @private
     */
    _onGetInterfaces() {
      debug('_onGetInterfaces');
      return this._bondingManager.getDevices();
    }

    /**
     * Handle incoming request to apply new Wi-Fi configurations.
     * @param {object} data - an array of wifi configurations to apply
     * @return {Promise} to apply the changes
     * @private
     */
    _onApplyBond(data) {
      debug('_onApplyBond', data);
      if (!data.hasOwnProperty('setBondingEnabled') || data.setBondingEnabled === null || data.setBondingEnabled === undefined) {
        return Promise.reject('Malformed request! Must have a boolean enable/disable.');
      }
      if (!data.hasOwnProperty('ifaceArray') || data.ifaceArray === null || data.ifaceArray === undefined || data.ifaceArray.length === 0) {
        return Promise.reject('Malformed request! Must provide an array of interfaces.');
      }
      return this._bondingManager.applyChanges(data);
    }

    load(messageCenter) {
      return Promise.resolve()
        .then(() => {
          this._messageCenter = messageCenter;
        })
        .then(() => this.addRequestListener(EVENTS.GET_INTERFACES, SCOPES, this._onGetInterfaces.bind(this), this._messageCenter))
        .then(() => this.addRequestListener(EVENTS.APPLY_BOND, SCOPES, this._onApplyBond.bind(this), this._messageCenter));
    }

  }// End Class

  module.exports = BondingMessenger;
})();
