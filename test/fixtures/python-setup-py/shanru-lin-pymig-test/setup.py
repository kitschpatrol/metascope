from setuptools import setup, find_packages

setup(
    name="pymig-test-repo",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        # Include some Python 2 compatible dependencies
        "six",
        "future",
    ],
    python_requires='>=2.7',  # Indicate Python 2.7 compatibility
    tests_require=[
        "pytest",
    ],
)
