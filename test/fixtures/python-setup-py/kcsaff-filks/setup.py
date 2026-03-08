import os
from setuptools import setup, find_packages

version = '0.1.2'

def read(f):
    return open(os.path.join(os.path.dirname(__file__), f)).read().strip()

try:
   import pypandoc
   description = pypandoc.convert('README.md', 'rst')
except (IOError, ImportError):
   description = read('README.md')

setup(name='filks',
      version=version,
      description=('Generates filks based on a poem format and corpus'),
      long_description=description,
      classifiers=[
          'License :: OSI Approved :: MIT License',
          'Intended Audience :: Other Audience',
          'Programming Language :: Python :: 3'],
      author='K.C.Saff',
      author_email='kc@saff.net',
      url='https://github.com/kcsaff/filks',
      license='MIT',
      packages=find_packages(),
      install_requires=[
          'nltk', 'tweepy', 'inflect'
      ],
      entry_points={
          'console_scripts': ['filk = filks:main']
      },
      include_package_data = True,
      package_data={
          'filks.resources.formats': ['*'],
      },
)
