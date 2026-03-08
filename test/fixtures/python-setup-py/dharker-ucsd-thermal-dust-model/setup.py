#!/usr/bin/env python3
from glob import glob
from setuptools import setup, find_packages

if __name__ == "__main__":
    setup(name='dust',
          version='dev',
          description='Hanner-Harker thermal emission model and spectral fitting',
          author="David E. Harker, Michael S. P. Kelley",
          url="https://github.com/dharker-ucsd/thermal-dust-model/",
          packages=find_packages(),
          scripts=glob('scripts/*.py'),
          requires=['numpy', 'scipy', 'astropy', 'matplotlib'],
    )
