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

  const CrudMessenger = global.helper.CrudMessenger;
  const DeviceApi = require('./device-api');

  class DeviceMessenger extends CrudMessenger {
    constructor(...args) {
      super(...args);

      this.addRequestListener(DeviceApi.REQUESTS.MANAGE, {scopes: ['networking']}, this._manageDevice.bind(this));
      this.addRequestListener(DeviceApi.REQUESTS.UNMANAGE, {scopes: ['networking']}, this._unmanageDevice.bind(this));
    }

    sanitize(item) {
      return Promise.resolve()
      .then(() => this._manager.filterDevice(item));
    }

    _manageDevice(metadata, Device) {
      return this._manager.manageDevice(Device);
    }

    _unmanageDevice(metadata, Device) {
      return this._manager.unmanageDevice(Device);
    }
  }

  module.exports = DeviceMessenger;
})();
