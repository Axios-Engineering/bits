(() => {
  'use strict';

  const CrudMessenger = global.helper.CrudMessenger;

  class EthernetMessenger extends CrudMessenger {
    static get TAG() {
      return 'networking#Ethernet';
    }

    static get READ_SCOPES() {
      return ['networking'];
    }

    static get WRITE_SCOPES() {
      return ['networking'];
    }

    constructor(manager) {
      super(EthernetMessenger.TAG, manager, {readScopes: EthernetMessenger.READ_SCOPES, writeScopes: EthernetMessenger.WRITE_SCOPES});
    }

    _create() {
      return Promise.reject(new Error('not implemented'));
    }

    _delete() {
      return Promise.reject(new Error('not implemented'));
    }

  } // End Class

  module.exports = EthernetMessenger;
})();
