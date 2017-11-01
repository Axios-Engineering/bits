Network Manager
================
About Network Manager:
-----------------------
This module allows configuration of the Bits system's ethernet and wifi networking. The module
uses Linux Network Manager, specifically the `nmcli` tool for wifi control and traditional 'ip tools'
and '/etc/network/interfaces' to manage ethernet.

# Development
## Adding node module
``` bash
# Production
node ./support/development/yarn-0.19.1.js add <node-pkg-name>
# Development
node ./support/development/yarn-0.19.1.js add --dev <node-pkg-name>
```

## Building the module
``` bash
npm run build
```

# Debugging
Both the nodejs and browser side code can be debugged independently. The debug logs are both
provided via the npm debug module and follow the same tag syntax.

## Server
To debug server code on your dev host perform the following:

1.  run bits-terminal
2.  kill the node process
3.  open a new terminal tab
4.  cd into FrontEnd
5.  `DEBUG=NETWORK_MGR:* npm run dev -- -- -v`

Notice the debug tag syntax where you can replace the wildcard `*` with any classe's tag name.

## Browser
To debug browser code we use the same debug module and the same tag syntax, however we need to use
browserify to bundle the npm debug module for the client. Once we have a bundle we can import it
as a script in our polymer element/behavior and use it. To create a bundle we will require a

1. `scripts` directory in our app/elements/<module-name>
2. A <my-script>.js file which defines require statements for the npm modules and any other supporting functions.

The bundle will be created from the `my-script.js` file and will include the contents of the `my-script.js` along
with the contents of all other node modules that were `required` in `my-script.js`.

*NOTE:* The bundle file will need to be regenerated each time you change the `my-script.js`

### The Browserify Bundle
To generate a bundle file that can be included in any html file, including polymer use:
```bash
browserify app/elements/network-manager/scripts/dev-utils.js -o app/elements/network-manager/scripts/bundle.js
```

Next we will need to include the bundle as a script in any polymer file that would like to use it.
*NOTE:* Make sure you include this script before any declaration of the polymer script otherwise the
functionality will not have been defined when you go to use it in polymer.
```html
<script src="/elements/network-manager/scripts/bundle.js"></script>
<script>

	const TAG = 'NETWORK_MGR:WIFI:CONFIG_APP';
	const debug = window.Bits.utils.getDebugger(TAG);

	<!-- polymer element or behavior here -->

	myPolymerElementFunction: function(somethingCool){
		debug('somethingCool');
	}
</script>
```

### Chrome Debugger Command
By default our debug messages will not print to the console. We need to enable this just like when we debug
from the command line.

1. Open the chrome console
2. `localStorage.debug = "MY_MODULE_TAG:*"`
3. Reload the page
4. Profit

# Ethernet Networking
For ethernet networking the system currently utilizes the traditional `/etc/network/interfaces` file to statically
define device configuration. However, starting with TNT, ethernet devices will be managed by the Linux `Network Manager`
utility. Changes to an interface can still be made with `/etc/network/interfaces` and that file will be read
by Network Manager when an 'ifup/down' is issued. This provides hot-plug support for re-acquiring DHCP leases when
connections have changed since `Network Manager` listens to Kernel events for when link-states change.

# Wifi Networking
For Wifi networking the system exclusively uses Linux `Network Manager`. Some useful commands

## Connect to a network (only open, wep, and wpa)
```bash
nmcli d wifi connect <ssid> password <password> [ifname <ifname]
```

## Connect to a network (advanced)
```bash
nmcli con add type wifi ifname <ifname> con-name <connection-title> ssid <your-ssid> mode infrastructure
nmcli con modify <connection-title> connection.autoconnect no 802-11-wireless-security.key-mgmt <security-type> 802-11-wireless-security.psk <your-password>
nmcli c up <connection-title>
```

## Scan (hidden and broadcast)
```bash
nmcli d wifi rescan ifname wlp2s0
nmcli -f all d wifi list ifname <ifname>
```

## Create a hotspot
```bash
nmcli connection add type wifi ifname <ifname> con-name hotspot-zoltar autoconnect no ssid zoltar
nmcli con modify hotspot 802-11-wireless.mode ap 802-11-wireless.band a 802-11-wireless.channel 48 ipv4.method shared
nmcli c modify hotspot 802-11-wireless-security.key-mgmt wpa-psk
nmcli c modify hotspot 802-11-wireless-security.psk "mmmountainBikes!"
```

Get some information about the hotspot:
NOTE: You can change the fields after the '-f'
Available fields can be determined by running nmcli connection editor in interactive mode or showing the
status of the existing hotspot connection. See below for examples.
```bash
nmcli -s -t -f 802-11-wireless.ssid,802-11-wireless-security.psk c show hotspot-wlp1s0
```

## Find a list of supported settings & properties
There are two ways to do this:

1. Existing connection - `nmcli c show <connection-name>`
2. No existing connection - `interactive mode`

### Interactive Mode
Use interactive mode to find a list of supported properties and more information than you will
receive on the internet.
```bash
nmcli connection edit con-name <name> type wifi
nmcli> describe <setting.prop>
nmcli> quit
```
