# Third-party notices

Salah is an independent plugin. References to products, libraries, and services identify interoperability and attribution; they do not imply affiliation or endorsement.

## Software

The generated stylesheet embedded in the client includes code from Tailwind CSS and daisyUI. Runtime libraries are installed as dependencies rather than bundled into a separate vendor artifact.

| Component | Use | License and copyright notice |
| --- | --- | --- |
| [Tailwind CSS](https://tailwindcss.com/) | Generated interface styles | MIT; Copyright (c) Tailwind Labs, Inc. |
| [daisyUI](https://daisyui.com/) | Generated component styles | MIT; Copyright (c) 2020 Pouya Saadeghi. |
| [Adhan JS](https://github.com/batoulapps/adhan-js) | Local prayer-time calculations | MIT; Copyright (c) 2016 Batoul Apps. |
| [Zod](https://zod.dev/) | Persistent settings validation | MIT; Copyright (c) 2025 Colin McDonnell. |

The browser regression runner uses [Playwright Core](https://playwright.dev/) as development-only tooling under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). It is installed separately, is not embedded in the runtime client, and does not download or launch a browser. Its own package retains its upstream licence and notices.

Other development and transitive dependencies retain the notices in their distributed packages. The lockfile records the resolved development dependency graph.

### MIT notice for the components listed above

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## External services and data

The plugin’s MIT license does **not** grant rights to third-party API services or their data. Check the applicable terms, availability, and quotas before deployment, redistribution of response data, or commercial use.

- **AlAdhan:** [Prayer Times API](https://aladhan.com/prayer-times-api). Provides online prayer-time calculations. No provider timetable database is bundled with the plugin.
- **MyQuran:** [MyQuran](https://myquran.com/). Provides Indonesian city identifiers and published timetables. Provider settings apply to those timetables. No permission to relicense its data is implied here.
- **Open-Meteo:** [Geocoding API documentation](https://open-meteo.com/en/docs/geocoding-api) and [terms](https://open-meteo.com/en/terms). Its public no-key service is intended for non-commercial use under its service terms and remains the default. The plugin also offers an explicitly selected customer geocoding endpoint for users with an appropriate commercial subscription and Host-managed API key. Selecting that mode does not grant or verify entitlement, and failures do not silently fall back to the public endpoint.
- **GeoNames:** [GeoNames](https://www.geonames.org/) and [data attribution information](https://www.geonames.org/about.html). Open-Meteo’s geocoding data is based on GeoNames. GeoNames data is made available under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The plugin displays the returned place labels and normalizes location records; it does not bundle the GeoNames database.

Software licenses, data licenses, and permission to use a hosted service are separate matters. A permissive software or data license does not remove a hosted service’s usage restrictions.

## Artwork and screenshots

The crescent-and-prayer-arch icon was created for this plugin and is covered by the project’s MIT license.

The repository owner supplied the [floating-widget screenshot](docs/images/salah-widget.webp) and [prayer-times-page screenshot](docs/images/salah-dashboard.webp) for inclusion in the documentation. They are unaltered copies of the supplied WebP images, show an example city, and may contain pre-release wording. No EXIF or XMP metadata chunks were present in those supplied copies.

Screenshots document the interface; they do not establish affiliation with Harness or the data providers. Rights in underlying third-party interface elements, names, and trademarks remain with their respective owners.
