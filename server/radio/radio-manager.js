(() => {
  'use strict';

  const SettingsManager = global.helper.SettingsManager;
  const KEY_RADIO_ENABLED = 'radioenabled';
  const DEFAULT_RADIO_ENABLED = true;
  const UtilChildProcess = global.utils.UtilChildProcess;
  const logger = global.LoggerFactory.getLogger();
  const EventEmitter = require('events');

  class RadioManager extends EventEmitter {
    static get TAG() {
      return 'networkManager#Radio';
    }

    static get SCOPES() {
      return ['networking'];
    }

    constructor() {
      super();
      this._settings = new SettingsManager(RadioManager.TAG, {scopes: RadioManager.SCOPES});
      this._settings.on('set', this._onSet.bind(this));
    }

    _onSet(key, value) {
      if (key === KEY_RADIO_ENABLED) {
        if (value === true) {
          return this.enableRadio();
        } else {
          return this.disableRadio();
        }
      }
    }

    load(messageCenter) {
      return Promise.resolve()
      .then(() => this._settings.load(messageCenter))
      .then(() => this._settings.setDefault({key: KEY_RADIO_ENABLED, value: DEFAULT_RADIO_ENABLED}))
      .then(() => this._settings.get({key: KEY_RADIO_ENABLED}))
      .then(currentValue => {
        if (currentValue === true) {
          return this.enableRadio();
        } else {
          return this.disableRadio();
        }
      });
    }

    unload() {
      return Promise.resolve()
      .then(() => this._settings.unload());
    }

    enableRadio() {
      return UtilChildProcess.createSpawnPromise('nmcli', ['radio', 'wifi', 'on'])
      .then(() => {
        logger.debug('Successfully enabled wifi radio');
      })
      .catch(err => {
        logger.error('Error disabling Radio', err);
        return Promise.reject(err);
      });
    }

    disableRadio() {
      return UtilChildProcess.createSpawnPromise('nmcli', ['radio', 'wifi', 'off'])
      .then(() => {
        logger.debug('Successfully disabled wifi radio');
      })
      .catch(err => {
        logger.error('Error disabling Radio', err);
        return Promise.reject(err);
      });
    }
  }

  module.exports = RadioManager;
})();
