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

## Basic Usage

Python:

```py
from tadau import Tadau
tadau = Tadau(config_file_location='config.yaml')

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