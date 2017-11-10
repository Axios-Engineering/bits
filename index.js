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

const DeviceManager = require('./lib/devices/device-manager');
const ConnectionManager = require('./lib/connections/connection-manager');
const nm = require('dbus-network-manager');

(() => {
  'use strict';

  const UtilChildPromise = global.utils.UtilChildProcess;
  const NMCLI_CMD = 'nmcli';
  const NMCLI_ARGS = ['-v'];

  class NetworkManagerApp {
    constructor() {
      this._deviceManager = new DeviceManager();
      this._connectionManager = new ConnectionManager();
    }

    load(messageCenter) {
      return UtilChildPromise.createSpawnPromise(NMCLI_CMD, NMCLI_ARGS)
      .then((result) => {
        const test = result.stdout[0].replace(/(\r\n|\n|\r)/gm, '');
        const ver = test.match(/^.*version (\d).(\d.)(\d).*$/);
        if ('0' === ver[1]) {
          return Promise.reject(new Error('Unsupported Hardware/Configuration - Module not supported on this platform'));
        }
      })
      .catch((err) => {
        // If there is no NMCLI, then we should bail as we can never hope to work
        if ('ENOENT' !== err.code) {
          throw err;
        }
        return Promise.reject(new Error('Unsupported Hardware/Configuration - Module not supported on this platform'));
      })
      .then(() => nm.connect())
      .then((connectedNetworkManager) => {
        return Promise.resolve()
        .then(() => this._deviceManager.load(messageCenter, connectedNetworkManager))
        .then(() => this._connectionManager.load(messageCenter, connectedNetworkManager));
      });
    }

    unload(messageCenter) {
      return Promise.resolve()
      .then(() => this._connectionManager.unload(messageCenter))
      .then(() => this._deviceManager.unload(messageCenter));
    }
  }

  module.exports = new NetworkManagerApp();
})();
