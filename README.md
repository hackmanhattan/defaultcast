# defaultcast

In October of 2017, Hack Manhattan installed a TV by the workspace tables. To
make it easily accessible to everyone in the space, we added a Chromecast. To
make that more useful, we're casting a "default" dashboard now.

Based on [dashcast-docker](https://github.com/madmod/dashcast-docker)

Requires:

* [pychromecast](https://github.com/balloob/pychromecast) `876ed6c` and above
* daemonize
* systemd unless you want to write your own init scripts
