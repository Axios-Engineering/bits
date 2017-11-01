(() => {
  'use strict';

  const NetworkMessenger = require('./network-messenger');
  const CONNECTION = require('../nmcli/connection-constants');

  class NetworkManager {
    constructor(messageCenter, nmcliManager) {
      this._messageCenter = messageCenter;
      this._nmcliManager = nmcliManager;
    }

    load() {
      this._messenger = new NetworkMessenger(this._messageCenter, this);
      return this._messenger.load();
    }

    unload() {
      return this._messenger.unload();
    }

    getIpAddress() {
      return Promise.resolve(this._nmcliManager.getConnections())
        .then(connections => {
          return Promise.all(connections.map(connection => {
            return this._nmcliManager.getConnectionDetails(connection)
              .then(result => result[CONNECTION.DETAILS.IP_V4.ADDRESSES]);
          }));
        })
        .then(ips => {
          return ips.filter(ip => {
            return ip !== null && ip !== undefined;
          });
        });
    }
  }

  module.exports = NetworkManager;
})();
