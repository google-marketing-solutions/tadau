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
 *   loadConfigFromScriptProperties: true,
 *   optIn: true,
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
 *     'name': 'ads-event',
 *     'event_is_impact_action': true,
 *     'event_action': 'click',
 *     'event_context': 'my-campaign',
 *     'ads_platform': 'google-ads',
 *     'ads_platform_id': '123456789',
 *     'ads_resource': 'ad',
 *     'ads_resource_id': '123456789',
 *   },
 *   {
 *     'name': 'custom-event',
 *     'event_action': 'click',
 *     'event_is_impact_action': true,
 *     'event_context': 'my-campaign',
 *   },
 *   {
 *     'name': 'error-event',
 *     'error_message': 'error-message',
 *     'error_code': '404',
 *     'error_location': 'my-campaign',
 *     'error_location_id': '123456789',
 *   },
 * ]);
 */

const GA_COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
const GA_RESERVED_KEYS = ['app_instance_id', 'uuid', 'timestamp_micros'];

/**
 * Checks if a parameter is valid.
 * @param key The parameter key.
 * @param value The parameter value.
 * @param reservedKeys The list of reserved keys.
 * @return True if the parameter is valid.
 */
function isValidParam(
  key: string,
  value: string | number | boolean,
  reservedKeys: string[],
): boolean {
  return !reservedKeys.includes(key) && value !== null && value !== undefined;
}

/**
 * Formats a string to alphanumeric.
 * @param text The text to format.
 * @return The formatted text.
 */
function formatToAlphanumeric(text: string): string {
  return text.replace(/[^a-zA-Z0-9-]/g, ''); // Use regex replacement directly
}

/**
 * Tadau configuration.
 */
interface TadauConfig {
  apiSecret?: string;
  measurementId?: string;
  fixedDimensions?: {[key: string]: string | number | boolean};
}

/**
 * Tadau parameters.
 */
interface TadauParams {
  apiSecret?: string;
  measurementId?: string;
  fixedDimensions?: {[key: string]: string | number | boolean};
  loadConfigFromScriptProperties?: boolean;
  optIn?: boolean;
}

/**
 * This class is used to send events to Google Analytics 4 using Measurement
 * Protocol.
 */
export class Tadau {
  /**
   * @param apiUrl The API URL.
   * @param reservedKeys The reserved keys.
   * @param apiSecret The API secret.
   * @param measurementId The measurement ID.
   * @param fixedDimensions The fixed dimensions.
   * @param optIn The opt-in.
   * @param targetUrl The target URL.
   */
  private readonly apiUrl = GA_COLLECT_URL;
  private readonly reservedKeys = GA_RESERVED_KEYS;
  private readonly targetUrl?: string;

  apiSecret?: string;
  measurementId?: string;
  fixedDimensions?: {[key: string]: string | number | boolean};
  optIn?: boolean;

  constructor(params: TadauParams) {
    const {
      apiSecret,
      measurementId,
      fixedDimensions,
      loadConfigFromScriptProperties,
      optIn,
    } = params;

    if (loadConfigFromScriptProperties) {
      const config = this.loadConfigFromScriptProperties();
      this.apiSecret = config?.apiSecret || apiSecret;
      this.measurementId = config?.measurementId || measurementId;
      this.fixedDimensions = config?.fixedDimensions || fixedDimensions || {};
    } else {
      this.apiSecret = apiSecret;
      this.measurementId = measurementId;
      this.fixedDimensions = fixedDimensions || {};
    }

    if (this.apiSecret && this.measurementId) {
      this.targetUrl = `${this.apiUrl}?api_secret=${this.apiSecret}&measurement_id=${this.measurementId}`;
    }

    this.optIn = optIn || false;

    if (!this.isValidInstance()) {
      throw new Error(
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
  private loadConfigFromScriptProperties(): TadauConfig | void {
    try {
      console.info('Tadau: Loading config from script properties.');
      const scriptProperties = PropertiesService.getScriptProperties();
      const scriptPropertiesConfig = scriptProperties.getProperties();

      const config: TadauConfig = {};
      const fixedDimensions: {[key: string]: string | number | boolean} = {};

      for (const [k, v] of Object.entries(scriptPropertiesConfig)) {
        if (k === 'apiSecret') {
          config.apiSecret = v;
        } else if (k === 'measurementId') {
          config.measurementId = v;
        } else {
          fixedDimensions[k] = v;
        }
      }
      config.fixedDimensions = fixedDimensions;
      return config;
    } catch (error) {
      console.error('Tadau: Error loading configuration:', error);
    }
  }

  /**
   * Sends events to Google Analytics 4.
   * @param events The events to send.
   */
  sendEvents(events: Array<{[key: string]: string | number | boolean}>): void {
    if (!events || events.length === 0) {
      console.debug('Tadau: events empty.');
      return;
    }
    if (!this.optIn) {
      console.debug('Tadau: Opt-in is false.');
      return;
    }

    for (const row of events) {
      try {
        const clientId = row['client_id'] || Utilities.getUuid();
        const payload: {[key: string]: string | number | boolean | object} = {
          'non_personalized_ads': true,
          'client_id': clientId,
        };

        const eventReservedKeys = [...this.reservedKeys, 'name'];
        const params = {...this.fixedDimensions};
        for (const [k, v] of Object.entries(row)) {
          if (isValidParam(k, v, eventReservedKeys)) {
            params[k] = v;
          } else {
            console.warn(`Tadau: Parameter ${k} with value ${v} is not valid`);
          }
        }

        payload['events'] = [
          {
            'name': formatToAlphanumeric(row['name'] as string),
            params,
          },
        ];

        const userId = row['user_id'];
        if (userId) {
          payload['user_id'] = userId;
        }

        const response = UrlFetchApp.fetch(this.targetUrl!, {
          method: 'post',
          payload: JSON.stringify(payload),
        });
        if (response.getResponseCode() !== 204) {
          throw new Error(`Error sending event: ${response.getContentText()}`);
        }

        console.info('Tadau: Successfully sent event:', payload);
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
  sendAdsEvent(
    eventAction: string,
    eventContext: string,
    adsPlatform: string,
    adsPlatformId: string,
    adsResource: string,
    adsResourceId: string,
  ): void {
    this.sendEvents([
      {
        'name': 'ads-event',
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
  sendCustomEvent(
    eventAction: string,
    eventIsImpactAction: boolean,
    eventContext: string,
  ): void {
    this.sendEvents([
      {
        'name': 'custom-event',
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
  sendErrorEvent(
    errorMessage: string,
    errorCode: string,
    errorLocation: string,
    errorLocationId: string,
  ): void {
    this.sendEvents([
      {
        'name': 'error-event',
        'error_message': errorMessage,
        'error_code': errorCode,
        'error_location': errorLocation,
        'error_location_id': errorLocationId,
      },
    ]);
  }
}
