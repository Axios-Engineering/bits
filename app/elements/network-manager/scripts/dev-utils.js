(() => {
  'use strict';

  var Bits = window.Bits = window.Bits || {};

  if(!Bits.hasOwnProperty('utils')) {
    Bits.utils = {};
  }

  Bits.utils.getDebugger = function(TAG) {
    const dbg = require('debug')(TAG);
    return dbg;
  };

})();