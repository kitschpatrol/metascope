# Author: Daisuke Komura <kdais-prm@m.u-tokyo.ac.jp>
# Copyright (c) 2022 Daisuke Komura
# License: BSD 3 clause

from setuptools import setup
import histo_patch

DESCRIPTION = "histopatch: image patch extraction from Whole Slide Images"
NAME = 'histo-patch'
AUTHOR = 'Daisuke Komura'
AUTHOR_EMAIL = 'kdais-prm@m.u-tokyo.ac.jp'
URL = 'https://github.com/dakomura/histo_patch'
LICENSE = 'BSD 3-Clause'
DOWNLOAD_URL = 'https://github.com/dakomura/histo_patch'
VERSION = histo_patch.__version__
PYTHON_REQUIRES = ">=3.6"

INSTALL_REQUIRES = [
    'tifffile >=2022.5.4',
    'numpy >=1.20.3',
    'tripy >=1.0.0',
    'pyclipper >=1.3.0',
    'opencv-python >= 4.6.0',
    'zarr >=2.11.3',
    'imagecodecs >=2022.2.22',
    'click >=8.1.3',
    'Pillow >=9.0.0',
]

PACKAGES = [
    'histo_patch'
]

CLASSIFIERS = [
    'Intended Audience :: Science/Research',
    'License :: OSI Approved :: BSD License',
    'Programming Language :: Python :: 3',
    'Programming Language :: Python :: 3.6',
    'Programming Language :: Python :: 3.7',
    'Programming Language :: Python :: 3.8',
    'Programming Language :: Python :: 3.9',
    'Programming Language :: Python :: 3 :: Only',
    'Topic :: Scientific/Engineering',
    'Topic :: Scientific/Engineering :: Visualization',
    'Topic :: Scientific/Engineering :: Artificial Intelligence',
    'Topic :: Multimedia :: Graphics',
]

with open('README.rst', 'r', encoding='utf-8') as fp:
    long_description = fp.read()

setup(name=NAME,
      author=AUTHOR,
      author_email=AUTHOR_EMAIL,
      maintainer=AUTHOR,
      maintainer_email=AUTHOR_EMAIL,
      description=DESCRIPTION,
      long_description=long_description,
      license=LICENSE,
      url=URL,
      version=VERSION,
      download_url=DOWNLOAD_URL,
      python_requires=PYTHON_REQUIRES,
      install_requires=INSTALL_REQUIRES,
      packages=PACKAGES,
      classifiers=CLASSIFIERS,
      entry_points={
          "console_scripts":[
              "histopatch=histo_patch.histo_patch:main",
          ]
      },
    )
