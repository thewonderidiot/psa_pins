#!/usr/bin/env python

from distutils.core import setup

setup(
    name='psa_pins',
    version='1.0',
    description='PSA Backplane Pin Tool',
    author='Mike Stewart',
    author_email='mastewar1@gmail.com',
    url='',
    packages=['psa_pins'],
    include_package_data=True,
    zip_safe=False,
    install_requires=['Flask'],
)
