"""Setup script."""

try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

try:
    import verysimplestats
    version = verysimplestats.__version__
except ImportError:
    version = 'Undefined'


classifiers = ['Development Status :: 5 - Production/Stable',
               'Environment :: Console',
               'Intended Audience :: Developers',
               'Intended Audience :: Science/Research',
               'License :: OSI Approved :: MIT License',
               'Operating System :: OS Independent',
               'Programming Language :: Python',
               'Topic :: Scientific/Engineering']

packages = ['verysimplestats']
requires = []

setup(name='verysimplestats',
      version=version,
      author='PierreSelim',
      author_email='ps.huard@gmail.com',
      url='http://github.com/PierreSelim/verysimplestats',
      description='Statistics for humans',
      long_description="""Statistics for humans
=====================

Provides mean, median, variance, standard deviation, correlation,
linear regression in simple python.""",
      license='MIT',
      packages=packages,
      install_requires=requires,
      classifiers=classifiers)
