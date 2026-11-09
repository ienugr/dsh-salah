# Salah for DeepSeek Harness

Daily prayer times, a live countdown, and a compact floating widget—right inside your workspace.

Salah is a DeepSeek Harness plugin for following the five daily prayers. Choose a prayer-time source, use your current location or select a city, and keep the next prayer in view while you work.

![Floating Salah widget showing the current prayer, its start time, and the countdown to the next prayer](docs/images/salah-widget.webp)

[Getting started](#getting-started) · [Prayer-time sources](#prayer-time-sources) · [Privacy](PRIVACY.md) · [Contributing](CONTRIBUTING.md) · [License](LICENSE)

## Features

- **Live countdown:** see the next prayer and its scheduled start time, including the transition to the following day.
- **Floating widget:** keep the latest prayer start and next-prayer countdown above Harness panels. Drag it, move it with the keyboard, or hide it when you do not need it.
- **Daily timetable:** view today’s five prayers, sunrise, and the following day’s schedule. Sunrise is a reference time, not a prayer.
- **Three sources:** choose AlAdhan, MyQuran, or local Adhan calculations.
- **Flexible location:** request browser location access, search for a city, or enter coordinates and a time zone.
- **Reviewed setup:** explicitly confirm the source, location/time zone, and method before the floating widget or conversation dock shows a ready countdown.
- **Source-aware preferences:** MyQuran’s method and Asr controls are clearly labeled as offline fallback settings; other sources use calculation settings.
- **Source and freshness:** the floating widget identifies the actual schedule source, intentional offline calculation versus fallback, and the fetch time/freshness state.
- **Clear fallbacks:** if an online source fails, the interface identifies when it is showing locally calculated times instead.
- **Time-zone-aware dates:** schedules use the selected location’s time zone and account for daylight saving changes.
- **English and Indonesian copy:** translations follow the active Harness locale when the corresponding language is available.

## Screenshots

### Prayer-times page

![Salah prayer-times page with the next-prayer countdown, daily timetable, location search, and source preferences](docs/images/salah-dashboard.webp)

The supplied screenshots show the earlier 1.1 pre-release interface using MyQuran for Kota Tangerang, Indonesia. Version 1.2 adds reviewed setup, widget source/freshness information, and city-search-provider controls not shown in those images. The displayed times are examples, not a timetable for your location or date.

## Getting started

### Requirements

- **DeepSeek Harness 0.2.1-rc.5**, the currently declared and tested runtime version.
- **Node.js 22.15 or later** and npm to install dependencies.
- A Harness Web interface. The floating widget stays within Harness; it is not a desktop always-on-top window.
- Internet access for online schedules and city search. Local calculations work without a prayer-time API once a location and time zone are known.

Other Harness versions have not been validated. Do not bypass a compatibility warning without checking the relevant APIs.

### Install from this repository

1. Clone or download this repository, then open a terminal in the plugin directory.
2. Install its runtime dependencies:

   ```sh
   npm ci --omit=dev --ignore-scripts
   ```

3. In Harness, ask the agent to install the bundle from the **absolute path** of that directory using `plugin_manager` with `action: install_bundle`. For example, adapt this request to your checkout:

   > Install the Salah plugin from the absolute path to my local checkout using the Harness Plugin Manager.

4. Follow the Plugin Manager’s refresh or restart instructions, then open **Prayer times** in the sidebar.
5. Select a prayer-time source. For current location, explicitly select **Use current location** to request browser permission; alternatively, choose a city or enter coordinates. MyQuran requires a city from its own directory.
6. Review the displayed source, location/time zone, and calculation method. For MyQuran, review its provider-controlled timetable and the separate offline fallback settings.
7. Check all three setup-review acknowledgements, then select **Confirm reviewed setup**. The page remains a labeled preview until review; the floating widget and dock ask you to finish setup instead of presenting an unreviewed countdown.

The client assets are included in the repository, so an end user does not need to build the interface. A local-directory installation links to the checkout: keep that directory available while the plugin is installed.

This repository is prepared for **GitHub distribution as a local Harness bundle**, not publication to the npm registry. The internal package identifier is `@local/dsh-salah`, and the package is intentionally marked `private`.

### Use the floating widget

The widget appears near the top-right by default and remains available as you switch Harness panels.

- **Move:** drag the title bar, or focus it and use the arrow keys. Hold Shift for larger steps.
- **Hide:** select **×**.
- **Show again:** open **Prayer times** and select **Show floating widget**.
- **Reset:** select **Reset widget position** on the Prayer times page.
- **Open the full timetable:** select the widget’s open button or the compact prayer/countdown control beneath the conversation composer. The footer uses forms such as `Maghrib 1:12:47`, with full timing/source details available in its tooltip and accessible name.

Widget visibility, position, and a SHA-256 fingerprint of reviewed persisted settings are saved in this browser. The review fingerprint excludes the current-device location fix. Source, calculation, geocoding provider, and manually selected location settings are shared by sessions in the same Harness profile.

Changing relevant preferences or reopening setup review invalidates the browser’s acknowledgement. Confirmation re-reads the shared preferences before accepting the choices you reviewed. Existing profiles keep their configured preferences and receive this one-time review rather than being silently reset.

The compact source label distinguishes the online source, intentional Adhan calculation, and automatic offline fallback. Its tooltip and accessible label include the full fetch date/time in the schedule’s time zone. Refresh failures, stale/future/unknown timestamps, and exhausted schedules are explicitly identified; an exhausted schedule is not labeled as a current prayer.

“Current prayer” means the most recently started scheduled prayer. It is **not** a ruling on the validity or end of a prayer window. Between sunrise and Dhuhr, the widget shows that it is between prayers rather than continuing to label Fajr as current.

## Prayer-time sources

| Source | Coverage | How it works |
| --- | --- | --- |
| **AlAdhan** | Worldwide | Retrieves calculated times using the selected method and Asr convention. The returned time zone is authoritative. |
| **MyQuran** | Indonesian cities | Retrieves the selected city’s published timetable. Its calculation method and Asr convention are determined by the provider. |
| **Adhan** | Local calculations | Calculates times on the Host using the selected coordinates, time zone, method, and Asr convention. No prayer-time API request is made. |

The default public endpoints require no API key. Availability, quotas, and usage rights remain controlled by each provider. City search can explicitly use either Open-Meteo’s public non-commercial endpoint or its licensed customer endpoint, as described below.

### Choose a location

- **Current location:** the browser must grant permission. The plugin takes a one-time fix and does not track movement. If you move while the page stays open, select **Use current location** again. It does not infer your location from the Host server or its IP address.
- **City search:** select the correct city and country from the results. Search uses Open-Meteo and GeoNames; MyQuran additionally uses its Indonesian city directory.
- **Coordinates:** enter a location name, latitude, longitude, and an IANA time zone such as `Asia/Jakarta`.
- **MyQuran:** select a city from MyQuran search. Coordinates alone do not identify its city timetable. Search coordinates represent a city center and may not be the timetable’s precise reference point.

For offline calculations using a browser location fix, the browser’s time zone is used as a hint. If you are traveling or your device time zone is incorrect, select a city or enter the correct time zone manually.

### Accuracy and limitations

- The default calculation method is **Muslim World League**. Select the method recommended by your local authority.
- Calculation methods and published timetables can differ. Confirm prayer times with your local mosque, especially at high latitudes.
- MyQuran uses its own timetable settings. The method and Asr preferences apply to local fallback calculations, not to its published schedule.
- An online failure triggers a clearly labeled local fallback; the plugin does not present fallback times as the selected provider’s timetable.
- Unsupported polar conditions produce an unavailable result rather than silently substituting a different location.
- Offline Umm al-Qura calculations use a fixed 90-minute Isha interval and do not automatically add the additional 30 minutes used during Ramadan.
- Countdown accuracy depends on the Host and browser clocks. Keep your device clock synchronized.
- The floating widget stays above Harness panels only. It does not remain above other browser tabs or desktop applications.
- Open-Meteo’s default public no-key city search has non-commercial usage terms. Licensed users can explicitly select its commercial customer endpoint with a Host-managed key. This is not a blanket commercial-use grant for other APIs, data, or service tiers.

See [Privacy](PRIVACY.md) for the data sent to each service and the settings stored by the plugin.

## Licensed commercial city search

The **City-search provider** setting is independent of the prayer-time source:

| Mode | Endpoint | Requirements |
| --- | --- | --- |
| Open-Meteo Public | `geocoding-api.open-meteo.com/v1/search` | Non-commercial use under the public service’s terms; this remains the default. |
| Open-Meteo Commercial | `customer-geocoding-api.open-meteo.com/v1/search` | Your valid Open-Meteo subscription and the Host credential `SALAH_OPEN_METEO_API_KEY`. |

To use the commercial mode:

1. Obtain the appropriate subscription and key from Open-Meteo. The plugin does not grant or verify your service entitlement.
2. Configure the credential reference `SALAH_OPEN_METEO_API_KEY` through your Host’s credential facility, or set the same environment variable before starting Harness. An environment-variable change generally requires restarting that Host process; managed credentials are resolved per operation.
3. Refresh **Prayer times**, then explicitly select the commercial city-search provider. A missing or invalidly formatted key rejects that change without silently switching providers.

The interface and tool return only whether a credential is configured—not the key. Do not paste a real key into agent chat, source code, screenshots, issues, or this repository. No raw-key input is added to the plugin’s interface or tool schema.

Keys are sent only to the fixed customer endpoint for commercial geocoding. The plugin does not accept arbitrary outbound URLs. Failed commercial searches do not fall back to the public endpoint. If a previously configured key is removed, search remains unavailable until you restore the credential or explicitly select public mode. MyQuran city-coordinate lookups also respect this geocoding choice.

## Agent access

The `salah_times` tool uses the same Host operations as the interface.

| Action | Result |
| --- | --- |
| `status` | Saved preferences and available source/method identifiers. |
| `search` | City candidates for the selected source. |
| `times` | Today’s and tomorrow’s schedules, with adjacent-day context where needed. |
| `configure` | An atomically saved partial preferences update. |

The tool cannot obtain GPS coordinates or authorize browser location access. In current-location mode, explicitly supplied coordinates apply only to that request. Selecting current-location mode clears the saved manual location. Explicit tool arguments and results may be recorded in Harness session history.

Widget positioning, visibility, and setup acknowledgement are browser view controls, not Host authorization. The tool can configure `geocodingProvider` using the same preference operation as the interface, but it neither receives nor returns the commercial key.

## Development

```sh
npm ci --ignore-scripts
npm run build:ui
npm run check
npm test
npm run check:release
npm run test:e2e:preflight
npm run check:clean-install
```

See [Contributing](CONTRIBUTING.md) for the build workflow, [the executed 16-case browser summary](docs/BROWSER_RESULTS.json), and [the release review](docs/RELEASE_REVIEW.md) for verification results and remaining publication steps. Changes should be tested in Harness, not in a standalone imitation of its interface.

## License and acknowledgments

Plugin source and original artwork are provided under the [MIT License](LICENSE).

Salah uses [AlAdhan](https://aladhan.com/prayer-times-api), [MyQuran](https://myquran.com/), [Adhan JS](https://github.com/batoulapps/adhan-js), and [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api), with location data from [GeoNames](https://www.geonames.org/). Its interface includes styles generated with [Tailwind CSS](https://tailwindcss.com/) and [daisyUI](https://daisyui.com/).

See [Third-party notices](THIRD_PARTY_NOTICES.md) for license notices, attribution, screenshot provenance, and service-term distinctions. This project is independent of those services and does not imply their endorsement.
