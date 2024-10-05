from setuptools import setup, find_packages

setup(
    name='MennekesSmartCharge',
    version='0.1.0',
    packages=find_packages(),
    entry_points={
        'console_scripts': [
            'mennekes-smart-charge=mennekes_smart_charge.main:main'
        ]
    },
    install_requires=[
        'fastapi[standard]',
        'minimalmodbus',
    ],
)