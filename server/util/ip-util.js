(function() {
  'use strict';

  const DEBUG_TAG = 'NETWORK_MGR:UTIL:IP';
  const debug = require('debug')(DEBUG_TAG);

  const ip = require('ip');

  class IpUtil {
    constructor() {
      throw new Error('Do not create an instance of IpUilt!');
    }

    static isValidIpV4Address(address) {
      return ip.isV4Format(address);
    }

    static isValidCidr(address) {
      return ip.cidr(address);
    }

    static getBaseIp(address) {
      return ip.cidrSubnet(address).firstAddress;
    }

    static areAddressEqual(address1, address2) {
      return ip.isEqual(ip.cidrSubnet(address1).firstAddress, address2);
    }

    /**
     * Converts a decimal number into a binary representation of the bitmask
     * @param {string} cidr - string or integer representing the CIDR block to conver
     * @return {string} - a binary dotted octet string of the format 1111.11111.1111.0000
     */
    static convertCIDRtoBinary(cidr) {
      debug('convertCIDRtoBinary', cidr);
      if (cidr === undefined || cidr === null) {
        throw new TypeError('CIDR cannot be null');
      }

      let cidrNumber = parseInt(cidr, 10);

      // TODO eventually catch other format issues such as hex or strings that are decimal style
      if (isNaN(cidrNumber)) {
        throw new TypeError('CIDR must be an integer');
      }

      let binary = [];
      for (let i = 0; i < 32; i++) {
        // Insert the decimal every 8 bits
        if (i > 1 && i % 8 === 0) {
          binary.push('.');
        }

        if (i < cidrNumber) {
          binary.push("1");
        } else {
          binary.push("0");
        }
      }
      return binary.join('');
    }

    /**
     * Converts a binary dotted octet string to a dotted decimal IP address/netmask
     * @param {string} binary - a string of the format 1111.1111.1111.0000
     * @return {string} - decimal conversion of the binary string
     */
    static convertBinaryToDecimal(binary) {
      if (typeof binary !== 'string') {
        throw new TypeError('binary must be a string');
      }

      // String must be four octets of binary digits
      // '11111111.11111111.11111111.00000000'
      // TODO later we should just parse either an int or string with or without the decimals
      if (binary.lastIndexOf('.') !== 26) {
        throw new TypeError('binary must be a string of binary octets');
      }

      let binaryOctets = binary.split(new RegExp(/\./), 4);
      return binaryOctets.reduce((decimalAddress, octet) => {
        return decimalAddress + '.' + parseInt(octet, 2);
      }, parseInt(binaryOctets[0], 2));
    }

    /**
     * Converts a CIDR notation into the corresponding dotted decimal IP address
     * @param {string} cidr - string or integer for the CIDR subnet mask
     * @return {string} - the dotted decimal representation of the CIDR netmask
     */
    static convertCIDRtoDecimal(cidr) {
      debug('convertCIDRtoDecimal', cidr);
      return IpUtil.convertBinaryToDecimal(IpUtil.convertCIDRtoBinary(cidr));
    }

    /**
     * Split a CIDR notated address string into an array of strings containing the IP and CIDR
     * @param {string} addressString - the CIDR notated IP address
     * @return {*|Array} - of strings with the first index being address and second the CIDR
     */
    static splitCIDRfromAddress(addressString) {
      return addressString.split(new RegExp(/\//));
    }

    /**
     * Return a object with the address, dotted decimal subnet, and cidr from a CIDR notated IP address
     * @param {string} addressString - the CIDR notated address to decompose
     * @return {{address: *, cidr: *, subnet: *}} - an object with keys for each decomposed component
     */
    static decomposeSlashNotationAddress(addressString) {
      const valueArray = IpUtil.splitCIDRfromAddress(addressString);
      return {
        address: valueArray[0],
        cidr: valueArray[1],
        subnet: ip.cidrSubnet(addressString).subnetMask
      };
    }

    static convertDecimalAddressToBinary(address) {
      return (address >>> 0).toString(2).split('.').join('');
    }

    static composeSlashNotationAddress(address, subnet) {
      let netmask = ip.subnet(address, subnet);
      return address + '/' + netmask.subnetMaskLength;
    }

  }// End Class

  module.exports = IpUtil;
})();
