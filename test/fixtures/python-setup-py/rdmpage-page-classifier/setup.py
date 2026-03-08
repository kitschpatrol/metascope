"""Setup script for BHL Page Classifier package."""
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="bhl-page-classifier",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Vision Transformer-based page classifier for Biodiversity Heritage Library",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/page-classifier",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "bhl-train=train:main",
            "bhl-predict=predict:main",
            "bhl-evaluate=evaluate:main",
        ],
    },
)
