import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="GradeStar",
    version="0.0.1",
    author="Patrick Wells",
    author_email="pwells@ucdavis.edu",
    description="Tools for better grade management with Canvas",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/PatrickRWells/GradeStar",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.9',
)
