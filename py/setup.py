# Copyright 2024 Google LLC.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Builds Tadau."""

import os
import setuptools
from version import __version__  # import within package to avoid build error

_README_PATH = os.path.join(
    os.path.dirname(__file__), 'README.md'
)

with open(_README_PATH, encoding='utf-8') as file:
  _LONG_DESCRIPTION = file.read()

setuptools.setup(
    name='tadau',
    version=__version__,
    description=(
        'Tadau: TrAck Downloads, Adoption and Usage of external solutions.'
    ),
    long_description=_LONG_DESCRIPTION,
    long_description_content_type='text/markdown',
    author='Google Inc.',
    author_email='gps-tadau+copybara@google.com',
    url='https://github.com/google-marketing-solutions/tadau',
    license='Apache 2.0',
    packages=['tadau'],  # The setup.py is in the same folder as the package.
    package_dir={
        'tadau': './',
    },
    include_package_data=True,
    scripts=[],
    install_requires=[
        'absl-py',
        'requests',
        'pyyaml',
    ],
    requires_python='>=3.9',
    extras_require={},
    entry_points={},
    classifiers=[
        'License :: OSI Approved :: Apache Software License',
    ],
    keywords='tadau track google marketing solutions',
)

