import pathlib
from setuptools import setup,find_packages

# The directory containing this file
HERE = pathlib.Path(__file__).parent

# The text of the README file
README = (HERE / "README.md").read_text()

# This call to setup() does all the work
setup(
    name="py-dbx",
    version="1.0.5",
    description="make jdbc calls in command line",
    long_description=README,
    long_description_content_type="text/markdown",
    url="https://github.com/laowangv5/py-dbx",
    author="Yonghang Wang",
    author_email="wyhang@gmail.com",
    license="Apache 2",
    classifiers=["License :: OSI Approved :: Apache Software License"],
    packages=find_packages(),
    include_package_data=True,
    install_requires=[ "psutil", "pyyaml","jaydebeapi","xtable"],
    keywords=[ "jdbc","dbx" ],
    entry_points={ "console_scripts": 
        [ 
            "dbx=dbx:dbx_main", 
        ] 
    },
)
