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

"""Implementation of Tadau in Python."""

from collections.abc import Mapping
import json
import re
from typing import Any, Dict, Sequence, Union, Optional
import uuid

from absl import logging
import requests
import yaml


_GA_COLLECT_URL = 'https://www.google-analytics.com/mp/collect'
_GA_REQUEST_KEYS = [
    'name',
    'client_id',
    'user_id'
]
_GA_RESERVERD_KEYS = [
        'api_secret',
        'measurement_id',
        'app_instance_id',
        'uuid',
        'timestamp_micros'
    ]


def _is_valid_param(key: str, value: Any, reserved_keys: Sequence[str]) -> bool:
  """Validates a parameter.

  Args:
    key: The key of the param.
    value: The value of the param.
    reserved_keys: A list of reserved keys.

  Returns:
    True if the param is valid, False otherwise.
  """
  return key not in reserved_keys and value is not None and value


def _format_to_alphanumeric(text: str) -> str:
  """Removes non-alphanumeric characters from a string.

  Args:
    text: The text to be filtered.

  Returns:
    The filtered text.
  """
  return re.sub(r'[^a-zA-Z0-9-]', '', text)


class Tadau:
  """Google Analytics measurement protocol wrapper.

  Allows sending custom event hits to Google Analytics. Either use params to
  pass required attributes such as api_secret and measurement_id, or inform
  a config file location to a yaml file with them (config_file_location)

  Example usage 1:
    tadau = Tadau(api_secret=my_api_secret, measurement_id=my_measurement_id,
    opt_in=os.environ.get('TADAU_OPT_IN', 'false'))
    tadau.send_events(events)

  Example usage 2:
    tadau = Tadau(config_file_location="my_solution/config.yaml")
    tadau.send_events(events)

  Example usage with fixed dimensions:
    tadau = Tadau(
        api_secret=my_api_secret,
        measurement_id=my_measurement_id,
        opt_in=True,
        fixed_dimensions={'deploy_id': '123456asc'}
    )
    tadau.send_events(events)

  Attributes:
    api_secret: The API secret of the chosen GA property.
    measurement_id: The measurement ID of the chosen GA property.
    opt_in: Whether to opt in or not.
    fixed_dimensions: Fixed dimensions to be sent with every single event
      fired.
  """

  def __init__(
      self,
      *,
      api_secret: Optional[str] = None,
      measurement_id: Optional[str] = None,
      opt_in: Optional[bool] = False,
      fixed_dimensions: Optional[dict[str, Union[str, int, float]]] = None,
      config_file_location: Optional[str] = None,
  ):
    """Initializes the Tadau client class.

    Args:
      api_secret: The API secret of the chosen GA property.
      measurement_id: The measurement ID of the chosen GA property.
      opt_in: Whether to opt in or not.
      fixed_dimensions: Fixed dimensions to be sent with every single event
      fired.
      config_file_location: Local filesystem path to a .yaml file containing
        the desired configuration.
    """
    self._api_url = _GA_COLLECT_URL
    self._reserved_keys = _GA_RESERVERD_KEYS
    self._request_keys = _GA_REQUEST_KEYS

    # Checks if there is a configuration file to load.
    if config_file_location:
      config = self._load_config_from_yaml_file(config_file_location)
      if config:
        api_secret = config.get('api_secret')
        measurement_id = config.get('measurement_id')
        opt_in = self._is_opt_in(config.get('opt_in', 'false'))
        fixed_dimensions = config.get('fixed_dimensions')

    self.api_secret = api_secret
    self.measurement_id = measurement_id
    self.opt_in = opt_in
    self._target_url = (
        f'{self._api_url}?api_secret={self.api_secret}&'
        f'measurement_id={self.measurement_id}'
    )
    # These parameters will be sent with every single event sent.
    self.fixed_dimensions = fixed_dimensions or dict()

    # Validates if opted in and used correctly.
    if __debug__:
      if not self.opt_in:
        raise AssertionError('Tadau: Class initiated not opted in')
      elif not self._is_valid_instance():
        raise AssertionError(
            'Tadau: Class could not be initiated because api_secret and/or'
            f' measurement_id is invalid ({self.api_secret},'
            f' {self.measurement_id})'
        )

  def _is_opt_in(self, opt_in: str) -> bool:
    """Checks whether Tadau is opt in or not based on the opt_in value.

    Args:
      opt_in: The opt in value.

    Returns:
      True or false
    """
    return opt_in.lower().strip() == 'true'

  def _is_valid_instance(self) -> bool:
    """Checks whether Tadau is being initiated with all required parameters.

    Returns:
      True or false
    """
    # Checks whether or not Tadau is being initiatiated with all required
    # parameters.
    if not self.api_secret or not self.measurement_id:
      logging.exception(
          'Tadau: Class could not be initiated because api_secret and/or'
          ' measurement_id is invalid (%s, %s)',
          self.api_secret,
          self.measurement_id,
      )
      return False
    return True

  def _load_config_from_yaml_file(
      self, config_file_location: str = ''
  ) -> Optional[Mapping[str, Any]]:
    """Loads configuration from a .yaml file.

    Retrieves information such as api_secret, measurement_id and
    fixed_dimensions from a yaml file

    Args:
      config_file_location: Local filesystem path to a .yaml file containing the
        desired configuration.

    Returns:
      The mapping for the configuration parameters
    """
    try:
      with open(config_file_location, 'r') as f:
        loaded_config = yaml.safe_load(f.read())
        return loaded_config
    except FileNotFoundError as err:
      logging.exception(
          'Tadau: Configuration file not found: %s', err
      )
    except yaml.YAMLError as err:
      logging.exception(
          'Tadau: Error loading configuration from yaml file: %s', err
      )

  def send_events(
      self, events: Sequence[dict[str, Union[str, int, float]]]
  ) -> None:
    """Sends events to GA4 property.

    Args:
      events: a list of objects containing at least name and client id keys
    """
    if not self.opt_in:
      return
    elif not self._is_valid_instance():
      return
    elif not events:
      # Returning to avoid sending empty hits (e.g. only a client id).
      logging.debug('Tadau: events empty.')
      return
    for row in events:
      try:
        if not row.get('name'):
          logging.warning('Tadau: Event name cannot be empty.')
          continue

        # Uses given client_id or generates a random one.
        client_id = row.get('client_id') or str(uuid.uuid4())

        # Sets client_id with an empty payload.
        payload: Dict[str, Any] = {
            'non_personalized_ads': True,
            'client_id': f'{client_id}',
        }

        event_reserved_keys = self._reserved_keys + self._request_keys
        # Starts with fixed_dimensions and merges with incoming event
        # parameters.
        params = self.fixed_dimensions
        for k, v in row.items():
          # Only adds params that aren't reserved keywords.
          if _is_valid_param(k, v, event_reserved_keys):
            params[k] = v
          elif k not in self._request_keys:
            logging.warning(
                'Tadau: Parameter %s with value %s is not valid', k, v
            )

        payload['events'] = [{
            'name': _format_to_alphanumeric(row['name']),
            'params': params,
        }]

        # Sets user_id in the payload if provided.
        user_id = row.get('user_id')
        if user_id:
          payload['user_id'] = f'{user_id}'

        # Makes a request to the GA4 Measurement Protocol collect endpoint.
        requests.post(
            url=self._target_url,
            data=json.dumps(payload),
        )
        logging.info(
            'Tadau: Successfully sent event: %s',
            payload,
        )
      except Exception:
        logging.exception('Tadau: Error sending event to GA4 property: %s', row)

  def send_ads_event(
      self,
      event_action: str,
      event_context: str,
      ads_platform: str,
      ads_platform_id: str,
      ads_resource: str,
      ads_resource_id: str,
  ) -> None:
    """Sends an ads event to GA4 property.

    Args:
      event_action: The event action.
      event_context: The event context.
      ads_platform: The ads platform (E.g. GAds, GA, CM, DV).
      ads_platform_id: The ads platform id (E.g. account_identifier, cid).
      ads_resource: The ads resource (E.g. conversionAction).
      ads_resource_id: The ads resource id (E.g. conversionAction id).
    """

    self.send_events(
        [{
            'name': 'ads-event',
            'event_is_impact_action': True,
            'event_action': event_action,
            'event_context': event_context,
            'ads_platform': ads_platform,
            'ads_platform_id': ads_platform_id,
            'ads_resource': ads_resource,
            'ads_resource_id': ads_resource_id,
        }],
    )

  def send_custom_event(
      self,
      event_action: str,
      event_is_impact_action: bool,
      event_context: str,
  ) -> None:
    """Sends a custom event to GA4 property.

    Args:
      event_action: The event action.
      event_is_impact_action: The event is impact action.
      event_context: The event context.
    """

    self.send_events(
        [{
            'name': 'custom-event',
            'event_action': event_action,
            'event_is_impact_action': event_is_impact_action,
            'event_context': event_context,
        }],
    )

  def send_error_event(
      self,
      error_message: str,
      error_code: str,
      error_location: str,
      error_location_id: str
  ) -> None:
    """Sends an error event to GA4 property.

    Args:
      error_message: The error message.
      error_code: The error code.
      error_location: The error location.
      error_location_id: The error location id.

    """

    self.send_events(
        [{
            'name': 'error-event',
            'error_message': error_message,
            'error_code': error_code,
            'error_location': error_location,
            'error_location_id': error_location_id,
        }],
    )
