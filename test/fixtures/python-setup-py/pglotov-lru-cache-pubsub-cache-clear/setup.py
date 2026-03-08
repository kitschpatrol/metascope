import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="lru-cache-pubsub-cache-clear",
    version="0.0.8",
    author="Petr Glotov",
    author_email="pglotov@yahoo.com",
    description="redis based cache_clear() for lru_cache",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/pglotov/lru_cache_pubsub_cache_clear",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
