/**
Copyright 2017 LGS Innovations

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

(() => {
  'use strict';

  const Messenger = global.helper.Messenger;
  const RadioApi = require('./radio-api');

  class RadioMessenger extends Messenger {
    constructor(manager) {
      super();
      this._manager = manager;
      this.addRequestListener(RadioApi.REQUESTS.SOFT_BLOCK_ALL, {scopes: ['networking']}, this._softblockAll.bind(this));
      this.addRequestListener(RadioApi.REQUESTS.UNSOFT_BLOCK_ALL, {scopes: ['networking']}, this._unsoftblockAll.bind(this));
      this.addRequestListener(RadioApi.REQUESTS.WIFI_STATE, {scopes: ['networking']}, this._getWifiState.bind(this));
      this.addEmitterEventListener(this._manager, 'wifi-state-changed', this._wifiStateChanged.bind(this));
    }

    _softblockAll() {
      return this._manager._softBlockAll();
    }

    _unsoftblockAll() {
      return this._manager._unsoftBlockAll();
    }

    _getWifiState() {
      return this._manager._getWifiState();
    }

    _wifiStateChanged(state) {
      return this.sendEvent(RadioApi.EVENTS.STATE_CHANGED, {scopes: null}, state);
    }
  }

  module.exports = RadioMessenger;
})();
