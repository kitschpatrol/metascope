#! /usr/bin/env python3
from setuptools import *

setup(name='bxt',
      description='Stuff I cannot find in aws-cli that boto3 can do.',
      url='http://github.com/jeromerobert/bxt',
      author='Jerome Robert',
      author_email='jeromerobert@gmx.com',
      py_modules=['bxt'],
      install_requires=['boto3'],
      scripts=['bin/bxt'])