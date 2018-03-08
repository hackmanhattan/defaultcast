"""
Run DashCast semi-persistently on a Chromecast while allowing other
Chromecast apps to work also by only launching when idle.

Based on https://github.com/madmod/dashcast-docker
"""

import time
import os
import logging

from daemonize import Daemonize

import pychromecast
import pychromecast.controllers.dashcast as dashcast

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
logger.propagate = False
keep_fds = []

DASHBOARD_URL = os.getenv('DASHBOARD_URL', 'https://home-assistant.io')
DISPLAY_NAME = os.getenv('DISPLAY_NAME')
IGNORE_CEC = os.getenv('IGNORE_CEC') == 'True'
DEBUG_FILE = os.getenv('DEBUG_FILE')

if DEBUG_FILE:
    fh = logging.FileHandler(DEBUG_FILE, "w")
    fh.setLevel(logging.DEBUG)
    logger.addHandler(fh)
    keep_fds.append(fh.stream.fileno())


class DashboardLauncher():
    def __init__(self, device, dashboard_url='https://home-assistant.io', dashboard_app_name='DashCast'):
        self.device = device
        logger.debug('DashboardLauncher ' + self.device.name)

        self.controller = dashcast.DashCastController()
        self.device.register_handler(self.controller)

        receiver_controller = device.socket_client.receiver_controller
        receiver_controller.register_status_listener(self)

        self.dashboard_url = dashboard_url
        self.dashboard_app_name = dashboard_app_name

        self.launch_checked = 0

    def check(self):
        """ Called when a new cast status has been received."""
        self.launch_checked += 1
        logger.debug('Checking if we should launch. (i: {})'
                     .format(self.launch_checked))
        if self.device.status is not None:
            logger.debug('Current app: {}'
                         .format(repr(self.device.status.display_name)))

        if self.should_launch():
            logger.debug('I think we should launch. If this is the case in 15 seconds as well, we will launch.')
            time.sleep(15)

        # Launch also when we've been going for 12 hours continously and it's
        # 3am (no matter if a different app is active or it's our cast)
        if self.should_launch():
            self.launch_dashboard()

        time.sleep(15)

    def should_launch(self):
        """ If the device is active, the dashboard is not already active, and no other app is active."""
        return ((self.device.status is not None and
                 self.device.status.display_name in ('Backdrop',)) or
                (self.launch_checked > 2880 and
                 time.localtime().tm_hour == 3 and
                 self.device.status is not None and
                 self.device.status.display_name in ('DashCast',)))

    def launch_dashboard(self):
        logger.debug('Launching dashboard on Chromecast ' + self.device.name)
        try:
            self.controller.load_url(self.dashboard_url)
            self.launch_checked = 0
        except Exception as e:
            logger.debug(e)
            pass


def main():
    logger.debug('Hello defaultcast')

    if IGNORE_CEC:
        logger.debug('Ignoring CEC for Chromecast ' + DISPLAY_NAME)
        pychromecast.IGNORE_CEC.append(DISPLAY_NAME)

    casts = []
    attempt = 0

    while attempt < 5 and len(casts) == 0:
        logger.debug('Searching for Chromecasts...')
        casts = pychromecast.get_chromecasts()

        if len(casts) == 0 and attempt == 4:
            logger.debug('No Devices Found')
            exit()

        if len(casts) == 0:
            attempt += 1
            time.sleep(30)

    cast = next(cc for cc in casts if DISPLAY_NAME in (None, '') or cc.device.friendly_name == DISPLAY_NAME)

    if not cast:
        logger.debug('Chromecast with name ' + DISPLAY_NAME + ' not found')
        exit()

    defaultcast = DashboardLauncher(cast, dashboard_url=DASHBOARD_URL)

    try:
        while True:
            defaultcast.check()
    except Exception as e:
        logger.debug(e)
        exit()


# We'll let systemd handle pid
daemon = Daemonize(app="defaultdash", pid="/dev/null", action=main, keep_fds=keep_fds)
daemon.start()
