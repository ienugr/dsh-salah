# Privacy

This document describes data handled by the Salah plugin. It does not replace the privacy policies of DeepSeek Harness, your browser, your Host environment, or the external services you choose to use.

## Location choices

### Current location

Salah requests a location fix through the browser’s geolocation API. The browser controls permission and may use its own location services. The plugin does not obtain location from the Host server’s IP address.

The fix is held in the current client’s memory and sent to the Host when a schedule is requested. It is not saved as the plugin’s persistent location preference. Relevant coordinates may also remain in the Host’s bounded, in-memory provider cache until eviction or plugin shutdown. Expired entries are removed lazily when their cache key is read; expiry does not guarantee immediate erasure from memory.

The plugin takes a one-time fix rather than continuously tracking movement. If you move while a page remains open, select **Use current location** again to obtain a new fix. A browser refresh clears the plugin’s client-side fix. Browser permission settings may remain in place independently.

### Manual location

When you choose a city or enter coordinates, Salah stores its label, coordinates, IANA time zone, and optional MyQuran city identifier in profile-wide Harness storage. Source, calculation method, Asr convention, and the explicitly selected geocoding provider are stored there as well.

These settings are shared by sessions in that profile. Choosing **Use current location** clears the saved manual location. To erase other persisted preferences, use the storage-management facilities provided by your Harness installation; uninstalling a bundle should not be treated as a guaranteed data-erasure operation.

## External requests

Requests originate from the Host. The services can see the Host’s network address and the request data listed below.

| Service | When contacted | Data sent by the plugin |
| --- | --- | --- |
| AlAdhan | Loading AlAdhan schedules | Coordinates, requested dates, calculation-method identifier, and Asr convention. |
| MyQuran | Searching its city directory or loading a city timetable | Directory requests, or the selected city identifier and requested dates. The timetable request does not need the browser’s exact GPS coordinates. |
| Open-Meteo Public | City search when the public provider is selected, including MyQuran coordinate/time-zone lookup | A city-name search and, where applicable, an Indonesia country filter. |
| Open-Meteo Commercial | City search only when the licensed customer provider is explicitly selected | The same search parameters plus the Host-managed API key, sent over HTTPS to the fixed customer endpoint. |
| Adhan JS | Never contacted as a service | Calculation runs locally on the Host. |

Provider responses are validated before use. An online source can fall back to local Adhan calculations; that does not undo any request already sent to the online source. City search still requires internet access when local calculation is selected.

## Commercial geocoding credentials

The plugin reads the fixed Host credential reference `SALAH_OPEN_METEO_API_KEY` through the optional Harness credential service. The value can come from Host-managed credentials or supported environment fallback. It is not stored in Salah preference records, browser storage, status metadata, search results, or the agent tool’s parameters.

The key is resolved for each commercial configuration/search operation rather than retained across operations. Status describes only whether a credential is configured. That boolean does not verify the key, subscription, or licence entitlement.

Commercial geocoding uses a fixed customer HTTPS endpoint and sends the API key in its documented query parameter. Open-Meteo and any network/proxy instrumentation in your Host environment can therefore process that request URL. External retention, proxy logs, and the Host credential facility’s storage/encryption are outside this plugin’s control.

The plugin partitions commercial geocoding caches by provider and a private, engine-local salted credential digest; it does not put the raw authentication key into those cache identifiers. Reflected key values in returned geocoder labels are rejected. Missing keys or customer-request failures never silently switch to public geocoding.

Do not enter a real key in agent chat, issue reports, screenshots, or source files. Configure it out of band through the Host. The repository and tests use only synthetic credentials.

## Browser preferences

Floating-widget visibility and position are saved in browser local storage under `dsh.salah.floating.v1`. Setup acknowledgement is saved separately under `dsh.salah.review.v1` as a SHA-256 fingerprint of allowlisted persisted settings. That fingerprint includes the manually saved location when manual mode is selected, but current-device GPS is always excluded; no raw coordinates or timetable are written to these browser keys.

A configuration fingerprint is not an anonymity guarantee: someone who already knows candidate settings can compare their fingerprints. It is a convenience for detecting changed choices, not a credential or Host authorization grant. Browser storage may be shared by Harness pages using the same origin.

Clearing this browser storage resets the widget’s position, visibility, and setup acknowledgement. It does not clear profile-wide prayer-time preferences. If storage or WebCrypto is unavailable, review can remain in memory for that visit.

## Agent tools and logs

The `salah_times` tool does not request browser location permission or obtain GPS. An explicitly supplied tool location is used for that request in current-location mode; a manually configured location is persistent.

Tool inputs and outputs can be recorded in Harness session history. If you explicitly supply coordinates or configure a location through the agent, those values may therefore exist in session records even when they are not saved as current-location preferences.

The plugin does not add an analytics endpoint, advertising integration, or a separate persistent location log. Harness logging, telemetry, hosting, backups, and external-provider retention are outside this plugin’s control.

## Network and permission boundaries

The plugin uses fixed provider endpoints rather than accepting arbitrary fetch URLs. Its local HTTP operations require an authenticated Harness owner connection. These controls are implementation safeguards, not a guarantee that all hosting environments or dependencies are free of security issues.

For sensitive reports, follow [Security reporting](SECURITY.md). For provider terms and attribution, see [Third-party notices](THIRD_PARTY_NOTICES.md).
