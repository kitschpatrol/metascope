from setuptools import setup, find_packages

setup(
    name="churn_deeplearning",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "pandas",
        "numpy",
        "tensorflow",
        "matplotlib",
        "jupyter",
        "notebook",
        "ipykernel",
        "scikit_learn",
        "seaborn",
        "preprocessing"  # ajoute d'autres si nécessaire
    ],
)
