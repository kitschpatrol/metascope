from setuptools import find_packages
from setuptools import setup

setup(
    name='my_blog',
    version='0.1.0',
    # The purpose of the packages keyword to the setup() function is
    # to tell setuptools what directories of Python code in your
    # repository are to be included when distributing & installing
    # your project
    packages=find_packages(),
    #  To include other files, such as the static and templates
    #  directories, include_package_data is set. Python needs another
    #  file named MANIFEST.in to tell what this other data is.
    include_package_data=True,
    # NOTE: wheel does not support files in MANIFEST.in
    # https://packaging.python.org/guides/distributing-packages-using-setuptools/#package-data
    # NOTE: package_data must be a dictionary mapping package names
    #       to lists of wildcard patterns
    # NOTE: use of wildcards
    package_data={'my_blog': ['schema.sql',
                              'templates/*',
                              'templates/*/*',
                              'static/*',
                              ]},
    zip_safe=False,
    install_requires=[
        'flask',
        'pytest'
    ],
)