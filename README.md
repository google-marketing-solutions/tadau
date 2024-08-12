# Tadau

Tadau is an open-source library available in Python, NodeJS, and Apps Script
that simplifies sending tracking data to Google Analytics 4 (GA4) via the
Measurement Protocol.

Key Features

*   Seamless GA4 Integration: Easily send raw data directly to GA4 servers using
    HTTP requests.
*   Predefined and Custom Events: Track predefined events like downloads,
    errors, or define your own custom events.
*   Flexible Configuration: Configure Tadau using a YAML file or directly within
    your code.
*   Cross-Platform Support: Works with Python, NodeJS, and Apps Script projects.

## Installation

Python:

```sh
pip install tadau
```

NodeJS:

```sh
npm install tadau
```

Apps Script:

Import the
[library](https://script.google.com/corp/u/0/home/projects/1g-iLsgplKCPDMGJ7opNjG978hEwNYkE_z9wwzcO7TMqoSTkvuuvcvVmi)
in your Apps Script Project. Give the library a name: e.g. `TadauLib`.

> IMPORTANT: If using Apps Script the end user running the code needs to be a
> member of the
> [Tadau Users Google Group](https://groups.google.com/g/tadau-users/).

## Basic Usage

Tadau can be instantiated by passing parameters directly or by using a
configuration YAML file. For the latter see the Configuration section for
details.

Python (example):

```py
import tadau
tadau = tadau.Tadau(config_file_location='path/to/config.yaml')

tadau.send_events([
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
```

NodeJS (example):

```javascript
import { Tadau } from 'tadau';
const Tadau = new Tadau({
  apiSecret: 'YOUR_API_SECRET',
  measurementId: 'YOUR_MEASUREMENT_ID',
  fixedDimensions: {'deploy_id': 'foo', 'deploy_infra': 'bar', ...},
  optIn: true
  });

tadau.send_ads_event(
  'audience-created', 'data integration', 'GAds', '123456789', 'audienceList'
  );
```

Alternative instantiation using a config file.

```javascript
import { Tadau } from 'tadau';

const tadau = new Tadau ({
    configFilePath: 'path/to/config.yaml'
})

tadau.send_ads_event(
  'audience-created', 'data integration', 'GAds', '123456789', 'audienceList'
  );
```

Apps Script:

```javascript
const TadauModule = TadauLib.exports || {}; // Get the module from the library
const tadau = new TadauModule.Tadau({
  apiSecret: 'YOUR_API_SECRET',
  measurementId: 'YOUR_MEASUREMENT_ID',
  fixedDimensions: {
    'deploy_id': 'foo',
    'deploy_infra': 'bar',
  },
  optIn: true
});
tadau.send_ads_event(
  'audience-created', 'data integration', 'GAds', '123456789', 'audienceList'
  )
```

## Configuration

For Python it is recommended to use the config.yaml file to instantiate Tadau to
attach fixed dimensions to every hit sent via Measurement Protocol.

```yaml
api_secret: {{api_secret}}
measurement_id: {{measurement_id}}
opt_in: {{opt_in}}

fixed_dimensions:
    deploy_id: {{deployment_id}}
    deploy_infra: {{deploy_infra}}
    deploy_created_time: {{deploy_created_time}}
    deploy_updated_time: {{deploy_updated_time}}
```

Optional: Set file variables using the yaml python package:

```sh
pip install cloud-detect
```

```py
import yaml
import uuid
import cloud_detect

ts = time.time()

with open('config.yaml') as f:
    y = yaml.safe_load(f)
    y['deploy_id'] = f'my_solution_{str(uuid.uuid4())}'
    y['deploy_infra'] = cloud_detect.provider()
    y['deploy_created_time'] = ts
    y['deploy_updated_time'] = ts

   yaml.dump(y)
```

Or using shell:

```sh
wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq &&\
    chmod +x /usr/bin/yq
```

More details and other installation options
[here](https://github.com/mikefarah/yq/).

```sh
#!/bin/bash

# Edit the YAML file
yq -i '.'deploy_id' = "foo" config.yaml
```

If you want to use fixed dimensions to attach to every hit in Apps Script you
have to use `ScriptProperties`:

```ts
const scriptProperties = PropertiesService.getScriptProperties();
scriptProperties.setProperties({
  'apiSecret': 'foo',
  'measurementId': 'bar',
  'deployId': 'fake_id',
  'deployInfra': 'fake_infra',
  'deployCreatedTime': 'fake_created_time',
  'deployUpdatedTime': 'fake_updated_time',
});

// Then you can instantiate Tadau as follows:
tadau = new Tadau({
  loadConfigFromScriptProperties: true,
  optIn: true,
  });
```
