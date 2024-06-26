/**
 * @license
 * Copyright 2024 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {setUpAppsScriptSimulator} from 'google3/javascript/apps/maestro/simulator/closure_apps_script_simulator-closurized';
import 'jasmine';
import {Tadau} from './measurement_protocol';

describe('Tadau', () => {
  let tadau: Tadau;
  let urlFetchAppSpy: jasmine.Spy;

  beforeEach(() => {
    setUpAppsScriptSimulator();
    tadau = new Tadau({
      apiSecret: 'test_api_secret',
      measurementId: 'test_measurement_id',
      optIn: true,
    });
    spyOn(Utilities, 'getUuid').and.returnValue('test_client_id');
    urlFetchAppSpy = spyOn(UrlFetchApp, 'fetch').and.returnValue(
      createFakeResponse(200),
    );
  });
  function createFakeResponse(
    responseCode: number,
  ): GoogleAppsScript.URL_Fetch.HTTPResponse {
    return {
      getResponseCode: () => responseCode,
    } as GoogleAppsScript.URL_Fetch.HTTPResponse;
  }

  it('should be instantiated', () => {
    expect(tadau).toBeDefined();
  });

  it('should send events', () => {
    const events = [
      {
        'name': 'test-event',
        'test_param': 'test_value',
      },
    ];

    tadau.sendEvents(events);

    expect(urlFetchAppSpy).toHaveBeenCalledWith(
      'https://www.google-analytics.com/mp/collect?api_secret=test_api_secret&measurement_id=test_measurement_id',
      {
        method: 'post',
        payload: JSON.stringify({
          'non_personalized_ads': true,
          'client_id': 'test_client_id',
          'events': [
            {
              'name': 'test-event',
              'params': {
                'test_param': 'test_value',
              },
            },
          ],
        }),
      },
    );
  });

  it('should send ads event', () => {
    tadau.sendAdsEvent(
      'test_action',
      'test_context',
      'test_platform',
      'test_platform_id',
      'test_resource',
      'test_resource_id',
    );

    expect(urlFetchAppSpy).toHaveBeenCalledWith(
      'https://www.google-analytics.com/mp/collect?api_secret=test_api_secret&measurement_id=test_measurement_id',
      {
        method: 'post',
        payload: JSON.stringify({
          'non_personalized_ads': true,
          'client_id': 'test_client_id',
          'events': [
            {
              'name': 'ads-event',
              'params': {
                'event_is_impact_action': true,
                'event_action': 'test_action',
                'event_context': 'test_context',
                'ads_platform': 'test_platform',
                'ads_platform_id': 'test_platform_id',
                'ads_resource': 'test_resource',
                'ads_resource_id': 'test_resource_id',
              },
            },
          ],
        }),
      },
    );
  });

  it('should send custom event', () => {
    tadau.sendCustomEvent('test_action', true, 'test_context');

    expect(urlFetchAppSpy).toHaveBeenCalledWith(
      'https://www.google-analytics.com/mp/collect?api_secret=test_api_secret&measurement_id=test_measurement_id',
      {
        method: 'post',
        payload: JSON.stringify({
          'non_personalized_ads': true,
          'client_id': 'test_client_id',
          'events': [
            {
              'name': 'custom-event',
              'params': {
                'event_action': 'test_action',
                'event_is_impact_action': true,
                'event_context': 'test_context',
              },
            },
          ],
        }),
      },
    );
  });

  it('should send error event', () => {
    tadau.sendErrorEvent(
      'test_error_message',
      'test_error_code',
      'test_error_location',
      'test_error_location_id',
    );

    expect(urlFetchAppSpy).toHaveBeenCalledWith(
      'https://www.google-analytics.com/mp/collect?api_secret=test_api_secret&measurement_id=test_measurement_id',
      {
        method: 'post',
        payload: JSON.stringify({
          'non_personalized_ads': true,
          'client_id': 'test_client_id',
          'events': [
            {
              'name': 'error-event',
              'params': {
                'error_message': 'test_error_message',
                'error_code': 'test_error_code',
                'error_location': 'test_error_location',
                'error_location_id': 'test_error_location_id',
              },
            },
          ],
        }),
      },
    );
  });

  it('should not send events when not opt-in.', () => {
    const events = [
      {
        'name': 'test-event',
        'test_param': 'test_value',
      },
    ];
    tadau = new Tadau({
      apiSecret: 'test_api_secret',
      measurementId: 'test_measurement_id',
      optIn: false,
    });
    tadau.sendEvents(events);

    expect(urlFetchAppSpy).not.toHaveBeenCalled();
  });

  it('should throw error if api secret or measurement id is invalid', () => {
    expect(() => {
      tadau = new Tadau({
        apiSecret: '',
        measurementId: 'test_measurement_id',
      });
    }).toThrowError(
      'Tadau: Class could not be initiated because api_secret and/or measurement_id is invalid',
    );

    expect(() => {
      tadau = new Tadau({
        apiSecret: 'test_api_secret',
        measurementId: '',
      });
    }).toThrowError(
      'Tadau: Class could not be initiated because api_secret and/or measurement_id is invalid',
    );
  });

  it('should not send events if events is empty', () => {
    tadau.sendEvents([]);

    expect(urlFetchAppSpy).not.toHaveBeenCalled();
  });

  it('should not send events if event is invalid', () => {
    tadau.sendEvents([
      {
        'app_instance_id': 'reserverd-key',
      },
    ]);

    expect(urlFetchAppSpy).not.toHaveBeenCalled();
  });

  it('should send events with fixed dimensions', () => {
    tadau = new Tadau({
      apiSecret: 'test_api_secret',
      measurementId: 'test_measurement_id',
      fixedDimensions: {
        'test_fixed_dimension': 'test_fixed_value',
      },
      optIn: true,
    });

    const events = [
      {
        'name': 'test-event',
        'test_param': 'test_value',
      },
    ];

    tadau.sendEvents(events);

    expect(urlFetchAppSpy).toHaveBeenCalledWith(
      'https://www.google-analytics.com/mp/collect?api_secret=test_api_secret&measurement_id=test_measurement_id',
      {
        method: 'post',
        payload: JSON.stringify({
          'non_personalized_ads': true,
          'client_id': 'test_client_id',
          'events': [
            {
              'name': 'test-event',
              'params': {
                'test_fixed_dimension': 'test_fixed_value',
                'test_param': 'test_value',
              },
            },
          ],
        }),
      },
    );
  });

  it('should send events with fixed dimensions from properties', () => {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperties({
      'apiSecret': 'test_api_secret',
      'measurementId': 'test_measurement_id',
      'deployId': 'fake_id',
      'deployInfra': 'fake_infra',
      'deployCreatedTime': 'fake_created_time',
      'deployUpdatedTime': 'fake_updated_time',
    });
    tadau = new Tadau({
      loadConfigFromScriptProperties: true,
      optIn: true,
    });

    const events = [
      {
        'name': 'test-event',
        'test_param': 'test_value',
      },
    ];

    tadau.sendEvents(events);

    expect(urlFetchAppSpy).toHaveBeenCalledWith(
      'https://www.google-analytics.com/mp/collect?api_secret=test_api_secret&measurement_id=test_measurement_id',
      {
        method: 'post',
        payload: JSON.stringify({
          'non_personalized_ads': true,
          'client_id': 'test_client_id',
          'events': [
            {
              'name': 'test-event',
              'params': {
                'deployId': 'fake_id',
                'deployInfra': 'fake_infra',
                'deployCreatedTime': 'fake_created_time',
                'deployUpdatedTime': 'fake_updated_time',
                'test_param': 'test_value',
              },
            },
          ],
        }),
      },
    );
  });
});
