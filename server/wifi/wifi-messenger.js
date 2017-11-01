(() => {
  'use strict';

  const TAG = 'NETWORK_MGR:WIFI:MESSENGER';
  const debug = require('debug')(TAG);

  // Reference to the Messenger super class from base. We will extend our messenger from this.
  const Messenger = global.helper.Messenger;

  const API_KEY = 'networkManager#wifi#';

  function generateEventString(eventName) {
    return API_KEY + eventName;
  }

  const EVENTS = {
    UPDATE_CONFIGS: generateEventString('update-configs'),
    GET_CONFIGS: generateEventString('get-configs'),
    APPLY: generateEventString('apply'),
    SCAN: generateEventString('scan'),
    GET_BITS_ID: generateEventString('get-bits-id')
  };

  const SCOPES = ['networking'];

  const SystemApi = global.helper.SystemApi;

  class WifiMessenger extends Messenger {

    constructor(wifiDeviceManager) {
      super();
      debug('constructor');
      this._wifiDeviceManager = wifiDeviceManager;
    }

    _onGetConfigs() {
      debug('_onWifiDevices');
      return this._wifiDeviceManager.getDevices();
    }

    _onApplyConfigs(metadata, data) {
      debug('_onApplyConfigs', data);
      return this._wifiDeviceManager.applyChanges(data);
    }

    _onScan(metadata, iface) {
      debug('_onScan', iface);
      return this._wifiDeviceManager.scan(iface);
    }

    _onGetBitsId() {
      debug('_onGetBitsId');
      return this._systemApi.getBitsId();
    }

    load(messageCenter) {
      this._systemApi = new SystemApi(messageCenter);
      return Promise.resolve()
        .then(() => {
          this._messageCenter = messageCenter;
        })
        .then(() => this.addRequestListener(EVENTS.GET_CONFIGS, SCOPES, this._onGetConfigs.bind(this), this._messageCenter))
        .then(() => this.addRequestListener(EVENTS.APPLY, SCOPES, this._onApplyConfigs.bind(this), this._messageCenter))
        .then(() => this.addRequestListener(EVENTS.SCAN, SCOPES, this._onScan.bind(this), this._messageCenter))
        .then(() => this.addRequestListener(EVENTS.GET_BITS_ID, SCOPES, this._onGetBitsId.bind(this), this._messageCenter));
    }

  }// End Class

  module.exports = WifiMessenger;
})();
