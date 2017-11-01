(() => {
  'use strict';

  const SocketClient = global.clients.SocketClient;
  const CLIENT_PROPERTY_KEY = 'networkmanager#vpnConfigClient';

  const VPN_CONFIGS = CLIENT_PROPERTY_KEY + 'vpn-configs';
  const VPN_CONFIG_ADDED = 'vpn-config-added';
  var VPN_COMMAND = CLIENT_PROPERTY_KEY + 'vpn-command';
  const VPN_REQUEST = CLIENT_PROPERTY_KEY + 'vpn-request';

  const VPN_STATUS = 'vpn-status-changed';
  const SOCKET_STATUS = CLIENT_PROPERTY_KEY + VPN_STATUS;

  class VpnControlClient extends SocketClient {

    constructor(client, options) {
      super(client, options);

      this._vpnManager = options.vpnManager;

      this.addRequestListener(VPN_CONFIGS, this._getVpnConfigs.bind(this));
      this.addRequestListener(VPN_COMMAND, this._vpnCommand.bind(this));
      this.addRequestListener(VPN_REQUEST, this._vpnGetStatus.bind(this));
      this.addListener(VPN_CONFIG_ADDED, this._vpnAdded.bind(this), this._vpnManager);
      this.addListener(VPN_STATUS, this._vpnStatusChanged.bind(this), this._vpnManager);
    }

    static load(base, manager) {
      const options = {
        vpnManager: manager
      };
      return SocketClient.load(base, CLIENT_PROPERTY_KEY, VpnControlClient, options);
    }

    static unload(base) {
      return SocketClient.unload(base, CLIENT_PROPERTY_KEY);
    }

    _vpnStatusChanged(status) {
      return this.emit(SOCKET_STATUS, status);
    }

    _vpnGetStatus() {
      return Promise.resolve(this._vpnManager.isRunning());
    }

    _vpnCommand() {
      return this._vpnManager.toggleVpn();
    }

    _getVpnConfigs() {
      return this._vpnManager.getVpnNames();
    }

    _vpnAdded(vpns) {
      this.emit(CLIENT_PROPERTY_KEY + VPN_CONFIG_ADDED, vpns);
    }
  }

  module.exports = VpnControlClient;
})();
