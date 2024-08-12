# Tadau - Google Analytics 4 Measurement Protocol Wrapper

A library to send hits to measurement protocol.

## Installation

### Tadau module for NodeJS

```
npm install tadau
```

## Usage

```javascript
import { Tadau } from 'tadau';
const Tadau = new Tadau({
  apiSecret: 'YOUR_API_SECRET',
  measurementId: 'YOUR_MEASUREMENT_ID',
  fixedDimensions: {'deploy_id': 'foo', 'deploy_infra': 'bar', ...},
  optIn: true
  });

tadau.send_events(
    [
      {
        'name': 'test_event',
        'test_param': 'test_value',
      },
    ]
  );
```

Alternative instantiation using a config file.

```javascript
import { Tadau } from 'tadau';

const tadau = new Tadau ({
    configFilePath: 'path/to/config.yaml'
})

tadau.send_events(
    [
      {
        'name': 'test_event',
        'test_param': 'test_value',
      },
    ]
  );
```

## Config file format

```yaml
apiSecret: "1232"
measurementId: "G-1223214"
optIn: "true"

fixedDimensions:
    deployId: "bdb40a38-f845-4c04-abdc-1a51528d45e2"
    deployInfra: "GCP"
    deployCreated_time: "1713356634"
    deployUpdated_time: "1713356634"
    ...
```

Fixed dimensions will be attached to every event.

## API

### sendEvents (Array<{[key: string]: string | number | boolean}>)

Sends events to Google Analytics 4.

For details on building event object please see the
[Measurement Protocol Reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag).

NOTE: If no `client_id` is provided one will be automatically created.

NOTE: This method will pass even on failed requests to the GA4 collect endpoint,
but will log the error in the console.

NOTE: This method will pass even if `optIn` is set to `false` but no hit will be
sent.
