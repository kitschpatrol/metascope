from setuptools import setup, find_packages

setup(
    name='example-package',
    version='1.2.3',
    description='A short description of the package',
    long_description=open('README.md').read(),
    author='Jane Smith',
    author_email='jane@example.com',
    maintainer='Bob Jones',
    maintainer_email='bob@example.com',
    url='https://example.com/example-package',
    download_url='https://example.com/example-package/releases',
    license='MIT',
    keywords=['example', 'test', 'metadata'],
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Programming Language :: Python :: 3',
        'Operating System :: OS Independent',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Intended Audience :: Developers',
    ],
    packages=find_packages(),
    install_requires=[
        'requests>=2.25.0',
        'click>=7.0',
        'pyyaml',
    ],
    python_requires='>=3.8',
    extras_require={
        'dev': ['pytest>=6.0', 'black', 'mypy'],
        'docs': ['sphinx', 'sphinx-rtd-theme'],
    },
    project_urls={
        'Repository': 'https://github.com/example/example-package',
        'Bug Tracker': 'https://github.com/example/example-package/issues',
    },
)
