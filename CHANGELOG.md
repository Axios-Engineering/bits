<a name="3.0.1"></a>
## 3.0.1 (2017-12-01)

---

<a name="3.0.0"></a>
# 3.0.0 (2017-11-11)


### Bug Fixes

* Adds in password for wifi connections   (08caa72)
* Autoconnect was not properly tracking   (43c5ea3)
* call get before running filter. Fixes stupid race condition where there is no properties on the   (ce1b561)
* delete was using the wrong call. now it is fixed   (d1a6067)
* do not load unsupported modules   (edd5c27), closes BITS-63
* fix device api to pass parameters to the manager   (ea1fe7f)
* fix item not found error   (51400d8)
* fix single dns not showing in ui, fix updating bridge interface name not changing value   (ce1fdb1), closes AIST-35 AIST-37
* fixed duplicate device issues   (4738006), closes AIST-24 AIST-25
* fixed typo in api class   (967347a)
* Fixes autoconnect on bridge and wifi connections   (3cafcd3)
* Fixes check on item id that will be falsey when the id is zero   (d5aceab)
* Fixes ipv4 method setter based on wifi type   (a2f45e9)
* Fixes issue where itemId of zero was not allowing for detail page to be displayed.   (0dcd33f)
* Items with id of zero would trigger a create rather than update   (8955412)
* only add devices that are not corrupt   (f796e95)
* Parse autoconnect priority to a number   (2d42f98)
* Password management has been fixed for different scenarios around client/hotspot connection set   (8000012), closes AIST-36
* Priority input error message   (89abeec), closes AIST-28
* Priority range allows for default -999 to 999   (2d0d270)
* Remove DNS/Gateway on shared connections   (6428c19)
* Removes global install of bower in README   (af6caaf)
* **fix updates not propogating forward:** propogates all updates forward and saves the secrets updat   (a36a37c), closes aist-24 aist-25 aist-29 aist-21
* Removes toggle state from connection when response is rejected   (f0d3309)
* Sorts lists by connection id   (68fb367), closes AIST-32
* Subnet prefix input was overwriting a behavior method, blocking validation   (c863941)
* With an itemId already set, the sub-navigation now goes to the list page when the already selec   (c254c0a)


### Features

* ability to manage and unmanage devices   (ca207ea)
* Defaults SSID to the BITS ID   (3362b29)
* end points hooked up for the manage and unmanage switch   (8017ea9)
* show password for wifi in connection   (cda69d6)
* ssids can be saved   (500531d)
* support updating connections   (1d9eef3)
* Switched to D-Bus binding instead of nmcli   (d73d437), closes AIST-7 AIST-8 AIST-17 AIST-20
* Switched to D-Bus binding instead of nmcli   (e0f47dc), closes AIST-7 AIST-8 AIST-17 AIST-20


### Reverts

* **npm:** Revert removing bower from dependencies - adds it to dev dependencies   (cad0dff)


### BREAKING CHANGES

* API and dependency has changed.
* API and dependency has changed.

---

<a name="2.14.1"></a>
# 2.10.0 (2017-10-04)

Initial Commit
