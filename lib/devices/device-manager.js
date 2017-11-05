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
  const path = require('path');
  const logger = global.LoggerFactory.getLogger();

  const DeviceMessenger = require('./device-messenger');
  const APITag = 'networkManager#Devices';
  // const os = require('os');
  // const ifaces = os.networkInterfaces();

  class DeviceManager extends CrudManager {
    constructor() {
      super(APITag, {readScopes: ['networking'], writeScopes: ['networking'], Messenger: DeviceMessenger});

      this._ids = {};
      this._boundDeviceAdded = this._deviceAdded.bind(this);
      this._boundDeviceRemoved = this._deviceRemoved.bind(this);

      this._updatedFuncs = {};

      this._chain = Promise.resolve();
    }

    load(messageCenter, nm) {
      this._nm = nm;

      return super.load(messageCenter)
      .then(() => {
        this._baseHelperApi = new BaseHelperApi(messageCenter);
        return this._baseHelperApi.add({name: 'NetworkDevicesApi', filepath: path.resolve(__dirname, './device-api.js')});
      })
      .then(() => {
        nm.on('DeviceAdded', this._boundDeviceAdded);
        nm.on('DeviceRemoved', this._boundDeviceRemoved);
      })
      .then(() => nm.GetAllDevices()) // eslint-disable-line new-cap
      .then((devices) => {
        return Promise.all(devices.map((device) => {
          return this._deviceAdded(device);
        }));
      });
    }

    unload(messageCenter) {
      return Promise.resolve()
      .then(() => {
        this._nm.removeListener('DeviceAdded', this._boundDeviceAdded);
        this._nm.removeListener('DeviceRemoved', this._boundDeviceRemoved);
        this._nm = null;
      })
      .then(() => super.unload(messageCenter));
    }

    filterDevice(deviceToFilter) {
      return Promise.resolve()
      .then(() => this.get(deviceToFilter.id))
      .then((device) => {
        return Promise.resolve()
        .then(() => device.getProperties())
        .then((properties) => {
          return Object.assign({uid: device.objectPath}, properties);
        })
        .then((dev) => {
          return device.Wireless.then((wireless) => wireless.GetAllAccessPoints()) // eslint-disable-line new-cap
          .then((accesspoints) => Promise.all(accesspoints.map((here) => {
              return here.getProperties()
              .then((scanData) => {
                if (scanData.Ssid) {
                  scanData.ssid = String.fromCharCode.apply(null, scanData.Ssid);
                  delete scanData.Ssid;
                }
                return scanData;
              });
          })))
          .then((accessPoints) => {
            dev.scan = accessPoints;
            return dev;
          })
          .catch((err) => {
            return Promise.resolve(dev);
          });
        })
        .then((dev) => {
          if (dev.ActiveConnection && dev.ActiveConnection !== '/') {
            return Promise.resolve()
            .then(() => device.GetAppliedConnection()) // eslint-disable-line new-cap
            .then((connection) => {
              dev.AppliedConnection = connection;
              return dev;
            });
          } else {
            dev.AppliedConnection = [];
            return dev;
          }
        })
        .then((dev) => {
          dev.id = device.id;
          return dev;
        });
      });
    }

    manageDevice(device) {
      return this.get(device.id)
      .then((device) => device.setProperty('Managed', true))
      .catch((err) => {
        logger.error('Unable to set managed', err);
        return Promise.reject(err);
      });
    }

    unmanageDevice(device) {
      return this.get(device.id)
      .then((device) => device.setProperty('Managed', false))
      .catch((err) => {
        logger.error('Unable to set unmanaged', err, device);
        return Promise.reject(err);
      });
    }

    _deviceAdded(device) {
        this._updatedFuncs[device.objectPath] = (option) => {
          this._chain = this._chain.then(() => {
            if (option !== 'New' && option !== 'Activated' && option !== 'Disconnected' && option !== 'Unmanaged') {
              return Promise.resolve();
            }
            return Promise.resolve(device)
            .then((dev) => {
              if (this._ids.hasOwnProperty(dev.objectPath)) {
                return this.update(this._ids[dev.objectPath], dev);
              } else {
                return this.create(dev)
                .then((dev) => {
                  this._ids[dev.objectPath] = dev.id;
                });
              }
            });
          })
          .catch((err) => {
            logger.error('Error updating device', err);
          });
        };
        device.on('StateChanged', this._updatedFuncs[device.objectPath]);
        return this._updatedFuncs[device.objectPath]('New');
    }

    _deviceRemoved(device) {
      // You may be wondering why this is commented out. Its because network manager has no idea
      // How to actually destroy objects for proper clean up.
      // device.removeListeners('StateChanged', this._updatedFuncs[device.objectPath]);

      this._chain = this._chain.then(() => {
        delete this._updatedFuncs[device.objectPath];
        return Promise.resolve()
        .then(() => {
          if (this._ids.hasOwnProperty(device)) {
            return this.delete(this._ids[device])
            .then(() => {
              delete this._ids[device];
            });
          }
        });
      })
      .catch((err) => {
        logger.error('Error removing device', err);
      });
    }
  }

  module.exports = DeviceManager;
})();
