#!/usr/bin/env python
"""Setup script with variables and dynamic values."""

import os
from setuptools import setup

VERSION = '2.0.0'
AUTHOR = 'Dynamic Author'

with open('README.md', 'r') as f:
    long_description = f.read()

setup(
    name='dynamic-pkg',
    version=VERSION,
    description='Package with variables',
    long_description=long_description,
    author=AUTHOR,
    author_email='dynamic@example.com',
    url='https://github.com/example/dynamic-pkg',
    license='BSD-3-Clause',
    install_requires=[
        'numpy>=1.20',
        'pandas',
    ],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Programming Language :: Python :: 3',
    ],
)
