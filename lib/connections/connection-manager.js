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

  const logger = global.LoggerFactory.getLogger();
  const CrudManager = global.helper.CrudManager;
  const BaseHelperApi = global.helper.BaseHelperApi;
  const path = require('path');
  const ConnectionMessenger = require('./connection-messenger');

  const APITag = 'networkManager#Connections';

  class ConnectionManager extends CrudManager {
    constructor() {
      super(APITag, {readScopes: ['networking'], writeScopes: ['networking'], Messenger: ConnectionMessenger});
      this._boundConnectionAdded = this._connectionAdded.bind(this);
      this._boundConnectionRemoved = this._connectionRemoved.bind(this);
      this._ids = {};
    }

    load(messageCenter, nm) {
      this._nm = nm;
      return super.load(messageCenter)
      .then(() => {
        this._baseHelperApi = new BaseHelperApi(messageCenter);
        return this._baseHelperApi.add({name: 'NetworkConnectionsApi', filepath: path.resolve(__dirname, './connection-api.js')});
      })
      .then(() => nm.Settings.connect())
      .then((settings) => {
        this._nmSettings = settings;
        this._nmSettings.on('NewConnection', this._boundConnectionAdded);
        this._nmSettings.on('ConnectionRemoved', this._boundConnectionRemoved);
        return settings.ListConnections(); // eslint-disable-line new-cap
      })
      .then((connections) => Promise.all(connections.map((connection) => this._connectionAdded(Promise.resolve(connection)))));
    }

    unload(messageCenter) {
      return super.unload(messageCenter)
      .then(() => {
        this._nmSettings.removeListener('NewConnection', this._boundConnectionAdded);
        this._nmSettings.removeListener('ConnectionRemoved', this._boundConnectionRemoved);
      });
    }

    list(query) {
      return super.list(query)
      .then((connections) => {
        if (query && query.type) {
          return connections.filter((connection) => {
            return query.type === connection.connection.type;
          });
        } else {
          return connections;
        }
      })
      .then((connections) => Promise.all(connections));
    }

    get(id) {
      return super.get(id);
    }

    create(connectionInfo) {
      return Promise.resolve()
        .then(() => this._nmSettings.AddConnection(this._processConnectionInfo(connectionInfo))) // eslint-disable-line new-cap
        .then((result) => {
          if (this._ids[result.objectPath]) {
            return this.get(this._ids[result.objectPath]);
          } else {
            return this._connectionAdded(Promise.resolve(result));
          }
        })
      .catch((err) => {
        logger.error('Unable to create connection: ', err);
        return Promise.reject(err);
      });
    }

    update(id, connectionInfo) {
      return Promise.resolve()
      .then(() => this.get(id))
      .then((connection) => {
        delete connectionInfo.id;
        delete connectionInfo.uid;
        return connection.Update(this._processConnectionInfo(connectionInfo)); // eslint-disable-line new-cap
      })
      .catch((err) => {
        logger.error('Unable to update connection', connectionInfo);
        return Promise.reject(err);
      });
    }

    delete(id) {
      return Promise.resolve()
      .then(() => this.get(id))
      .then((handle) => handle.Delete()) // eslint-disable-line new-cap
      .catch((err) => {
        logger.error('Unable to delete connection: ', err);
        return Promise.reject(err);
      });
    }

    activateConnection(connection) {
      return this.get(connection.id)
      .then((con) => {
        return this._nm.ActivateConnection(con.objectPath, '/'); // eslint-disable-line new-cap
      })
      .then((result) => {
        logger.debug('Activated connection', connection.uid);
      })
      .catch((err) => {
        logger.error('Error activating a connection', err);
        return Promise.reject(err);
      });
    }

    deactivateConnection(connection) {
      return this.get(connection.id)
      .then((con) => {
        return Promise.resolve()
        .then(() => con.GetSettings()) // eslint-disable-line new-cap
        .then((connectionSettings) => {
          return this._nm.GetAllDevices() // eslint-disable-line new-cap
          .then((devices) => {
            return Promise.all(devices.map((device) => {
              return device.GetAppliedConnection() // eslint-disable-line new-cap
              .then((connections) => {
                const connectionMatch = connections.find((connection) => {
                  return connection.connection.uuid === connectionSettings.connection.uuid;
                });
                if (connectionMatch) {
                  return device.Disconnect(); // eslint-disable-line new-cap
                } else {
                  return Promise.resolve();
                }
              })
              .catch((err) => {
                // This is fine this means that the device is not active.
              });
            }));
          });
        });
      })
      .then((result) => {
        logger.debug('Deactivated connection', connection.uid);
      })
      .catch((err) => {
        logger.error('Error deactivating a connection', err);
        return Promise.reject(err);
      });
    }

    filterDevice(connection) {
      if (!(connection)) {
        return Promise.resolve({});
      }
      if (connection.secrets) {
        connection.settings['802-11-wireless-security'] = Object.assign(connection.settings['802-11-wireless-security'], connection.secrets['802-11-wireless-security']);
      }
      return Promise.resolve(Object.assign({id: connection.id, uid: connection.uid}, connection.settings));
    }

    _processConnectionInfo(connection) {
      if (connection.ipv4) {
        const data = connection.ipv4['address-data'];
        if (data) {
           connection.ipv4.addresses = data.map((setting) => {
             return [this._convertIpToNum(setting.address), setting.prefix, this._convertIpToNum(connection.ipv4.gateway)];
           });
          delete connection.ipv4['address-data'];
          delete connection.ipv4.gateway;
        }
        if (connection.ipv4.dns) {
          connection.ipv4.dns = connection.ipv4.dns.map((dns) => this._convertIpToNum(dns));
        }

        if (connection && connection['802-11-wireless'] && connection['802-11-wireless'].ssid) {
          connection['802-11-wireless'].ssid = connection['802-11-wireless'].ssid.split('').map((char) => char.charCodeAt(0));
        }
      }
      return connection;
    }

    _cleanUpSettings(settings) {
      const data = settings['802-11-wireless'];
      if (data && data.ssid) {
        const processedSsid = String.fromCharCode.apply(null, data.ssid);
        settings['802-11-wireless'].ssid = processedSsid;
      }
      if (!settings.connection.hasOwnProperty('autoconnect')) {
        settings.connection.autoconnect = true;
      }

      if (settings.ipv4 && settings.ipv4.dns) {
        settings.ipv4.dns = settings.ipv4.dns.map((dns) => this._convertNumToIp(dns));
      }
      return settings;
    }

    _cleanUpSecrets(secrets) {
      return secrets;
    }

    _convertIpToNum(ip) {
      if (!ip) {
        return 0;
      } else {
        let d = ip.split('.');
        return ((((((+d[3])*256)+(+d[2]))*256)+(+d[1]))*256)+(+d[0]);
      }
    }

    _convertNumToIp(num) {
      const part1 = num & 255;
      const part2 = ((num >> 8) & 255);
      const part3 = ((num >> 16) & 255);
      const part4 = ((num >> 24) & 255);

      return part1 + '.' + part2 + '.' + part3 + '.' + part4;
    }

    _connectionAdded(connectionP) {
      return connectionP
      .then((connection) => {
        return Promise.resolve()
        .then(() => connection.GetSettings()) // eslint-disable-line new-cap
        .then((settings) => {
          connection.settings = this._cleanUpSettings(settings);
          if (settings.connection.type === '802-11-wireless') {
            return Promise.resolve()
            .then(() => connection.GetSecrets('802-11-wireless-security')) // eslint-disable-line new-cap
            .then((secrets) => {
              connection.secrets = this._cleanUpSecrets(secrets);
              return connection;
            })
            .catch((err) => {
              logger.error('Unable to set secrets', err);
              return connection;
            });
          } else {
            return Promise.resolve(connection);
          }
        })
        .then(() => {
          if (!this._ids[connection.objectPath]) {
            const updateFunc = (values, value1, value2) => {
              return Promise.resolve()
              .then(() => connection.GetSettings()) // eslint-disable-line new-cap
              .then((settings) => {
                const newSettings = this._cleanUpSettings(settings);

                if (settings.connection.type === '802-11-wireless') {
                  return Promise.resolve()
                  .then(() => {
                    return {settings: newSettings}; // Leaving this in place for secrets later
                  })
                  .catch((err) => {
                    logger.error('Unable to set secrets', err);
                    return {settings: newSettings};
                  });
                } else {
                  return Promise.resolve({settings: newSettings});
                }
              })
              .then((connectionToSave) => {
                return super.update(this._ids[connection.objectPath], connectionToSave);
              })
              .catch((err) => {
                logger.error('Unable to update connection', err);
              });
            };

            connection.updateFunc = updateFunc;
            connection.on('Updated', updateFunc);
            return super.create(Object.assign({uid: connection.objectPath}, connection))
            .then((con) => {
              this._ids[connection.objectPath] = con.id;
              return con;
            });
          } else {
            return this.get(this._ids[connection.objectPath]);
          }
        });
      })
      .catch((err) => {
        logger.error('Unable to add connection', err);
      });
    }

    _connectionRemoved(connection) {
      return Promise.resolve()
      .then(() => {
        if (this._ids[connection]) {
          return Promise.resolve()
          // Leaving this code commented out as a cautinary tale for the next time Nic thinks that we should be cleaning up memory leaks
          // .then(() => super.get(this._ids[connection]))
          // .then((connection) => {
            // connection.removeListener('Updated', connection.updateFunc); //You would think this works but it does not. Listener will be cleaned up when conneciton is deleted
          // })
          .then(() => super.delete(this._ids[connection]))
          .then(() => {
            delete this._ids[connection];
          });
        }
      })
      .catch((err) => {
        logger.error('Unable to delete connection', err);
      });
    }
  }

  module.exports = ConnectionManager;
})();
