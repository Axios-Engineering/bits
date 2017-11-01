(function() {
  'use strict';

  /**
   * Represents a Wifi scan result as provided by nmcli (Network Manager Cli)
   */
  class WifiScanResult {

    /**
     * Create a new instance of a WifiScanResult
     * @param {string} radio - the linux network device that provided this scan result
     * @param {string} ssid - the SSID of the detected AP
     * @param {number} signal - the signal strength indicated by nmcli (a percent of maximum - not dbm)
     * @param {string} freq - the operating frequency of the AP
     * @param {number} chan - the operating channel of the AP
     * @param {string} bssid - the BSSID aka MAC address of the AP
     * @param {string} security - the wifi security protocol used by this AP
     * @param {string} manufacturer - the manufacturer of this AP
     * @param {string} dateTime - the ISO date string when this scan was performed
     */
    constructor(radio, ssid, signal, freq, chan, bssid, security, manufacturer, dateTime) {
      this.radio = radio;
      this.ssid = ssid;
      this.signal = signal;
      this.freq = freq;
      this.chan = chan;
      this.bssid = bssid;
      this.security = security;
      this.manufacturer = manufacturer || null;
      this.time = dateTime || new Date().toISOString();
    }

    setManufacturer(mfgString) {
      this.manufacturer = mfgString;
    }

  }// End Class

  module.exports = WifiScanResult;
})();
