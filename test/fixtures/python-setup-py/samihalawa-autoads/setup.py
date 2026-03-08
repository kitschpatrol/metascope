from setuptools import setup, find_packages

setup(
    name="autoads",
    version="0.1.0",
    description="Automotive Advertising Campaign Generator",
    author="AUTOADS Team",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.8",
    install_requires=[
        "anthropic>=0.40.0",
        "pyyaml>=6.0.1",
        "pydantic>=2.0.0",
        "python-dotenv>=1.0.0",
        "rich>=13.0.0",
    ],
    entry_points={
        "console_scripts": [
            "autoads=autoads.cli:main",
        ],
    },
)
