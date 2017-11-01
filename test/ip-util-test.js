(() => {
  'use strict';

  const chai = require('chai');
  const expect = chai.expect;

  const IpUtil = require('../server/util/ip-util');

  describe('IpUtil', () => {
    describe('convertCIDRtoBinary', function() {
      it('should return a string with three octets of 1s and the last octet of 0s when given CIDR of 24', function() {
        const expectedResult = '11111111.11111111.11111111.00000000';
        return expect(IpUtil.convertCIDRtoBinary(24)).to.equal(expectedResult);
      });
      it('should throw an error when passed undefined', function() {
        return expect(function() {
          return IpUtil.convertCIDRtoBinary(undefined);
        }).to.throw(TypeError);
      });
      it('should throw an error when passed null', function() {
        return expect(function() {
          return IpUtil.convertCIDRtoBinary(null);
        }).to.throw(TypeError);
      });
    });

    describe('convertBinaryToDecimal', function() {
      it('should return 255.255.255.0 when passed 11111111.11111111.11111111.00000000', function() {
        const binary = '11111111.11111111.11111111.00000000';
        const expectedResult = '255.255.255.255.0';
        return expect(IpUtil.convertBinaryToDecimal(binary)).to.equal(expectedResult);
      });
      it('should throw an error when passed an integer', function() {
        const binary = 11111111111111111111111100000000;
        return expect(function() {
          return IpUtil.convertBinaryToDecimal(binary);
        }).to.throw(TypeError);
      });
      it('should throw an error when passed a string that does not contain dots', function() {
        const binary = 'this is not valid';
        return expect(function() {
          return IpUtil.convertBinaryToDecimal(binary);
        }).to.throw(TypeError);
      });
      it('should throw an error when passed a string that does not have dots after every group of four integers', function() {
        const binary = 'this. is. not. valid';
        return expect(function() {
          return IpUtil.convertBinaryToDecimal(binary);
        }).to.throw(TypeError);
      });
    });

    describe('convertCIDRtoDecimal', function() {
      it('should return 255.255.255.0 for a CIDR of 24', function() {
        const expectedResult = '255.255.255.255.0';
        return expect(IpUtil.convertCIDRtoDecimal(24)).to.equal(expectedResult);
      });
    });

    describe('splitCIDRfromAddress', function() {
      it('should return an array with an ip string and the CIDR value when given 10.10.10.10/24', function() {
        const address = '10.10.10.10/24';
        const expectedResult = ['10.10.10.10', '24'];
        return expect(IpUtil.splitCIDRfromAddress(address)).to.deep.equal(expectedResult);
      });
    });

    describe('decomposeSlashNotationAddress', function() {
      it('should return an object with ip, cidr, and subnet when given 10.10.10.10/24', function() {
        const address = '10.10.10.10/24';
        const expectedResult = {
          address: '10.10.10.10',
          cidr: '24',
          subnet: '255.255.255.0'
        };
        return expect(IpUtil.decomposeSlashNotationAddress(address)).to.deep.equal(expectedResult);
      });
    });

    describe('composeSlashNotationAddress', function() {
      it('should convert and address and subnet into a slash-dot notation address', function() {
        const address = '10.10.10.10';
        const subnet = '255.255.255.0';
        const expectedResult = '10.10.10.10/24';
        return expect(IpUtil.composeSlashNotationAddress(address, subnet)).to.equal(expectedResult);
      });
    });
  });// End Tests
})();
