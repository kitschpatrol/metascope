import nltk
import os
from setuptools import setup, find_packages

def setup_nltk():
    """Download required NLTK data"""
    nltk.download('punkt')
    nltk.download('wordnet')
    nltk.download('stopwords')
    
def create_directories():
    """Create required directories"""
    directories = ['output', 'models']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

def main():
    setup_nltk()
    create_directories()
    print("Setup completed successfully!")

if __name__ == "__main__":
    main()

setup(
    name="tweetfeel",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        'tweepy==4.12.1',
        'pandas==1.5.3',
        'nltk==3.8.1',
        'scikit-learn==1.2.2',
        'matplotlib==3.7.1',
        'seaborn==0.12.2',
        'textblob==0.17.1',
        'numpy==1.24.3',
        'scipy==1.10.1',
    ],
    author="Your Name",
    author_email="your.email@example.com",
    description="A sentiment analysis tool for social media",
    long_description=open('README.md').read(),
    long_description_content_type="text/markdown",
)