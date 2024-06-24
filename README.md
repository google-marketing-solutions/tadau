# Tadau

Tadau is an open-source library available in Python, TypeScript, and Apps Script
that simplifies sending tracking data to Google Analytics 4 (GA4) via the
Measurement Protocol.

Key Features

*   Seamless GA4 Integration: Easily send raw data directly to GA4 servers using
    HTTP requests.
*   Predefined and Custom Events: Track predefined events like downloads,
    errors, or define your own custom events.
*   Flexible Configuration: Configure Tadau using a YAML file or directly within
    your code.
*   Cross-Platform Support: Works with Python, TypeScript, and Apps Script
    projects.

## Installation

Python:

```sh
pip install tadau
```

Type Script:

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

Python:

```py
import tadau
tadau = tadau.Tadau(config_file_location='config.yaml')

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

TypeScript:

```ts
import Tadau from 'tadau';
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

Apps Script:

```js
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

It is recommended to use the config.yaml file to instantiate Tadau to attach
fixed dimensions to every hit sent via Measurement Protocol.

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

The file variables can be set using the yaml python package:

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
