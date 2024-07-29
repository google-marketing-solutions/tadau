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

/**
 * @fileoverview Tests for tadau.
 */

import 'jasmine';
import {Response} from 'node-fetch'; // from //third_party/javascript/typings/node_fetch
import {join} from 'path';
// tslint:disable:ban-malformed-import-paths
import {Tadau, TEST_ONLY} from '../src/tadau.js';

const TEST_DATA_PATH = join(
  process.cwd(),
  'tests/test_data',
);

const TEST_RESPONSE_OBJ = {
  status: 204,
  statusText: 'OK',
  ok: true,
  headers: {'Content-Type': 'application/json'},
};

const TEST_COLLECT_URL =
  'https://www.google-analytics.com/mp/collect?api_secret=test_api_secret&measurement_id=test_measurement_id';

describe('Tadau', () => {
  let tadau: Tadau;
  let fetchMock: jasmine.Spy<typeof TEST_ONLY.fetch>;

  beforeEach(() => {
    // tslint:disable:ban-module-namespace-object-escape
    spyOn(TEST_ONLY, 'randomUUID').and.returnValue('000-000-000-000-000');
    const fetchResult = new Response(JSON.stringify(TEST_RESPONSE_OBJ));
    fetchMock = spyOn(TEST_ONLY, 'fetch').and.resolveTo(fetchResult);
    tadau = new Tadau({
      apiSecret: 'test_api_secret',
      measurementId: 'test_measurement_id',
      optIn: true,
    });
  });

  it('should be instantiated', () => {
    expect(tadau).toBeDefined();
  });

  it('should send events', async () => {
    const events = [
      {
        'name': 'test_event',
        'test_param': 'test_value',
      },
    ];
    const expectedbody = JSON.stringify({
      'non_personalized_ads': true,
      'client_id': '000-000-000-000-000',
      'events': [
        {
          'name': 'test_event',
          'params': {
            'test_param': 'test_value',
          },
        },
      ],
    });
    await tadau.sendEvents(events);
    expect(fetchMock).toHaveBeenCalledWith(TEST_COLLECT_URL, {
      method: 'POST',
      body: expectedbody,
    });
  });
  it('should send ads event', async () => {
    const expectedbody = JSON.stringify({
      'non_personalized_ads': true,
      'client_id': '000-000-000-000-000',
      'events': [
        {
          'name': 'ads_event',
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
    });
    await tadau.sendAdsEvent(
      'test_action',
      'test_context',
      'test_platform',
      'test_platform_id',
      'test_resource',
      'test_resource_id',
    );
    expect(fetchMock).toHaveBeenCalledWith(TEST_COLLECT_URL, {
      method: 'POST',
      body: expectedbody,
    });
  });

  it('should send custom event', async () => {
    const expectedbody = JSON.stringify({
      'non_personalized_ads': true,
      'client_id': '000-000-000-000-000',
      'events': [
        {
          'name': 'custom_event',
          'params': {
            'event_action': 'test_action',
            'event_is_impact_action': true,
            'event_context': 'test_context',
          },
        },
      ],
    });
    await tadau.sendCustomEvent('test_action', true, 'test_context');
    expect(fetchMock).toHaveBeenCalledWith(TEST_COLLECT_URL, {
      method: 'POST',
      body: expectedbody,
    });
  });

  it('should send error event', async () => {
    const expectedbody = JSON.stringify({
      'non_personalized_ads': true,
      'client_id': '000-000-000-000-000',
      'events': [
        {
          'name': 'error_event',
          'params': {
            'error_message': 'test_error_message',
            'error_code': 'test_error_code',
            'error_location': 'test_error_location',
            'error_location_id': 'test_error_location_id',
          },
        },
      ],
    });
    await tadau.sendErrorEvent(
      'test_error_message',
      'test_error_code',
      'test_error_location',
      'test_error_location_id',
    );
    expect(fetchMock).toHaveBeenCalledWith(TEST_COLLECT_URL, {
      method: 'POST',
      body: expectedbody,
    });
  });

  it('should not send events when not opt-in.', async () => {
    const events = [
      {
        'name': 'test_event',
        'test_param': 'test_value',
      },
    ];
    tadau = new Tadau({
      apiSecret: 'test_api_secret',
      measurementId: 'test_measurement_id',
      optIn: false,
    });
    await tadau.sendEvents(events);
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should not send events if event is invalid', () => {
    tadau.sendEvents([
      {
        'app_instance_id': 'reserverd-key',
      },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
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
        'name': 'test_event',
        'test_param': 'test_value',
      },
    ];
    const expectedbody = JSON.stringify({
      'non_personalized_ads': true,
      'client_id': '000-000-000-000-000',
      'events': [
        {
          'name': 'test_event',
          'params': {
            'test_fixed_dimension': 'test_fixed_value',
            'test_param': 'test_value',
          },
        },
      ],
    });
    tadau.sendEvents(events);
    expect(fetchMock).toHaveBeenCalledWith(TEST_COLLECT_URL, {
      method: 'POST',
      body: expectedbody,
    });
  });

  it('should load a valid YAML configuration', () => {
    tadau = new Tadau({
      configFilePath: join(TEST_DATA_PATH, 'config_test.yaml'),
    });
    expect(tadau.apiSecret).toEqual('1232');
  });
});
