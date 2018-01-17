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
  const CrudManager = global.helper.CrudManager;
  const BaseHelperApi = global.helper.BaseHelperApi;
  const KeyValueManager = global.helper.KeyValueManager;
  const path = require('path');

  const RadioMessenger = require('./radio-messenger');
  const ApiTag = 'networkManager#Radios';

  class RadioManager extends CrudManager {
    constructor() {
      super(ApiTag, {readScopes: ['networking'], writeScopes: ['networking'], Messenger: RadioMessenger});
      this._boundDevicePropertiesChanged = this._deviceWifiPropertiesChanged.bind(this);
      this._keyValueManager = new KeyValueManager();
    }

    load(messageCenter, nm) {
      this._nm = nm;

      return super.load(messageCenter)
      .then(() => {
        this._baseHelperApi = new BaseHelperApi(messageCenter);
        return this._baseHelperApi.add({name: 'NetworkRadiosApi', filepath: path.resolve(__dirname, './radio-api.js')});
      })
      .then(() => {
        nm.on('PropertiesChanged', this._boundDevicePropertiesChanged);
      })
      .then(() => this._nm.getProperty('WirelessEnabled'))
      .then((initState) => this._keyValueManager.set({key: 'WirelessEnabled', value: initState}));
    }

  unload(messageCenter) {
    return Promise.resolve()
    .then(() => {
      this._nm.removeListener('PropertiesChanged', this._boundDevicePropertiesChanged);
      this._nm = null;
    })
    .then(() => super.unload(messageCenter));
  }

  _deviceWifiPropertiesChanged(radio) {
    if (radio.hasOwnProperty('WirelessEnabled')) {
      return this._keyValueManager.set({key: 'WirelessEnabled', value: radio.WirelessEnabled});
    }
  }

  _getWifiState() {
    return this._keyValueManager.get({key: 'WirelessEnabled'});
  }

  _softBlockAll() {
    return this._nm.setProperty('WirelessEnabled', false);
  }

  _unsoftBlockAll() {
    return this._nm.setProperty('WirelessEnabled', true);
  }
}
  module.exports = RadioManager;
})();
