(() => {
  'use strict';

  const DEBUG_TAG = 'NETWORK_MGR:NMCLI';
  const debug = require('debug')(DEBUG_TAG);
  const bitsLogger = global.LoggerFactory.getLogger();

  const DEBUG_SILLY = false;
  const debugSilly = function(...args) {
    if (DEBUG_SILLY) {
      debug(...args);
    }
  };

  /**
   * Database for IEEE registered Organizationally Unique Identifiers.
   * These are the portions of a MAC address that identify the manufacturer
   * @type {any|*}
   */
  const oui = require('oui');
  const EventEmitter = require('events').EventEmitter;

  // BITS Imports
  const UtilChildProcess = global.utils.UtilChildProcess;
  const NetworkDevice = require('./network-device');
  const NetworkConnection = require('./network-connection');
  const WifiScanResult = require('./wifi-scan-result');
  const DEVICE = require('../nmcli/device-constants');
  const CONNECTION = require('../nmcli/connection-constants');

  const EVENTS = {
    DEVICES: 'devices',
    CONNECTIONS: 'connections'
  };

  /**
   * Root command string for the Linux nmcli command line tool.
   * @type {string}
   */
  const NMCLI_CMD = 'nmcli';
  const COMMA = ',';

  /**
   * Command line args for Linux nmcli
   * @type {{DEVICE: string, CONNECTION: string, RADIO: string, WIFI: string, MODIFY: string, CONNECTION_NAME: string, HOTSPOT: string, ADD: string, TYPE: string, UP: string, DOWN: string, DISCONNECT: string, CONNECT: string, TERSE: string, FIELDS: string, SHOW_SECRETS: string, LIST: string, SHOW: string, IFNAME: string, RESCAN: string, SSID: string, AUTOCONNECT: string, WIFI_MODE: string, PASSWORD: string, ACTIVE: string}}
   */
  const ARGS = {
    DEVICE: 'device',
    CONNECTION: 'connection',
    RADIO: 'radio',
    WIFI: 'wifi',
    MODIFY: 'modify',
    CONNECTION_NAME: 'con-name',
    HOTSPOT: 'hotspot',
    ADD: 'add',
    TYPE: 'type',
    UP: 'up',
    DOWN: 'down',
    DISCONNECT: 'disconnect',
    CONNECT: 'connect',
    TERSE: '-t',
    FIELDS: '-f',
    SHOW_SECRETS: '--show-secrets',
    LIST: 'list',
    SHOW: 'show',
    IFNAME: 'ifname',
    RESCAN: 'rescan',
    SSID: 'ssid',
    // TODO this is a connection field and should be in the connection constants
    AUTOCONNECT: 'autoconnect',
    WIFI_MODE: 'mode',
    PASSWORD: 'password',
    ACTIVE: '--active',
    LONG_OPTION_SEPARATOR: '--',
    NO: 'no',
    DELETE: 'delete',
    ALL: 'all'
  };

  /**
   * nmcli output fields.
   * These can be specified when issuing an nmcli command to filter the output.
   * @type {{DEVICE: string, TYPE: string, CONNECTION: string, SSID: string, CHANNEL: string, SIGNAL: string, SECURITY: string, FREQUENCY: string, BSSID: string, UUID: string, NAME: string, ACTIVE: string}}
   */
  const FIELDS = {
    DEVICE: 'DEVICE',
    TYPE: 'TYPE',
    CONNECTION: 'CONNECTION',
    SSID: 'SSID',
    CHANNEL: 'CHAN',
    SIGNAL: 'SIGNAL',
    SECURITY: 'SECURITY',
    FREQUENCY: 'FREQ',
    BSSID: 'BSSID',
    UUID: 'UUID',
    NAME: 'NAME',
    ACTIVE: 'ACTIVE',
    STATE: 'STATE'
  };

  /**
   * Regular expressions used to parse output from Linux nmcli
   * @type {{SSID_FIELD: RegExp, PASSPHRASE_FIELD: RegExp, AUTOCONNECT_FIELD: RegExp, BAND_FIELD: RegExp, CHANNEL_FIELD: RegExp, CONNECTION_TYPE_HOTSPOT: RegExp, NOT_AVAILABLE: RegExp, YES: RegExp, WIFI: RegExp, ETHERNET: RegExp, LOOPBACK: RegExp}}
   */
  const REGEX = {
    SSID_FIELD: new RegExp('802-11-wireless.ssid'),
    PASSPHRASE_FIELD: new RegExp('802-11-wireless-security.psk'),
    AUTOCONNECT_FIELD: new RegExp('connection.autoconnect'),
    BAND_FIELD: new RegExp('802-11-wireless.band'),
    CHANNEL_FIELD: new RegExp('802-11-wireless.channel'),
    CONNECTION_TYPE_HOTSPOT: new RegExp(/hotspot/i),
    NOT_AVAILABLE: new RegExp(/--/),
    YES: new RegExp(/yes/),
    WIFI: new RegExp(/wifi/),
    ETHERNET: new RegExp(/ethernet/),
    LOOPBACK: new RegExp(/loopback/)
  };

  /**
   * Nmcli query argument string to provide what we care about for device specific fields
   * List devices command:
   * nmcli -t -f DEVICE,TYPE,CONNECTION d
   * @type {[*]}
   */
  const QUERY_DEVICE_FIELDS = [FIELDS.DEVICE, FIELDS.TYPE, FIELDS.CONNECTION, FIELDS.STATE];

  /**
   * Nmcli query argument string to provide details about a Wi-Fi scan
   * Scan Command:
   * nmcli -t -f DEVICE,SSID,SIGNAL,FREQ,CHAN,BSSID d wifi list ifname wlp2s0
   * @type {[*]}
   */
  const QUERY_SCAN_FIELDS = [FIELDS.DEVICE, FIELDS.SSID, FIELDS.SIGNAL, FIELDS.FREQUENCY, FIELDS.CHANNEL, FIELDS.BSSID, FIELDS.SECURITY];

  /**
   * Wrapper Class for executing Linux Network Manager commands.
   * Has a default constructor with no parameters.
   */
  class NmcliManager extends EventEmitter {
    constructor() {
      super();
      /**
       * Holds a reference to all of the devices found by nmcli
       * We initialize this with an empty collection so we always have an array of devices, even if it's empty
       * @type {Array}
       * @private
       */
      this._devices = [];

      /**
       * Holds a reference to all of the connections found by nmcli
       * We initialize this with an empty collection so we always have an array of connections, even if it's empty
       * @type {Array}
       * @private
       */
      this._connections = [];
    }

    get EVENTS() {
      return EVENTS;
    }

    get DEVICE() {
      return DEVICE;
    }

    get CONNECTION() {
      return CONNECTION;
    }

    getDevices(type) {
      return this._execQueryDevices(QUERY_DEVICE_FIELDS)
        .then(result => this._parseNonDetailQueryResult(result.stdout, QUERY_DEVICE_FIELDS))
        .then(deviceList => this._buildNetworkDeviceArray(deviceList))
        .then(deviceList => {
          if (type) {
            return this._filterDeviceType(type, deviceList);
          } else {
            return deviceList;
          }
        });
    }

    getConnections(type) {
      return this._execQueryConnections()
        .then(results => this._parseNonDetailQueryResult(results.stdout, ['NAME', 'UUID', 'TYPE', 'DEVICE']))
        .then(results => this._buildNetworkConnectionArray(results));
    }

    setConnections(connections) {
      this._connections = connections;
    }

    getAvailableDevices() {
      return this._deviceList.filter(device => device.isAvailable);
    }

    getUnavailableDevices() {
      return this._deviceList.filter(device => !device.isAvailable);
    }

    _buildFieldQueryString(fields) {
      debugSilly('_buildFieldQueryString', fields);
      if (fields === null || fields === undefined) {
        return ARGS.ALL;
      }

      if (!Array.isArray(fields) || fields.length === 0) {
        throw new TypeError('Must supply an array of nmcli fields to build query string!');
      }

      return fields.reduce((accumulator, field) => {
        return accumulator + COMMA + field;
      });
    }

    _handleError() {
      const argsArray = Array.prototype.slice.call(arguments);
      debug('_handleError', argsArray);
      bitsLogger.error('nmcli Error!', argsArray);
      throw new Error(argsArray);
    }

    _handleExitCode(cmdResults) {
      debug('_handleExitCode', cmdResults);

      switch (cmdResults.code) {
        case 0:
        // No errors
          return cmdResults;
        case 4:
        // Connection activation error which mostly means we applied an unsupported config for this device
        // NOTE: Some Wifi devices say they support configs and they really don't.
          return this._handleError('Invalid or unsupported network configuration!');
        case 10:
          return Promise.resolve('Connection profile does not exist, continuing...');
        default:
          return this._handleError(cmdResults.stderr.toString());
      }
    }

    /**
     * This is a hack since we can't always count on UtilChildProcess stdout to produce a consistent return object.
     * It will either be an array containing one entry per line printed to stdout or an array with one giant entry that
     * contains all lines concatenated together (note: this giant line will still have newline separators); We basically
     * force it to be one giant line every time and then split it on the newline chars and remove the first line
     * since it's always the header field.
     * @param {Array} stdout - array of lines from stdout
     * @return {Array} array of actual new-line separated output.
     */
    _getNewlineSeparatedOutputArray(stdout) {
      debugSilly('_getNewlineSeparatedOutputArray', stdout);
      const arrayOfLines = stdout.join('').split(/\n/);
      // Remove any empty strings as a result of splitting on newline
      if (arrayOfLines[arrayOfLines.length - 1].length === 0) {
        arrayOfLines.pop();
      }

      return arrayOfLines;
    }

    _getColonSeparatedOutputArray(line) {
      debugSilly('_getColonSeparatedOutputArray', line);
      return line.split(/:/);
    }

    /**
     * Interprets the Network Manager output and extracts either a field value or null for the items that
     * Network Manager says is unavailable. This makes it easier to consume later.
     * @param {string} value - a string representing the nmcli output value for a field
     * @return {string} the field value or null if the field value matches the 'unavailable' string.
     * @private
     */
    _getValueFromNetworkManagerOutput(value) {
      debugSilly('_getValueFromNetworkManagerOutput', value);
      value = value.trim();
      if (REGEX.NOT_AVAILABLE.test(value)) {
        return null;
      } else {
        return value;
      }
    }

    _fixNetworkManagerMacAddresses(scanLines) {
      debugSilly('_fixNetworkManagerMacAddresses', scanLines);
      return scanLines.map(line => {
        return line.replace(new RegExp(/\\:/g), '-');
      });
    }

    /**
     * Creates an object where the keys match the supplied array of string fields and the values are the array of
     * lines index. This means the return object will contain {fields[0]: lines[0]...}.
     * @param {Array} fields - array of strings where each index contains an nmcli field to be parsed
     * @param {Array} lines - array of lines containing stdout strings
     * @return {string} - an object containing all the fields as keys and the values from the corresponding line
     * @private
     */
    _parseColonDelimitedFields(fields, lines) {
      debugSilly('_parseColonDelimitedFields #fields, #lines, fields, lines', fields.length, lines.length, fields, lines);

      if (lines.length !== fields.length) {
        throw new Error('Cannot parse colon delimited fields, line array length does not match field array!');
      }

      const parsedObject = {};
      return fields.reduce((accumulator, field, index) => {
        debugSilly('field, index', field, index);
        // We had to do this because we were getting read-only property errors
        return Object.defineProperty(
          accumulator,
          field, {
            configurable: true,
            enumerable: true,
            value: this._getValueFromNetworkManagerOutput(lines[index]),
            writeable: true
          });
      }, parsedObject);
    }

    /**
     * Constructs an array of objects with the key and value pairs output by nmcli device query
     * @param {Array} stdout - an array of string output from stdout nmcli command
     * @param {Array} queryFields - an array of string fields that should be in the output. These are parsed.
     * @return {Array} - an array of objects where each object contains key value pairs matching the query fields
     * @private
     */
    _parseNonDetailQueryResult(stdout, queryFields) {
      debug('_parseNonDetailQueryResult', stdout, queryFields);
      // Create an array of lines where each line represents a device definition
      const lines = this._getNewlineSeparatedOutputArray(stdout);

      // Create an array of objects containing the device fields and line values
      return lines.map(line => this._parseColonDelimitedFields(queryFields, this._getColonSeparatedOutputArray(line)));
    }

    /**
     * Constructs an array of objects with the key and value pairs output by nmcli wifi scan
     *
     * Sample scan output. NOTE how nmcli is inconsistent in displaying fields that are unavailable. The end of
     * each line should be a colon with a type of security (WPA/WPA2 etc...). You will notice that when the SSID
     * is unavailable it is printed with a '--' however, when SECURITY is unavailable it is the empty string.Also note how the SSID is printed as escaped colon separated values even though the rest of the line is
     * colon separated. This forces us to parse that field differently.
     *
     * nmcli -t -f DEVICE,SSID,SIGNAL,FREQ,CHAN,BSSID,SECURITY d wifi list ifname wlp2s0
     * wlp2s0:HP-Print-2D-LaserJet 1102:85:2437 MHz:6:9C\:AD\:97\:04\:14\:2D:
     * wlp2s0:--:75:2422 MHz:3:00\:17\:C5\:BE\:26\:30:WPA2
     * wlp2s0:--:37:2417 MHz:2:00\:17\:C5\:BE\:24\:A4:WPA2
     *
     *
     * @param {Array} stdout - an array of string output from stdout nmcli command
     * @return {Array} - an array of objects where each object contains key value pairs matching the query fields
     * @private
     */
    _parseWifiScanResults(stdout) {
      debug('_parseWifiScanResults', stdout);
      // Each scan is reported on a newline so we separate the output into scan lines
      const scanLines = this._getNewlineSeparatedOutputArray(stdout);

      // This addresses the above issue by replacing all the escaped colons with dashes so we can parse it normally
      const fixedLines = this._fixNetworkManagerMacAddresses(scanLines);

      // Create an array of objects containing scan definitions that we can convert into WifiScanResult objects
      return fixedLines.map(line => this._parseColonDelimitedFields(QUERY_SCAN_FIELDS, this._getColonSeparatedOutputArray(line)));
    }

    /**
     * Converts a yes/no string into a boolean value
     * @param {string} activeString - the nmcli value for a yes/no field
     * @return {boolean} true if string is 'yes'
     * @private
     */
    _parseIsConnectionActive(activeString) {
      debugSilly('_parseIsConnectionActive', activeString);
      return REGEX.YES.test(activeString);
    }

    /**
     * Takes stdout from the nmcli details query (connection or device) and converts it into
     * a single object where each line of stdout represents a key/value pair of the object.
     * For Example:
     * Given a stdout array of lines...
     * line1 = key:val
     * line2 = key2:val2
     * The resulting object will be {key: val, key2: val2}
     *
     * @param {Array} stdout - an array of stdout strings from nmcli
     * @param {Object} parseOnto - an optional object to add key/value pairs to.
     * @return {Object} the parseOnto object supplied or a new object.
     * @private
     */
    _parseNetworkManagerDetails(stdout, parseOnto) {
      debugSilly('_parseNetworkManagerDetails', stdout, parseOnto);
      const detailLines = this._getNewlineSeparatedOutputArray(stdout);
      parseOnto = parseOnto || {};
      return detailLines.reduce((parseOnto, line) => {
        // Connection details are printed one field per line and is separated by colon
        line = line.trim();
        const key = line.substring(0, line.indexOf(':'));
        // NOTE: We change the mac to dash separated values because nmcli prints it funny in scans and we do that there.
        let val = line.substring((line.indexOf(':') + 1)).replace(new RegExp(/:/g), '-');

        // Rather than put string values of -- into our object when the value is unavailable we convert it to null
        if (REGEX.NOT_AVAILABLE.test(val) || val.length === 0) {
          val = null;
        }

        if (val === 'no') {
          val = false;
        }

        if (val === 'yes') {
          val = true;
        }

        // Create the object
        return Object.defineProperty(
          parseOnto,
          key, {
            configurable: true,
            enumerable: true,
            value: val,
            writeable: true
          });
      }, parseOnto);
    }

    /**
     * Extracts the value of the supplied field on the supplied nmcli device representation.
     * @param {object} obj - the parsed nmcli object IE device or connection
     * @param {string} field - the string field to match IE the key
     * @return {*} - the value of the matching field if it exists, or null
     * @private
     */
    _extractFieldValueFromParsedObject(obj, field) {
      debugSilly('_extractFieldValueFromParsedObject', field, obj);
      return obj[Object.keys(obj).find(key => key === field)];
    }

    execNmcli(args) {
      debugSilly('execNmcli', args);
      return UtilChildProcess.createSpawnPromise(NMCLI_CMD, args, null)
        .then(result => {
          return this._handleExitCode(result);
        });
    }

    /**
     * Spawn a nmcli command to list the available devices by type in a colon separated string
     * @param {Array} queryFields - an array of strings naming the fields to query
     * @return {object} an object with the stdout, stderr, and exit code
     * @private
     */
    _execQueryDevices(queryFields) {
      debug('_execQueryDevices');
      // List devices command, will produce colon separated output by fields
      // nmcli -t -f DEVICE,TYPE d
      const args = [
        ARGS.TERSE,
        ARGS.FIELDS,
        this._buildFieldQueryString(queryFields),
        ARGS.DEVICE
      ];

      return this.execNmcli(args);
    }

    _execWifiScan(ifaceName) {
      debug('_execWifiScan', ifaceName);

      /*
       update the scan results -> nmcli d wifi rescan ifname wlp2s0
       show the scan results -> nmcli -t -f SSID,CHAN,SIGNAL,SECURITY d wifi list ifname wlp2s0
       */
      const args = [
        ARGS.DEVICE,
        ARGS.WIFI,
        ARGS.RESCAN,
        ARGS.IFNAME,
        ifaceName
      ];

      return this.execNmcli(args);
    }

    _execGetWifiScanResults(ifaceName) {
      debug('_execGetWifiScanResults', ifaceName);

      /*
       update the scan results -> nmcli d wifi rescan ifname wlp2s0
       show the scan results -> nmcli -t -f DEVICE,SSID,SIGNAL,FREQ,CHAN,BSSID,SECURITY d wifi list ifname wlp2s0
       */
      const args = [
        ARGS.TERSE,
        ARGS.FIELDS,
        this._buildFieldQueryString(QUERY_SCAN_FIELDS),
        ARGS.DEVICE,
        ARGS.WIFI,
        ARGS.LIST,
        ARGS.IFNAME,
        ifaceName
      ];

      return this.execNmcli(args);
    }

    _execQueryConnections(queryFields) {
      debug('_execQueryConnections');
      // nmcli -t -f NAME,UUID,TYPE,DEVICE c show --active
      queryFields = queryFields || ['NAME', 'UUID', 'TYPE', 'DEVICE'];
      const args = [
        ARGS.TERSE,
        ARGS.FIELDS,
        this._buildFieldQueryString(queryFields),
        ARGS.CONNECTION,
        ARGS.SHOW
      ];
      return this.execNmcli(args);
    }

    _execQueryConnectionDetails(uuid, queryFields) {
      debug('_execQueryConnectionDetails', uuid, queryFields);
      // nmcli -t -f 802-11-wireless.mode,802-11-wireless.mac-address c show 395ad987-9996-401b-9596-cb644b30f357

      const args = [
        ARGS.SHOW_SECRETS,
        ARGS.TERSE,
        ARGS.FIELDS,
        this._buildFieldQueryString(queryFields),
        ARGS.CONNECTION,
        ARGS.SHOW,
        uuid
      ];

      return this.execNmcli(args);
    }

    _execQueryDeviceDetails(deviceName, queryFields) {
      debug('_execQueryDeviceDetails', deviceName, queryFields);
      // nmcli -f GENERAL.HWADDR d show wlp2s0
      const args = [
        ARGS.TERSE,
        ARGS.FIELDS,
        this._buildFieldQueryString(queryFields),
        ARGS.DEVICE,
        ARGS.SHOW,
        deviceName
      ];

      return this.execNmcli(args);
    }

    _generateHotspotConnectionName(ifaceName) {
      return ARGS.HOTSPOT + '-' + ifaceName;
    }

    /**
     * Create an nmcli connection profile for a hotspot with a profile name of hotspot-<ifaceName>.
     * @param {string} ifaceName - the name of the wifi interface to use for the hotspot
     * @param {string} mode - the operating mode of the wifi card IE (ap, infrastructure, or adhoc)
     * @param {string} band - the band to operate in IE(bg, n)
     * @param {string} channel - the channel for that band. There are too many to list so look them up (bg supports 1 - 11 USA)
     * @param {string} ssid - the name of the access point. This will be broadcast to all clients during scans
     * @param {string} passphrase - the WPA passphrase to use. NOTE: We currently force WPA2
     * @param {boolean} autoConnect - the WPA passphrase to use. NOTE: We currently force WPA2
     * @param {string} ip - the static ip address
     * @return {Promise} - to execute the nmcli command for creating a hotspot
     * @private
     */
    _execCreateHotspot(ifaceName, mode, band, channel, ssid, passphrase, autoConnect, ip) {
      debug('_execCreateHotspot', ifaceName, mode, band, channel, ssid, passphrase, ip);
      // oneline hotspot: note this should be pasted as one line without the \n which are here for readability
      // nmcli connection add type wifi ifname wlp2s0 con-name hotspot-wlp2s0 autoconnect no ssid Sasquatch --
      // 802-11-wireless.mode ap 802-11-wireless.band bg 802-11-wireless.channel 11 ipv4.method shared
      // 802-11-wireless-security.key-mgmt wpa-psk 802-11-wireless-security.psk test1234

      // TODO: Be better
      let autoConnectString = 'no';

      if (autoConnect) {
        autoConnectString = 'yes';
      }
      const args = [
        ARGS.CONNECTION,
        ARGS.ADD,
        ARGS.TYPE,
        ARGS.WIFI,
        ARGS.IFNAME,
        ifaceName,
        ARGS.CONNECTION_NAME,
        this._generateHotspotConnectionName(ifaceName),
        ARGS.AUTOCONNECT,
        autoConnectString,
        ARGS.SSID,
        ssid,
        ARGS.LONG_OPTION_SEPARATOR,
        CONNECTION.FIELDS.MODE,
        mode,
        CONNECTION.FIELDS.IPV4_METHOD,
        CONNECTION.VALUES.IPV4_METHODS.SHARED,
        CONNECTION.FIELDS.BAND,
        band,
        CONNECTION.FIELDS.CHANNEL,
        channel,
        CONNECTION.FIELDS.IPV4_METHOD,
        CONNECTION.VALUES.IPV4_METHODS.SHARED,
        CONNECTION.DETAILS.IP_V4.ADDRESSES,
        ip,
        CONNECTION.FIELDS.SECURITY,
        CONNECTION.VALUES.SECURITY.WPA,
        CONNECTION.FIELDS.PASSWORD,
        passphrase
      ];
      return this.execNmcli(args);
    }

    _execDeleteConnectionProfileFromNmcli(connectionName) {
      debug('_execDeleteConnectionProfileFromNmcli', connectionName);
      const args = [
        ARGS.CONNECTION,
        ARGS.DELETE,
        connectionName
      ];
      return this.execNmcli(args);
    }

    /**
     * Bring a connection up or down
     * @param {string} connection - connection name
     * @param {string} state - up or down. NOTE: Use ARGS.UP or ARGS.DOWN
     * @return {promise} - to change the connection state
     * @private
     */
    _execSetConnectionState(connection, state) {
      debug('_execSetConnectionState', connection, state);
      const args = [
        ARGS.CONNECTION,
        state,
        connection
      ];
      return this.execNmcli(args);
    }

    /**
     * Bring a device up or down
     * @param {string} device - device name
     * @return {promise} - to disconnect the device
     * @private
     */
    _execDisconnectDevice(device) {
      debug('_execDisconnectDevice', device);
      const args = [
        ARGS.DEVICE,
        ARGS.DISCONNECT,
        device
      ];
      return this.execNmcli(args);
    }

    _execConnectToAccessPoint(ifaceName, ssid, passphrase) {
      debug('_execConnectToAccessPoint', ifaceName, ssid, passphrase);

      const args = [
        ARGS.CONNECTION,
        ARGS.ADD,
        ARGS.TYPE,
        ARGS.WIFI,
        ARGS.IFNAME,
        ifaceName,
        ARGS.CONNECTION_NAME,
        ifaceName,
        ARGS.AUTOCONNECT,
        'yes',
        ARGS.SSID,
        ssid,
        ARGS.LONG_OPTION_SEPARATOR,
        CONNECTION.FIELDS.MODE,
        'infrastructure',
        CONNECTION.FIELDS.SECURITY,
        CONNECTION.VALUES.SECURITY.WPA,
        CONNECTION.FIELDS.PASSWORD,
        passphrase
      ];
      return this.execNmcli(args)
      .then(() => this.setConnectionUp(ifaceName));
    }

    /**
     * Determine if this device is available to be used for something based on it's connection state.
     * @param {string} connection - the nmcli connection string
     * @return {boolean} true if there is no connection
     * @private
     */
    _checkAvailability(connection) {
      debugSilly('_checkAvailability', connection);
      if (!connection) {
        return true;
      }
      return false;
    }

    _isAutoConnect(parsedValue) {
      debugSilly('_isAutoConnect', parsedValue);
      return REGEX.YES.test(parsedValue);
    }

    /**
     * Creates a NetworkDevice object that can be easily consumed by BITS apps using the parsed nmcli device output.
     * @param {array} deviceList - an array of parsed nmcli devices
     * @return {array} of NetworkDevice objects, one for each nmcli device parsed.
     * @private
     */
    _buildNetworkDeviceArray(deviceList) {
      debug('_buildNetworkDeviceArray #devices', deviceList.length);

      // We will use this to accumulate devices
      const networkDevices = [];

      return deviceList.reduce((promiseChain, device) => {
          // Filter out the loopback device always. We do this here since we are already iterating over the array
        let type = this._extractFieldValueFromParsedObject(device, FIELDS.TYPE);
        if (REGEX.LOOPBACK.test(type)) {
          return promiseChain.then(() => Promise.resolve());
        }

          // Continue to parse the remaining parameters so we can use them to create a NetworkDevice
        let name = this._extractFieldValueFromParsedObject(device, FIELDS.DEVICE);
        let connection = this._extractFieldValueFromParsedObject(device, FIELDS.CONNECTION);
        let isAvailable = this._checkAvailability(this._extractFieldValueFromParsedObject(device, FIELDS.CONNECTION));
        let state = this._extractFieldValueFromParsedObject(device, FIELDS.STATE);

          // Get the connection object and then create the device
        return promiseChain.then(() => this.queryNetworkConnectionDetails(connection))
            .then(networkConnection => networkDevices.push(new NetworkDevice(name, type, networkConnection, isAvailable, state)));
      }, Promise.resolve())
        // After we reduce our object creation into a single promise chain, return the array of devices that was created
        .then(() => Promise.resolve(networkDevices));
    }

    /**
     * Create an array of WifiScanResult objects for each parsed nmcli scan
     * @param {Array} scanList - array of parsed scan objects from nmcli
     * @return {Array} an array of WifiScanResult objects
     * @private
     */
    _buildScanArray(scanList) {
      debug('_buildScanArray #scans', scanList.length);
      const dateTime = new Date().toISOString();
      return scanList.map(scan => {
        return new WifiScanResult(
          this._extractFieldValueFromParsedObject(scan, FIELDS.DEVICE),
          this._extractFieldValueFromParsedObject(scan, FIELDS.SSID),
          Number.parseInt(this._extractFieldValueFromParsedObject(scan, FIELDS.SIGNAL), 10),
          this._extractFieldValueFromParsedObject(scan, FIELDS.FREQUENCY),
          Number.parseInt(this._extractFieldValueFromParsedObject(scan, FIELDS.CHANNEL), 10),
          this._extractFieldValueFromParsedObject(scan, FIELDS.BSSID),
          this._extractFieldValueFromParsedObject(scan, FIELDS.SECURITY),
          oui(this._extractFieldValueFromParsedObject(scan, FIELDS.BSSID), {
            strict: true
          }),
          dateTime
        );
      });
    }

    _buildNetworkConnectionArray(connectionList) {
      debug('_buildNetworkConnectionArray #connections', connectionList.length);
      return connectionList.map(connection => {
        return new NetworkConnection(
          this._extractFieldValueFromParsedObject(connection, FIELDS.NAME),
          this._extractFieldValueFromParsedObject(connection, FIELDS.TYPE),
          this._extractFieldValueFromParsedObject(connection, FIELDS.UUID),
          this._extractFieldValueFromParsedObject(connection, FIELDS.DEVICE),
          this._parseIsConnectionActive(this._extractFieldValueFromParsedObject(connection, FIELDS.ACTIVE))
        );
      });
    }

    _filterDeviceType(type, networkDevices) {
      debug('_filterDeviceType type, #devices', type, networkDevices.length);

      switch (type) {
        case DEVICE.TYPES.WIFI:
          return networkDevices.filter(device => REGEX.WIFI.test(device.type));
        case DEVICE.TYPES.ETHERNET:
          return networkDevices.filter(device => REGEX.ETHERNET.test(device.type));
        default:
          return networkDevices;
      }
    }

    _filterConnectionType(type, networkConnections) {
      debug('_filterConnectionType type, #connections', type, networkConnections.length);

      let matcher = new RegExp(type);

      switch (type) {
        case CONNECTION.TYPES.WIFI:
          return networkConnections.filter(conn => matcher.test(conn.type));
        default:
          return networkConnections;
      }
    }

    _handleDisconnectDevice(ifaceName) {
      debug('_handleDisconnectDevice', ifaceName);
      /*
       NOTE: We might want to get the status of this interface from networkmanager rather than relying
       on the boolean since it could be stale data.actual
       */
      return this._execDisconnectDevice(ifaceName)
        .catch(err => {
          bitsLogger.warn('Unable to disconnect device');
          return Promise.resolve();
        });
    }

    _handleDisconnectConnection(connectionName, isCurrentlyEnabled) {
      debug('_handleDisconnectConnection', connectionName, isCurrentlyEnabled);
      if (isCurrentlyEnabled) {
        return this._execConnectionDisconnect(connectionName, isCurrentlyEnabled);
      } else {
        return Promise.resolve();
      }
    }

    _handleRemoveConnectionProfile(connectionName) {
      debug('_handleRemoveConnectionProfile', connectionName);
      return this._execDeleteConnectionProfileFromNmcli(connectionName)
        .catch(err => {
          if (err.code === 10) {
            return Promise.resolve('No profiles to delete, continuing...');
          } else {
            return Promise.reject(err);
          }
        });
    }

    queryNetworkConnectionDetails(connectionName) {
      debug('queryNetworkConnectionDetails', connectionName);

      // If there is no connection name that means we don't have a connection so we just return null
      if (connectionName === null || connectionName === undefined) {
        return Promise.resolve(null);
      }

      return this._execQueryConnectionDetails(connectionName)
        .then(result => this._parseNetworkManagerDetails(result.stdout, null));
    }

    getConnectionDetails(networkConnection, queryFields) {
      debug('getConnectionDetails', networkConnection, queryFields);
      return this._execQueryConnectionDetails(networkConnection.uuid, queryFields)
        .then(results => this._parseNetworkManagerDetails(results.stdout, {
          uuid: networkConnection.uuid
        }));
    }

    getDeviceDetails(networkDevice, queryFields) {
      debug('getDeviceDetails', networkDevice, queryFields);
      return this._execQueryDeviceDetails(networkDevice.name, queryFields)
        .then(results => this._parseNetworkManagerDetails(results.stdout, {
          device: networkDevice.name
        }));
    }

    /**
     * Perform a new wifi scan and get an array of scan results from the supplied device
     * @param {string} ifaceName - the name of the Linux iface to perform the scan
     * @return {Promise} to scan and return an array of WifiScanResult objects
     */
    // TODO move this into the wifi manager
    scan(ifaceName) {
      debug('scan', ifaceName);
      return this._execWifiScan(ifaceName)
        .then(() => this._execGetWifiScanResults(ifaceName))
        .then(results => this._parseWifiScanResults(results.stdout))
        .then(scanList => this._buildScanArray(scanList));
    }

    // TODO move this into the wifi-manager
    activateHotspot(ifaceName, ssid, passphrase, isAutoConnect, band, channel, ip) {
      debug('activateHotspot', ifaceName, ssid, passphrase, isAutoConnect, ip);

      const connectionName = this._generateHotspotConnectionName(ifaceName);

      /*
       Rather than check for existing connections and then modify something we only allow one hotspot profile per
       interface which means we simply delete any pre-existing profiles and create a new one with the new ssid
       and passphrase.
       */
      return this._handleDisconnectDevice(ifaceName)
        .then(result => this._handleRemoveConnectionProfile(connectionName))
        // TODO need supply infrastructure mode first and attempt to bring up, then fallback to ap mode
        .then(result => this._execCreateHotspot(ifaceName, 'ap', band, channel, ssid, passphrase, isAutoConnect, ip))
        .then(result => this._execSetConnectionState(connectionName, ARGS.UP));
    }

    // TODO move this into the wifi manager....maybe
    connectToWifiAccessPoint(ifaceName, ssid, passphrase) {
      debug('connectToWifiAccessPoint', ifaceName, ssid, passphrase);
      return this._handleDisconnectDevice(ifaceName)
        .then(result => this._handleRemoveConnectionProfile(ssid))
        .then(result => this._execConnectToAccessPoint(ifaceName, ssid, passphrase));
    }

    setConnectionUp(name) {
      return this._execSetConnectionState(name, ARGS.UP);
    }

    setConnectionDown(name) {
      return this._execSetConnectionState(name, ARGS.DOWN)
        .then(() => this._handleRemoveConnectionProfile(name));
    }

    disconnectDevice(device) {
      if (typeof device !== 'string') {
        return Promise.reject('disconnectDevice: device must be a string!');
      }
      return this._execDisconnectDevice(device);
    }

    getRadioState() {
      return Promise.resolve();
    }

    load(messageCenter) {
      debug('load');
      return Promise.resolve(messageCenter);
    }

    unload() {
      debug('unload');
      return Promise.resolve();
    }

  } // End Class

  module.exports = NmcliManager;
})();
