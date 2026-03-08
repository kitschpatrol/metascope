from setuptools import setup, find_packages

setup(
    name="mltoolslib",
    version="0.2.2",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=[
        "scikit-learn>=1.0",
        "mlflow>=2.0",
        "pyspark>=3.3.0",
        "numpy>=1.21",
        "tensorflow>=2.12"
    ],
    python_requires=">=3.8",
)
