(() => {
  'use strict';

  const Messenger = global.helper.Messenger;

  const API_KEY = 'networkManager#network#';

  function generateEventString(eventName) {
    return API_KEY + eventName;
  }

  const EVENTS = {
    GET_IP_ADDRESS: generateEventString('get-ip-address')
  };

  const SCOPES = ['networking'];

  class NetworkMessenger extends Messenger {
    constructor(messageCenter, manager) {
      super();
      this._messageCenter = messageCenter;
      this._manager = manager;
    }

    _onGetIpAddress() {
      return this._manager.getIpAddress();
    }

    load() {
      return this.addRequestListener(EVENTS.GET_IP_ADDRESS, SCOPES, this._onGetIpAddress.bind(this), this._messageCenter);
    }

  }
  module.exports = NetworkMessenger;
})();
