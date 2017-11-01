(() => {
  'use strict';

  // For dev logs
  const DEBUG_TAG = 'NETWORK_MGR:DEVICE_MANAGER_BASE';
  const debug = require('debug')(DEBUG_TAG);
  const bitsLogger = global.LoggerFactory.getLogger();

  // Node libs
  // const os = require('os');
  const EventEmitter = require('events').EventEmitter;

  // Other libs
  const udev = require('udev');
  const monitor = udev.monitor();

  // Bits Libraries
  const DeviceUnavailableError = require('./device-unavailable-error');

  // TODO categorize these so we know what is coming from where
  const EVENTS = {
    AVAILABLE_DEVICES: 'available-devices',
    DEVICE_ADDED: 'device-added',
    DEVICE_REMOVED: 'device-removed',
    DEVICE_CHANGED: 'device-changed',
    UDEV: {
      ADD: 'add',
      REMOVE: 'remove',
      CHANGE: 'change'
    }
  };

  class NetworkDeviceManager extends EventEmitter {

    /**
     * Create an instance of a NetworkDeviceManager
     * @param {NmcliManager} nmcliManager - current instance of the NmcliManager
     * @param {Messenger} Messenger - messenger constructor
     * @param {string} udevType - udev device type to listen for
     * @param {string} nmcliType - the nmcli device type for this manager
     * @param {Object} Config - The config for the device
     */
    constructor(nmcliManager, Messenger, udevType, nmcliType, Config) {
      debug('constructor');
      super();

      /**
       * Holds a reference to all the events this WifiDeviceManager subscribes too. Mostly for udev.
       * @type {Array}
       * @private
       */
      this._udevHandlers = [];
      this._nmcliHandlers = [];
      this._nmcliManager = nmcliManager;
      this._messenger = new Messenger(this);
      this._udevType = udevType;
      this._nmcliType = nmcliType;
      // TODO this is a hack and should be refactored
      this.Config = Config;
      /**
       * Holds a reference to all of the wifi devices found by nmcli
       * We initialize this with an empty collection so we always have an array of devices, even if it's empty
       * @type {Array}
       * @private
       */

      this._bitsId = null;

      // This is a nifty trick to prevent multiple requests for promises to modify data references used in the chain
      // We create this promise here but it is not returned. We will chain off of this and then return it when we need it.
      this._promiseChain = Promise.resolve();

      this._pendingUpdate = null;
    }

    _setBitsId(id) {
      this._bitsId = id;
    }

    get EVENTS() {
      return EVENTS;
    }

    getDevices() {
      return this._nmcliManager.getDevices()
        .then(devices => devices.filter(device => this._nmcliType === device.type))
        .then(filteredDevices => {
          return filteredDevices.map(device => {
            return this._createConfig(device);
          });
        });
    }

    /**
     * Return the config who's name matches the supplied string.
     * @param {string} name - the name of the config to find IE the interface name
     * @return {IfaceConfig} a subclass of IfaceConfig matching the supplied name
     */
    lookupDeviceByName(name) {
      let regex = null;
      if (typeof name === 'string') {
        regex = new RegExp(name);
      } else {
        throw new TypeError('LookupByName must supply a string');
      }
      return this.getDevices()
        .then(devices => devices.find(device => regex.test(device.name)));
    }

    _findDevice(device) {
      debug('_findDevice', device, typeof device);
      if (typeof device === 'object') {
        return this.getDevices()
          .then(devices => devices.find(currentDevice => new RegExp(currentDevice.name).test(device.name)));
      }
      if (typeof device === 'string') {
        return this.getDevices()
          .then(devices => device.find(currentDevice => new RegExp(currentDevice.name).test(device)));
      }
    }

    filterDevicesByType(devices, type) {
      if (typeof type !== 'string') {
        throw new TypeError('filterDevicesByType type must be a string');
      }
      const regex = new RegExp(type);
      return devices.filter(device => regex.test(device.type));
    }

    _getDevicesFromNetworkManager() {
      return this._nmcliManager.getDevices();
    }

    getConnectionsFromNetworkManager() {
      return this._nmcliManager.getConnections();
    }

    _emitAvailableDevices(devices) {
      debug('_emitAvailableDevices', devices);
      if (!Array.isArray(devices)) {
        return;
      }
      if (devices.length === 0) {
        bitsLogger.info('No available devices were detected.');
      }
      this.emit(this.EVENTS.AVAILABLE_DEVICES, devices);
    }

    _handlePendingUdevUpdate() {
      if (this._pendingUpdate === null || this._pendingUpdate === undefined) {
        return;
      }

      debug('Emitting interface', this._pendingUpdate);
      this.emit(this._pendingUpdate.event, this._findDevice(this._pendingUpdate.deviceName));
      this._pendingUpdate = null;
    }

    /**
     * Event handler for when NmcliManager sends a new device list
     * @param {Array} devices - an array of NetworkDevices
     * @return {promise} the promise chain
     * @private
     */
    _updateDevices(devices) {
      debug('_updateDevices', devices);
      // TODO
      bitsLogger.warn('_updateDevices NOT IMPLEMENTED');
      return Promise.resolve();
    }

    _onUdevDeviceAdded(udevEvent) {
      if (udevEvent.hasOwnProperty('DEVTYPE')) {
        debug('UDEV device added', udevEvent);
        if (udevEvent.DEVTYPE === this._udevType) {
          this._nmcliManager.getDevices()
            .then(devices => this.emitDevices(devices));
        }
      }
    }

    _onUdevDeviceRemoved(udevEvent) {
      if (udevEvent.hasOwnProperty('DEVTYPE')) {
        debug('UDEV device removed', udevEvent);
        if (udevEvent.DEVTYPE === this._udevType) {
          this._nmcliManager.getDevices()
            .then(devices => this.emitDevices(devices));
        }
      }
    }

    _onUdevDeviceChanged(udevEvent) {
      if (udevEvent.hasOwnProperty('DEVTYPE')) {
        debug('UDEV device changed', udevEvent);
        if (udevEvent.DEVTYPE === this._udevType) {
          this._nmcliManager.getDevices()
            .then(devices => this.emitDevices(devices));
        }
      }
    }

    emitDevices(devices) {
      // TODO
    }

    _registerListeners() {
      debug('_registerListeners');
      const networkDeviceManager = this;
      networkDeviceManager._udevHandlers.push({
        event: EVENTS.UDEV.ADD,
        callback: networkDeviceManager._onUdevDeviceAdded.bind(networkDeviceManager)
      });
      networkDeviceManager._udevHandlers.push({
        event: EVENTS.UDEV.REMOVE,
        callback: networkDeviceManager._onUdevDeviceRemoved.bind(networkDeviceManager)
      });
      networkDeviceManager._udevHandlers.push({
        event: EVENTS.UDEV.CHANGE,
        callback: networkDeviceManager._onUdevDeviceChanged.bind(networkDeviceManager)
      });
      networkDeviceManager._udevHandlers.forEach(handler => {
        monitor.on(handler.event, handler.callback);
      });

      networkDeviceManager._nmcliHandlers.push({
        event: this._nmcliManager.EVENTS.DEVICES,
        callback: networkDeviceManager._updateDevices.bind(networkDeviceManager)
      });
      networkDeviceManager._nmcliHandlers.forEach(handler => this._nmcliManager.on(handler.event, handler.callback));
    }

    _removeListeners() {
      debug('_removeListeners');
      this._udevHandlers.forEach(handler => monitor.removeListener(handler.event, handler.callback));
      this._nmcliHandlers.forEach(handler => this._nmcliManager.removeListener(handler.event, handler.callback));
    }

    _checkDeviceAvailable(ifaceName) {
      debug('_checkDeviceAvailable', ifaceName);
      let matchingDevice = this._findDevice(ifaceName);

      if (!matchingDevice) {
        return false;
      }

      if (matchingDevice.isAvailable) {
        return matchingDevice;
      } else {
        throw new DeviceUnavailableError(ifaceName, matchingDevice.consumer);
      }
    }

    // TODO we might want to have a general apply that wraps the priomise chain trick in the base class
    // /**
    // * Accepts an array of Wifi Config objects and determines if those objects are different from the
    // * currently active configs.
    // * NOTE: The configs array is supplied from the socket and is therefore not an array of WifiConfig
    // * classes but rather a similar structure without the class wrapper.
    // * @param {Array} configs - new wifi configurations to be applied
    // * @return {Promise} to apply the changes
    // */
    // applyChanges(configs) {
    //  debug('applyChanges', configs);
    //
    //  this._promiseChain = this._promiseChain.then(() => {
    //    return configs.reduce((chain, newConfig) => {
    //      const oldConfig = this._wifiConfigCollection.lookupByName(newConfig.name);
    //      return chain.then(() => this._applyChangesFromMode(oldConfig, newConfig));
    //    }, this._promiseChain)
    //      .then(() => this.getAndRefreshConfigList())
    //      .then(configs => this._handleFinishApply(configs))
    //      .catch(err => {
    //        bitsLogger.error('Unable to apply wifi configs!', err);
    //        throw new Error(err);
    //      });
    //  });

    load(messageCenter) {
      debug('load');
      return this._messenger.load(messageCenter)
        .then(() => this._registerListeners())
        .then(() => this._getDevicesFromNetworkManager())
        .then(devices => this._updateDevices(devices));
      // .then(() => this.getDevices())
      // .then((devices) => debug('devcies', inspect(devices, {depth: 5})))
      // Get and emit a list of the avaiable devices so anyone who cares can see them
      // .then(() => this._emitAvailableDevices(this.getAvailableDevices()));
    }

    unload() {
      debug('unload');
      return this._messenger.unload()
        .then(() => this._removeListeners());
    }

  } // End Class

  module.exports = NetworkDeviceManager;
})();
