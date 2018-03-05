# Network Manager

[![travis.ci](https://img.shields.io/travis/LGSInnovations/bits-network-manager.svg?style=flat-square)](https://travis-ci.org/LGSInnovations/bits-network-manager)

<!-- MarkdownTOC autolink="true" bracket="round" depth="2" indent="    " -->

- [Building the module](#building-the-module)

<!-- /MarkdownTOC -->

## Building the module

``` bash
sudo apt install network-manager libdbus-1-dev
systemctl start NetworkManager
systemctl enable NetworkManager
npm run build
```
