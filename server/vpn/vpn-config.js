(() => {
  'use strict';

  class VpnConfig {

    constructor(path, name) {
      this._path = path;
      this._name = 'Unknown';

      if (!path) {
        throw new Error('Vpn Config must have a path ... bad developer');
      }

      if (name) {
        this._name = name;
      }
    }

    getFilepath() {
      return this._path;
    }

    getName() {
      return this._name;
    }
  }

  module.exports = VpnConfig;
})();
