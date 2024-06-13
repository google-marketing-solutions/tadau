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

"""Unit tests for measurement_protocol.py."""

import requests_mock

from py import measurement_protocol
from google3.pyglib import resources
from absl.testing import absltest


class MeasurementProtocolTest(absltest.TestCase):

  def setUp(self):
    """Returns a Tadau instance.

    Returns:

    measurement_protocol.Tadau
    """
    super().setUp()
    self.tadau = measurement_protocol.Tadau(
        api_secret='1232', measurement_id='G-1223214', opt_in=True
    )

  def test_event_name_validation(self):
    with requests_mock.Mocker() as m:
      m.post(requests_mock.ANY, status_code=204)

      self.tadau.send_events([{
          'client_id': '123',
          'name': 'event name 1',
          'value': '42',
          'important_event': 'False',
          'user_id': '11',
      }])

      self.assertEqual(
          m.last_request.json()['events'][0]['name'], 'eventname1'
      )

  def test_fail_safe_with_required_params(self):
    with requests_mock.Mocker() as m:
      m.post(requests_mock.ANY, status_code=204)

      self.tadau.send_events([
          {
              'client_id': '123',
              'name': 'event_name',
              'value': '42',
              'important_event': 'False',
              'user_id': '11',
          },
          {
              'name': 'event_name',
              'successful': '42',
              'important_event': 'False',
          },
      ])

      self.assertEqual(m.call_count, 2)

  def test_successful_triggered_events(self):
    with requests_mock.Mocker() as m:
      m.post(requests_mock.ANY, status_code=204)

      self.tadau.send_events([
          {
              'client_id': '123',
              'name': 'event_name',
              'value': '42',
              'important_event': 'False',
              'user_id': '11',
          },
          {
              'client_id': '4321',
              'name': 'event_name',
              'value': '42',
              'important_event': 'False',
          },
      ])

      self.assertEqual(m.call_count, 2)
      self.assertNotIn('user_id', m.last_request.json().keys())

  def test_incorrect_load(self):
    with self.assertRaises(AssertionError):
      measurement_protocol.Tadau(opt_in=True)

  def test_load_config_file(self):
    config_file = resources.GetResourceFilename(
        'google3/corp/gtech/ads/infrastructure/tadau/py/config_test.yaml'
    )
    tadau = measurement_protocol.Tadau(
        config_file_location=config_file
    )

    self.assertEqual(tadau.api_secret, '1232')
    self.assertEqual(tadau.measurement_id, 'G-1223214')
    self.assertEqual(tadau.opt_in, True)
    self.assertEqual(
        tadau.fixed_dimensions.get('deploy_id'),
        'bdb40a38-f845-4c04-abdc-1a51528d45e2',
    )

  def test_fixed_dimensions(self):

    tadau_with_fixed_dimensions = measurement_protocol.Tadau(
        api_secret='1232',
        measurement_id='G-1223214',
        opt_in=True,
        fixed_dimensions={'deploy_id': '123456asc'},
    )
    with requests_mock.Mocker() as m:
      m.post(requests_mock.ANY, status_code=204)

      tadau_with_fixed_dimensions.send_events([
          {
              'client_id': '123',
              'name': 'event name 1',
              'value': '42',
              'important_event': 'False',
              'user_id': '11',
          },
          {
              'client_id': '4321',
              'name': 'event name 2',
              'value': '42',
              'important_event': 'False',
          },
      ])

      request_history = m.request_history

      self.assertEqual(
          request_history[0].json()['events'][0]['params']['deploy_id'],
          '123456asc',
      )

      self.assertEqual(
          request_history[1].json()['events'][0]['params']['deploy_id'],
          '123456asc',
      )

  def test_ads_event(self):
    with requests_mock.Mocker() as m:
      m.post(requests_mock.ANY, status_code=204)

      self.tadau.send_ads_event(
          'audience-created',
          'data integration',
          'GAds',
          '123456789',
          'audienceList',
          '9812176317',
      )

      self.assertEqual(m.last_request.json()['events'][0]['name'], 'ads-event')
      self.assertEqual(
          m.last_request.json()['events'][0]['params'][
              'event_is_impact_action'
          ],
          True,
      )

  def test_custom_event(self):
    with requests_mock.Mocker() as m:
      m.post(requests_mock.ANY, status_code=204)

      self.tadau.send_custom_event('leads-generated', False, '')

      self.assertEqual(
          m.last_request.json()['events'][0]['name'], 'custom-event'
      )

  def test_error_event(self):
    with requests_mock.Mocker() as m:
      m.post(requests_mock.ANY, status_code=204)

      self.tadau.send_error_event(
          'conversion action not found', '404', '', 'conversionUploader.py'
      )

      self.assertEqual(
          m.last_request.json()['events'][0]['name'], 'error-event'
      )

  def test_not_opted_in_load(self):

    with self.assertRaises(AssertionError):
      tadau = measurement_protocol.Tadau()

      with requests_mock.Mocker() as m:
        m.post(requests_mock.ANY, status_code=204)

        tadau.send_ads_event(
            'audience-created',
            'data integration',
            'GAds',
            '123456789',
            'audienceList',
            '9812176317',
        )

      self.assertEqual(m.call_count, 0)

if __name__ == '__main__':
  absltest.main()
