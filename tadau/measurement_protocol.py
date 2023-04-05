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

import re
import json
import requests

from typing import Dict, Any, Sequence

class Tadau():
  def __init__(self, params: Dict[str, Any] = {}):
    self.__api_url = 'https://www.google-analytics.com/mp/collect'
    self.__reserved_keys = ['app_instance_id',
                          'client_id', 'uuid', 'user_id', 'timestamp_micros']

    # Uses custom values, or defaults to standard
    self.api_secret = params.get('api_secret') or 'shyN6ac9RuyxdgLQZRIvyg'
    self.measurement_id = params.get('measurement_id') or 'G-SWYK2BS415'

  @staticmethod
  def _validate_param(key: str, value: Any, reserved_keys: Sequence[str]) -> bool:
    return key not in reserved_keys and value is not None and value != ''

  @staticmethod
  def _filter_alphanumeric_only(text: str) -> str:
      return re.sub(r'[^a-zA-Z0-9-]', '', text)

  def process(self, events: Any):
    try:
      for row in events:
        client_id = row.get('client_id')

        # client_id is a required attribute. Therefore, skips if not set
        if not client_id:
          continue

        user_id = row.get('user_id')

        # Sets client_id with an empty payload
        payload: Dict[str, Any] = {
            'non_personalized_ads': True,
            'client_id': f"{client_id}",
        }

        # Only adds params that aren't reserved keywords
        event_reserved_keys = self.__reserved_keys + ['name']
        params = {k: v for k, v in row.items() if self._validate_param(k,
                                                                      v, event_reserved_keys)}
        payload['events'] = [
            {'name': self._filter_alphanumeric_only(row['name']), 'params': params}]

        # Sets user_id if any
        if user_id:
          payload['user_id'] = f"{user_id}"

        # Sends to GA4
        requests.post(
            f'{self.__api_url}?api_secret={self.api_secret}&measurement_id={self.measurement_id}', data=json.dumps(payload))
    except:
      pass
