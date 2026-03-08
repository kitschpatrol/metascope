from setuptools import setup, find_packages, dist

from codecs import open
from os import path



setup(name = 'alexbio_pipeline',
      version = '0.0.1',
      description = 'Proteomics Pipeline',
      author = 'William Max Alexander (et al.)',
      author_email = 'max@alexander.bio',
      classifiers = ['Development Status :: 4 - Beta',
                     'Intended Audience :: Science/Research',
                     'Topic :: Scientific/Engineering :: Bio-Informatics',
                     'License :: OSI Approved :: GNU Lesser General Public License v2 or later (LGPLv2+)',
                     'Programming Language :: Python',
                     ],
      packages = find_packages(),
      include_package_data=True,
      )



        
