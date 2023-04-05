# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import pytest
import requests_mock

from tadau.measurement_protocol import Tadau

@pytest.fixture
def uploader():
    return Tadau()

def test_event_name_validation(uploader):
    with requests_mock.Mocker() as m:
        m.post(requests_mock.ANY, status_code=204)

        uploader.process([{
           'client_id': '123',
            'name': 'event name 1',
            'value': '42',
            'important_event': 'False',
            'user_id': '11'
        }])

        assert m.last_request.json()['events'][0]['name'] == 'eventname1'

def test_fail_safe_with_required_params(uploader):
    with requests_mock.Mocker() as m:
        m.post(requests_mock.ANY, status_code=204)

        uploader.process([{
            'client_id': '123',
            'name': 'event_name',
            'value': '42',
            'important_event': 'False',
            'user_id': '11'
        }, {
            'name': 'event_name',
            'value': '42',
            'important_event': 'False',
        }])

        assert m.call_count == 1

def test_succesful_triggered_events(uploader):
    with requests_mock.Mocker() as m:
        m.post(requests_mock.ANY, status_code=204)

        uploader.process([{
           'client_id': '123',
            'name': 'event_name',
            'value': '42',
            'important_event': 'False',
            'user_id': '11'
        }, {
            'client_id': '4321',
            'name': 'event_name',
            'value': '42',
            'important_event': 'False',
        }])

        assert m.call_count == 2
        assert 'user_id' not in m.last_request.json().keys()
