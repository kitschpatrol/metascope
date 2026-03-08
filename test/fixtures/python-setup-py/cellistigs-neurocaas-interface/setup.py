#!/usr/bin/env python
# Install script for the neurocaas interface tools

# neurocaas_interface 
# Copyright (C) 2020 Joao Couto - jpcouto@gmail.com
#
#  This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from setuptools import setup
from setuptools.command.install import install
import os
from os.path import join as pjoin

longdescription = '''Tools to submit jobs and upload files to the NeuroCAAS platform.'''
setup(
    name = 'neurocaas_interface',
    version = '0.1',
    author = 'Joao Couto',
    author_email = 'jpcouto@gmail.com',
    description = (longdescription),
    long_description = longdescription,
    license = 'GPL',
    packages = ['neurocaas_interface'],
    entry_points = {
        'console_scripts': [
            'neurocaas = neurocaas_interface.cli:main',
        ]
    }
)
