from setuptools import setup, find_packages

setup(
    name="pictollms",
    version="0.1.0", 
    description="MT for french pictogram-to-text generation",
    author="Robin Kokot",
    author_email="robin.edu.hr@gmail.com",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "torch>=2.0.0", 
        "torchvision>=0.15.0",
        "transformers>=4.35.0",
        "numpy>=1.22.0",
        "pandas>=1.4.0", 
        "requests>=2.25.0",
        "lmdb>=1.4.0",
        "tqdm>=4.60.0",
        "pillow>=8.3.0",
        "scikit-learn>=1.1.0",
        "matplotlib>=3.5.0",
        "sacrebleu>=2.3.0",
    ],
    python_requires=">=3.10.0,<3.13.0", 
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "jupyter",
            "seaborn>=0.11.0",
        ],
        "gpu": [
        ],
        "demo": [
            "gradio>=3.0.0",
            "fastapi>=0.88.0",
            "uvicorn>=0.20.0",
            "streamlit>=1.15.0",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Text Processing :: Linguistic",
    ],
)