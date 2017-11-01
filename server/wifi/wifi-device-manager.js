(function() {
  'use strict';

  // For dev logs
  const DEBUG_TAG = 'NETWORK_MGR:WIFI:DEVICE_MANAGER';
  const debug = require('debug')(DEBUG_TAG);
  const bitsLogger = global.LoggerFactory.getLogger();
  const IpUtil = require('../util/ip-util');
  const UtilChildProcess = global.helper.ChildProcess;
  const UtilFs = global.helper.FS;
  const path = require('path');

  const logger = global.LoggerFactory.getLogger();

  // Node libs
  // const os = require('os');
  // const inspect = require('util').inspect;

  const CONNECTION = require('../nmcli/connection-constants');

  // Bits Libraries
  const WifiConfig = require('./wifi-config');
  const WifiMessenger = require('./wifi-messenger');
  const NetworkDeviceManager = require('../network-device-manager');

  const UDEV_TYPE = 'wlan';

  const EVENTS = {
    SCAN_RESULTS: 'scan-results'
  };

  // TODO we might want to put these into the utils dir within a class
  const ssidRegex = new RegExp(/^[a-zA-Z0-9-_\.]{1,32}$/);
  const passpharaseRegex = new RegExp(/^[a-zA-Z0-9~`!@#$%\^&\*\(\)-=+;\[\]{};:\'\"<>,\./\?\\\|]{0,63}$/);
  const bandRegex = new RegExp(/^[a-z]+$/);
  const channelRegex = new RegExp(/^\d+$/);

  const HostApdService = require('./hostapd/hostapd-service');
  class WifiDeviceManager extends NetworkDeviceManager {

    constructor(nmcliManager) {
      debug('constructor');
      super(nmcliManager, WifiMessenger, UDEV_TYPE, nmcliManager.DEVICE.TYPES.WIFI, WifiConfig);
      this._hostapdService = new HostApdService();
    }

    get EVENTS() {
      super.EVENTS.SCAN_RESULTS = EVENTS.SCAN_RESULTS;
      return super.EVENTS;
    }

    load(messageCenter) {
      this._messageCenter = messageCenter;
      return super.load(messageCenter)
      .then(() => this._hostapdService.load(messageCenter));
    }

    unload(messageCenter) {
      return this._hostapdService.unload(this._messageCenter)
      .then(() => super.unload());
    }

    getDevices() {
      return this._nmcliManager.getDevices()
        .then(devices => devices.filter(device => this._nmcliType === device.type))
        .then(filteredDevices => {
          return filteredDevices.map(device => {
            if (device.state === 'unmanaged') {
              return this._hostapdService.getConnection(device);
            } else {
              return Promise.resolve(this._createConfig(device));
            }
          });
        })
        .then(devices => Promise.all(devices))
        .then(devices => {
          return devices;
        });
    }

    getRadioState() {
      return this._nmcliManager.getRadioState();
    }

    _createConfig(device) {
      return new WifiConfig(device);
    }

    _filterHotspots(connectionDetails) {
      debug('_filterHotspots: #connectionDetails', connectionDetails.length);
      const hotspotRegex = new RegExp(this._nmcliManager.CONNECTION.VALUES.MODES.AP);
      return connectionDetails.filter(connection => hotspotRegex.test(connection[this._nmcliManager.CONNECTION.FIELDS.MODE]));
    }

    _extractHotspotBSSIDsFromConnectionDetails(hotspots) {
      debug('_extractHotspotBSSIDsFromConnectionDetails: #hotspots', hotspots.length);
      return hotspots.map(hotspot => {
        return hotspot[this._nmcliManager.CONNECTION.FIELDS.BSSID];
      });
    }

    _getConnectionDetails(connections, queryFields) {
      debug('_getConnectionDetails: fields, #connections', queryFields, connections.length);
      return Promise.all(connections.map(connection => this._nmcliManager.getConnectionDetails(connection, queryFields)));
    }

    _getDeviceDetails(devices, queryFields) {
      debug('_getDeviceDetails: fields, #devices', queryFields, devices.length);
      return Promise.all(devices.map(device => this._nmcliManager.getDeviceDetails(device, queryFields)));
    }

    getOnboardDeviceBSSIDs() {
      debug('getOnboardDeviceBSSIDs');
      return Promise.resolve()
        .then(() => this.getUnavailableDevices())
        .then(devices => this._getDeviceDetails(devices, [this._nmcliManager.DEVICE.FIELDS.MAC]))
        .then(deviceDetails => deviceDetails.map(detail => {
          return detail[this._nmcliManager.DEVICE.FIELDS.MAC];
        }));

      // TODO this is the proper way to get the mac since mac spoofing can be used meaning the connection may not have the physical device's mac
      // TODO one day when we tell network manager to use a specific mac in our connection profiles we can use this, but right now
      // we don't have a reference to the physical mac when we setup a hotspot and the system doesn't automatically set it when we create the connection
      // return this.getConnections()
      //  .then(connections => this._getConnectionDetails(connections, [this._nmcliManager.CONNECTION.FIELDS.MODE, this._nmcliManager.CONNECTION.FIELDS.BSSID]))
      //  .then(details => this._filterHotspots(details))
      //  .then(hotspots => this._extractHotspotBSSIDsFromConnectionDetails(hotspots));
    }

    /*
     ///////////////////////// UI Change Handlers //////////////////////////////////
     */

    _validateHostpot(ifaceName, hotspotConfig) {
      debug('_validateHostpot', ifaceName, hotspotConfig);

      if (!ssidRegex.test(hotspotConfig.ssid)) {
        const msg = 'Invalid hotspot SSID for ' + ifaceName;
        debug(msg);
        return Promise.reject(new TypeError(msg));
      }

      if (!passpharaseRegex.test(hotspotConfig.password)) {
        const msg = 'Invalid hotspot password for ' + ifaceName;
        debug(msg);
        return Promise.reject(new TypeError(msg));
      }

      if (!bandRegex.test(hotspotConfig.band)) {
        const msg = 'Invalid hotspot band for ' + ifaceName;
        debug(msg);
        return Promise.reject(new TypeError(msg));
      }

      if (!channelRegex.test(hotspotConfig.channel)) {
        const msg = 'Invalid hotspot channel for ' + ifaceName;
        debug(msg);
        return Promise.reject(new TypeError(msg));
      }

      debug('Hotspot valid!', hotspotConfig.ssid);
      return true;
    }

    _validateClientConfig(ifaceName, clientConfig) {
      debug('_validateClientConfig', ifaceName);

      if (!ssidRegex.test(clientConfig.ssid)) {
        const msg = 'Invalid client SSID for ' + ifaceName;
        debug(msg);
        return Promise.reject(new TypeError(msg));
      }

      if (!passpharaseRegex.test(clientConfig.password)) {
        const msg = 'Invalid client password for ' + ifaceName;
        debug(msg);
        return Promise.reject(new TypeError(msg));
      }

      clientConfig.isAutoConnect = false;

      debug('Client valid!', clientConfig);
      return true;
    }

    _applyChangesFromMode(newConfig) {
      debug('_applyChangesFromMode iface=%s, oldMode=%s, newMode=%s', newConfig.name, newConfig.mode, newConfig.mode);
      /*
       The mode is not as important as the individual parameters so we just determine which of those
       params to check based on the mode. This means we don't care if the mode changes or not, we just
       use it to determine which parameter checks to perform and leave change detection up to those
       modes.
       */

      switch (newConfig.mode) {
        case WifiConfig.MODES.BRIDGE:
          return this._hostapdService.createHotspot(newConfig);

        case WifiConfig.MODES.HOTSPOT:
          debug('Handle Mode HOTSPOT: name=%s, oldMode=%s, isConnected=%s', newConfig.name, newConfig.mode);
          return Promise.resolve()
          .then(() => this._validateHostpot(newConfig.name, newConfig.hotspot))
          .then(() => this.activateHotspot(newConfig));

        // Check for client config changes and only apply if there are changes
        case WifiConfig.MODES.CLIENT:
          debug('Handle Mode Client: name=%s, oldMode=%s, isConnected=%s', newConfig.name, newConfig.mode);
          return Promise.resolve()
          .then(() => this._validateClientConfig(newConfig.name, newConfig.client))
          .then(() => this.connectToClient(newConfig));

        // This should shut down wifi. We let it try to shutdown all configs so no matter how it was created after this call we know it to be dead
        case WifiConfig.MODES.NONE:
          debug('Handle Mode NONE: name=%s, oldMode=%s, isConnected=%s', newConfig.name, newConfig.mode);
          return Promise.resolve()
          .then(() => this._hostapdService.shutdownAccessPoint(newConfig.name))
          .catch(err => {
            logger.error('Error killing hostapd', err);
          })
          .then(() => this._applyNone(newConfig.name))
          .catch(err => {
            logger.warn('Errors killing nmcli manager ethernet config', err);
            return Promise.resolve();
          });

        // This should never happen
        default:
          return Promise.reject('Unknown mode: ' + newConfig.mode);
      }
    }

    _applyNone(name) {
      return Promise.resolve()
      .then(() => this._nmcliManager.getConnections())
      .then(connections => {
        return Promise.all(connections.map(connection => {
          return this._nmcliManager.getConnectionDetails(connection)
          .then(result => {
            if (result['connection.interface-name'] === name) {
              return this._nmcliManager.setConnectionDown(result['connection.id']);
            } else {
              return Promise.resolve();
            }
          });
        }));
      });
    }

    // TODO make this call nmcli manager exec with the args
    activateHotspot(newConfig) {
      debug('activateHotspot', newConfig);

      let octet = 42;
      return Promise.resolve()
        .then(() => {
          if (newConfig.hotspot.address) {
            return newConfig.hotspot.address;
          } else {
            return Promise.resolve(this._nmcliManager.getConnections())
              .then(connections => {
                return Promise.all(connections.map(connection => {
                  return this._nmcliManager.getConnectionDetails(connection)
                      .then(result => result[CONNECTION.DETAILS.IP_V4.ADDRESSES])
                      .then(address => {
                        if (address) {
                          return parseInt(address.split('.')[1], 10); // Gets the second octet as an int
                        } else {
                          return 42;
                        }
                      });
                }))
                  .then(ipAddressInUse => this._findLowestOctet(octet, ipAddressInUse))
                  .then(ipOctet => {
                    ipOctet = ipOctet || '42';
                    return '10.' + ipOctet + '.0.1/24';
                  });
              });
          }
        })
        .then(ip => {
          return this._nmcliManager.activateHotspot(
              newConfig.name,
              newConfig.hotspot.ssid,
              newConfig.hotspot.password,
              newConfig.hotspot.isAutoConnect,
              newConfig.hotspot.band,
              newConfig.hotspot.channel,
              ip
            )
            .then(() => ip);
        })
        .then(ipToSet => {
          if (newConfig.hotspot.resolveBitsId) {
            return this._messageCenter.sendRequest('base#modules get data dir', null, {
              name: 'network-manager'
            })
              .then(dataDir => {
                return this._messageCenter.sendRequest('base#system get bitsid', null, {
                  name: 'network-manager'
                })
                  .then(bitsId => {
                    return UtilFs.writeFile(path.join(dataDir, 'dns'), IpUtil.getBaseIp(ipToSet) + '\t' + bitsId)
                      .then(() => UtilChildProcess.createSpawnPromise('systemctl', ['--signal=SIGHUP', 'kill', 'dnsmasq']))
                      .catch(err => {
                        bitsLogger.warn('Error sending sighup', err);
                      });
                  });
              });
          } else {
            return Promise.resolve();
          }
        });
    }

    _findLowestOctet(octet, listToSearch) {
      if (listToSearch.includes(octet)) {
        return this._findLowestOctet(octet + 1, listToSearch);
      } else {
        return octet;
      }
    }

    // TODO re-implement this using the new nmcli manager
    connectToClient(newConfig) {
      debug('connectToClient', newConfig);
      return this._nmcliManager.connectToWifiAccessPoint(
        newConfig.name,
        newConfig.client.ssid,
        newConfig.client.password,
        false
      );
    }

    applyChanges(config) {
      return this._applyChangesFromMode(config)
        .then(() => {
          bitsLogger.debug('Wifi config successfully applied');
        })
        .catch(err => {
          bitsLogger.error('Failed to apply Wi-Fi configs!', err);
          return Promise.reject(err);
        });
    }
    scan(ifaceName) {
      debug('scan', ifaceName);
      // TODO when this service becomes globally available provide a way for the requesting module to only scan with it's reserved devices
      // return Promise.resolve()
      //  .then(() => this._checkDeviceAvailable(ifaceName))
      return this._nmcliManager.scan(ifaceName);
    }

  } // End Class

  module.exports = WifiDeviceManager;
})();
