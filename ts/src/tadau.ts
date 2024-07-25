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
 * @fileoverview Tadau is a library to send events to Google Analytics 4
 * events using Measurement Protocol.
 *
 * Expected usage:
 *
 * // Using API secret and measurement ID.
 * const tadau = new Tadau({
 *   apiSecret: 'my-secret',
 *   measurementId: 'G-123456789',
 *   fixedDimensions: {
 *     'dimension1': 'value1',
 *     'dimension2': 'value2',
 *   },
 *   optIn: true,
 * });
 *
 * // Using script parameters.
 * const tadau = new Tadau({
 *   loadConfigFromFile: true,
 * });
 *
 * // Using dedicated methods.
 * tadau.sendAdsEvent(
 *   'click', 'my-campaign', 'google-ads', '123456789', 'ad', '123456789'
 * );
 * tadau.sendCustomEvent('click', true, 'my-campaign');
 * tadau.sendErrorEvent('error-message', '404', 'my-campaign', '123456789');
 *
 * // Using events array.
 * tadau.sendEvents([
 *   {
 *     'name': 'ads_event',
 *     'event_is_impact_action': true,
 *     'event_action': 'click',
 *     'event_context': 'my-campaign',
 *     'ads_platform': 'google-ads',
 *     'ads_platform_id': '123456789',
 *     'ads_resource': 'ad',
 *     'ads_resource_id': '123456789',
 *   },
 *   {
 *     'name': 'custom_event',
 *     'event_action': 'click',
 *     'event_is_impact_action': true,
 *     'event_context': 'my-campaign',
 *   },
 *   {
 *     'name': 'error_event',
 *     'error_message': 'error-message',
 *     'error_code': '404',
 *     'error_location': 'my-campaign',
 *     'error_location_id': '123456789',
 *   },
 * ]);
 */

import * as crypto from 'crypto';
import * as fs from 'fs'; // from //third_party/javascript/typings/node
import * as yaml from 'js-yaml'; // from //third_party/javascript/typings/js_yaml
import fetch from 'node-fetch'; // from //third_party/javascript/typings/node_fetch

/**
 * This is used to mock the fetch function in tests.
 */
export const TEST_ONLY = {fetch};

/**
 * Checks if a parameter is valid.
 * @param key The parameter key.
 * @param value The parameter value.
 * @param reservedKeys The list of reserved keys.
 * @return True if the parameter is valid.
 */
function isValidParam(
  key: string,
  value: string | number | boolean | null | undefined,
  reservedKeys: string[],
): boolean {
  return (
    reservedKeys.indexOf(key) === -1 &&
    value !== null &&
    value !== undefined &&
    value !== ''
  );
}

/**
 * Formats a string to alphanumeric.
 * @param text The text to format.
 * @return The formatted text.
 */
function formatToAlphanumeric(text: string): string {
  return text.replace(/[^a-zA-Z0-9_]/g, ''); // Use regex replacement directly
}

/**
 * Tadau configuration.
 */
interface TadauConfig {
  apiSecret?: string;
  measurementId?: string;
  optIn?: boolean;
  fixedDimensions?: {[key: string]: string | number | boolean};
}

/**
 * Tadau parameters.
 */
interface TadauParams {
  apiSecret?: string;
  measurementId?: string;
  fixedDimensions?: {[key: string]: string | number | boolean};
  configFilePath?: string;
  optIn?: boolean;
}

/**
 * This class is used to send events to Google Analytics 4 using Measurement
 * Protocol.
 */
export class Tadau {
  /**
   * @param apiSecret The API secret.
   * @param measurementId The measurement ID.
   * @param fixedDimensions The fixed dimensions.
   * @param optIn The opt-in.
   * @param targetUrl The target URL.
   */

  /**
   * The API Url.
   */
  private static readonly GA_COLLECT_URL =
    'https://www.google-analytics.com/mp/collect';

  /**
   * The GA reserved keys.
   */
  private static readonly GA_RESERVED_KEYS = [
    'app_instance_id',
    'uuid',
    'timestamp_micros',
  ];
  private readonly targetUrl?: string;

  apiSecret?: string;
  measurementId?: string;
  fixedDimensions?: {[key: string]: string | number | boolean};
  optIn?: boolean;

  constructor(params: TadauParams) {
    const {apiSecret, measurementId, fixedDimensions, configFilePath, optIn} =
      params;
    if (configFilePath) {
      const config = this.loadConfigFromFile(configFilePath);
      this.apiSecret = config?.apiSecret || apiSecret;
      this.measurementId = config?.measurementId || measurementId;
      this.fixedDimensions = config?.fixedDimensions || fixedDimensions || {};
    } else {
      this.apiSecret = apiSecret;
      this.measurementId = measurementId;
      this.fixedDimensions = fixedDimensions || {};
    }

    if (this.apiSecret && this.measurementId) {
      this.targetUrl = `${Tadau.GA_COLLECT_URL}?api_secret=${this.apiSecret}&measurement_id=${this.measurementId}`;
    }

    this.optIn = Boolean(optIn);

    if (!this.isValidInstance()) {
      throw new EvalError(
        'Tadau: Class could not be initiated because api_secret and/or measurement_id is invalid',
      );
    }
  }

  /**
   * Checks if the instance is valid.
   * @return True if the instance is valid.
   */
  private isValidInstance(): boolean {
    return !!this.apiSecret && !!this.measurementId;
  }

  /**
   * Loads the configuration from script properties.
   * @return The configuration.
   */
  private loadConfigFromFile(configFilePath: string): TadauConfig | null {
    try {
      const fileContent = fs.readFileSync(configFilePath, 'utf8');
      const loadedConfig = yaml.safeLoad(fileContent) as TadauConfig;
      return loadedConfig;
    } catch (error) {
      console.error(
        'Tadau: Error loading configuration from YAML file:',
        error,
      );
      return null; // Indicate failure to load configuration
    }
  }

  /**
   * Sends events to Google Analytics 4.
   *
   * This method will pass even on failed requests to the GA4 collect endpoint,
   * but will log the error in the console.
   * @param events The events to send.
   */
  async sendEvents(
    events: Array<{[key: string]: string | number | boolean}>,
  ): Promise<void> {
    if (!events || events.length === 0) {
      console.debug('Tadau: events empty.');
      return;
    }
    if (!this.optIn) {
      console.debug('Tadau: Opt-in is false.');
      return;
    }

    for (const row of events) {
      const clientId = row['client_id'] || crypto.randomUUID();
      const eventName = row['name'] || null;
      const payload: {[key: string]: string | number | boolean | object} = {
        'non_personalized_ads': true,
        'client_id': clientId,
      };

      const eventReservedKeys = [...Tadau.GA_RESERVED_KEYS];
      const params = {...this.fixedDimensions};
      for (const key in row) {
        if (key === 'name') {
          continue;
        } else if (
          row.hasOwnProperty(key) &&
          isValidParam(key, row[key], eventReservedKeys)
        ) {
          params[key] = row[key];
        } else {
          console.warn(
            `Tadau: Parameter ${key} with value ${row[key]} is not valid`,
          );
        }
      }

      const userId = row['user_id'];
      if (userId) {
        payload['user_id'] = userId;
      }
      try {
        if (!eventName) {
          throw new Error('Tadau: Event must have a name');
        }
        payload['events'] = [
          {
            'name': formatToAlphanumeric(row['name'] as string),
            params,
          },
        ];
        await TEST_ONLY.fetch(this.targetUrl!, {
          method: 'POST',
          body: JSON.stringify(payload),
        }).then((response) => {
          if (response.status !== 204) {
            throw new Error(`Error sending event: ${response.statusText}`);
          }
          console.info('Tadau: Successfully sent event:', payload);
        });
      } catch (error) {
        console.error(`Tadau: Error sending event to GA4 property: ${error}`);
      }
    }
  }

  /**
   * Sends an Ads event to Google Analytics 4.
   * @param eventAction The event action.
   * @param eventContext The event context.
   * @param adsPlatform The Ads platform.
   * @param adsPlatformId The Ads platform ID.
   * @param adsResource The Ads resource.
   * @param adsResourceId The Ads resource ID.
   */
  async sendAdsEvent(
    eventAction: string,
    eventContext: string,
    adsPlatform: string,
    adsPlatformId: string,
    adsResource: string,
    adsResourceId: string,
  ): Promise<void> {
    await this.sendEvents([
      {
        'name': 'ads_event',
        'event_is_impact_action': true,
        'event_action': eventAction,
        'event_context': eventContext,
        'ads_platform': adsPlatform,
        'ads_platform_id': adsPlatformId,
        'ads_resource': adsResource,
        'ads_resource_id': adsResourceId,
      },
    ]);
  }

  /**
   * Sends a custom event to Google Analytics 4.
   * @param eventAction The event action.
   * @param eventIsImpactAction The event is impact action.
   * @param eventContext The event context.
   */
  async sendCustomEvent(
    eventAction: string,
    eventIsImpactAction: boolean,
    eventContext: string,
  ): Promise<void> {
    await this.sendEvents([
      {
        'name': 'custom_event',
        'event_action': eventAction,
        'event_is_impact_action': eventIsImpactAction,
        'event_context': eventContext,
      },
    ]);
  }

  /**
   * Sends an error event to Google Analytics 4.
   * @param errorMessage The error message.
   * @param errorCode The error code.
   * @param errorLocation The error location.
   * @param errorLocationId The error location ID.
   */
  async sendErrorEvent(
    errorMessage: string,
    errorCode: string,
    errorLocation: string,
    errorLocationId: string,
  ): Promise<void> {
    await this.sendEvents([
      {
        'name': 'error_event',
        'error_message': errorMessage,
        'error_code': errorCode,
        'error_location': errorLocation,
        'error_location_id': errorLocationId,
      },
    ]);
  }
}
