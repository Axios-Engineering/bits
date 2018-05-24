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
  const EventEmitter = require('events');
  const BaseHelperApi = global.helper.BaseHelperApi;
  const KeyValueService = global.helper.KeyValueService;
  const path = require('path');
  const RadioMessenger = require('./radio-messenger');

  const API_TAG = 'networkManager#Radios';
  const KEY = {
    WIRELESS_ENABLED: 'wirelessEnabled'
  };
  const PROPERTY = {
    WIRELESS_ENABLED: 'WirelessEnabled'
  };

  class RadioManager extends EventEmitter {
    constructor() {
      super();
      this._boundDevicePropertiesChanged = this._deviceWifiPropertiesChanged.bind(this);
      this._kvService = new KeyValueService({tag: API_TAG, readScopes: ['networking']});
      this._messenger = new RadioMessenger(this);
      this._boundOnSet = this._onSet.bind(this);
    }

    load(messageCenter, nm) {
      this._nm = nm;

      return Promise.resolve()
      .then(() => this._kvService.load(messageCenter))
      .then(() => this._kvService.getManager().on('set', this._boundOnSet))
      .then(() => this._messenger.load(messageCenter))
      .then(() => {
        this._baseHelperApi = new BaseHelperApi(messageCenter);
        return this._baseHelperApi.add({name: 'NetworkRadiosApi', filepath: path.resolve(__dirname, './radio-api.js')});
      })
      .then(() => {
        nm.on('PropertiesChanged', this._boundDevicePropertiesChanged);
      })
      .then(() => this._nm.getProperty(PROPERTY.WIRELESS_ENABLED))
      .then((state) => this._setWifiState(state));
    }

  unload() {
    return Promise.resolve()
    .then(() => {
      this._nm.removeListener('PropertiesChanged', this._boundDevicePropertiesChanged);
      this._nm = null;
    });
  }

  _onSet({key, value}={}) {
    if (key === KEY.WIRELESS_ENABLED) {
      this.emit('wifi-state-changed', value);
    }
  }

  _deviceWifiPropertiesChanged(radio) {
    if (radio.hasOwnProperty(PROPERTY.WIRELESS_ENABLED)) {
      this._setWifiState(radio[PROPERTY.WIRELESS_ENABLED]);
    }
  }

  _getWifiState() {
    return Promise.resolve()
    .then(() => this._kvService.getManager().get({key: KEY.WIRELESS_ENABLED}));
  }

  _setWifiState(state) {
    return Promise.resolve()
    .then(() => this._kvService.getManager().set({key: KEY.WIRELESS_ENABLED, value: !!state}));
  }

  _softBlockAll() {
    return this._nm.setProperty(PROPERTY.WIRELESS_ENABLED, false);
  }

  _unsoftBlockAll() {
    return this._nm.setProperty(PROPERTY.WIRELESS_ENABLED, true);
  }
}
  module.exports = RadioManager;
})();
