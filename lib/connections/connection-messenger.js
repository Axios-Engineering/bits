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
  const ConnectionApi = require('./connection-api');

  class ConnectionMessenger extends CrudMessenger {
    constructor(...args) {
      super(...args);

      this.addEmitterEventListener(this._manager, 'connection-activated', this._onActivated.bind(this));
      this.addEmitterEventListener(this._manager, 'connection-deactivated', this._onDeactivated.bind(this));

      this.addRequestListener(ConnectionApi.REQUESTS.ACTIVATE, {scopes: ['networking']}, this._activateConnection.bind(this));
      this.addRequestListener(ConnectionApi.REQUESTS.DEACTIVATE, {scopes: ['networking']}, this._deactivateConnection.bind(this));
    }

    sanitize(item) {
      return Promise.resolve()
      .then(() => this._manager.filterDevice(item));
    }

    _onActivated(connection) {
      return this.sendEvent(ConnectionApi.EVENT.CONNECTION_ACTIVATED, {scopes: ['networking']}, connection);
    }

    _onDeactivated(connection) {
      return this.sendEvent(ConnectionApi.EVENT.CONNECTION_DEACTIVATED, {scopes: ['networking']}, connection);
    }

    _activateConnection(metadata, connection) {
      return this._manager.activateConnection(connection);
    }

    _deactivateConnection(metadata, connection) {
      return this._manager.deactivateConnection(connection);
    }
  }

  module.exports = ConnectionMessenger;
})();
