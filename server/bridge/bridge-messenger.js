(() => {
  'use strict';

  const CrudMessenger = global.helper.CrudMessenger;

  class BridgeMessenger extends CrudMessenger {
    static get TAG() {
      return 'networking#Bridges';
    }

    static get READ_SCOPES() {
      return ['networking'];
    }

    static get WRITE_SCOPES() {
      return ['networking'];
    }

    constructor(manager) {
      super(BridgeMessenger.TAG, manager, {readScopes: BridgeMessenger.READ_SCOPES, writeScopes: BridgeMessenger.WRITE_SCOPES});
    }

    _create() {
      return Promise.reject(new Error('not implemented'));
    }

  } // End Class

  module.exports = BridgeMessenger;
})();
