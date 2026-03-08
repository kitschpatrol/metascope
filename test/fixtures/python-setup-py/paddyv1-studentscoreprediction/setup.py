### creating ml project as a package
from setuptools import find_packages, setup
from typing import List




###function to return requirements for project
def getRequiremnts(filename:str)->List[str]:
    requiremnts= []
    with open(filename) as file_obj:
        requiremnts=file_obj.readlines()
        requiremnts = [req.replace("\n","")for req in requiremnts]

        if '-e .' in requiremnts:
            requiremnts.remove('-e .')
    return requiremnts


setup(
name='mlproject',
version='0.0.1',
author='Patrick',
packages=find_packages(),
install_requires=getRequiremnts('requirements.txt'),

   
)