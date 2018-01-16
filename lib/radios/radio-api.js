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

  const CrudApi = global.helper.CrudApi;

  class RadiosApi extends CrudApi {
    static get TAG() {
      return 'networkManager#Radios';
    }

    static get SCOPES() {
      return null;
    }

    static get REQUESTS() {
      return {
        SOFTBLOCKALL: `${RadiosApi.TAG} softblock`,
        UNSOFTBLOCKALL: `${RadiosApi.TAG} unsoftblock`,
        WIFISTATE: `${RadiosApi.TAG} wifistate`
      };
    }

    constructor(messageCenter) {
      super(RadiosApi.TAG, messageCenter);
      this._messageCenter = messageCenter;
    }

    softblockAll() {
      return this._messageCenter.sendRequest(RadiosApi.REQUESTS.SOFTBLOCKALL, {scopes: null});
    }

    unsoftblockAll() {
      return this._messageCenter.sendRequest(RadiosApi.REQUESTS.UNSOFTBLOCKALL, {scopes: null});
    }

    getWifiState() {
      return this._messageCenter.sendRequest(RadiosApi.REQUESTS.WIFISTATE, {scopes: null});
    }
  }

  module.exports = RadiosApi;
})();
