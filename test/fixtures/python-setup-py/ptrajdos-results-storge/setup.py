from setuptools import setup, find_packages



setup(
        name='results-storage',
        version ='0.0.1',
        author='Pawel Trajdos',
        author_email='pawel.trajdos@pwr.edu.pl',
        url = 'https://github.com/ptrajdos/results_storge',
        description="Class for representing storage",
        packages=find_packages(include=[
                'results_storage',
                'results_storage.*',
                'results_storage_experimenst'
                'results_storage_experimenst.*'
                ]),
        install_requires=[ 
                'xarray',
        ],
        test_suite='test'
        )
