/* Persistent Harness client. Build scoped daisyUI CSS with npm run build:ui. */
window.__ModuleLoader__.load({
  id: '@ienugr/dsh-salah',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useId, useRef, useState, useSyncExternalStore } = React;
    /* SALAH_CSS_START */
    const CSS = "/*! tailwindcss v4.3.4 | MIT License | https://tailwindcss.com */.salah :where(.sl-btn){width:unset}.salah .sl-btn{--sl-size:calc(var(--size-field,.25rem) * 10);--sl-btn-p:1rem;--sl-btn-fg:var(--color-base-content);cursor:pointer;text-align:center;vertical-align:middle;outline-offset:2px;webkit-user-select:none;-webkit-user-select:none;user-select:none;border-width:var(--border);touch-action:manipulation;--sl-btn-bg:var(--sl-btn-color,var(--color-base-200));--sl-btn-border:var(--sl-btn-color,var(--color-base-200));border-start-start-radius:var(--sl-join-ss,var(--radius-field));border-start-end-radius:var(--sl-join-se,var(--radius-field));border-end-end-radius:var(--sl-join-ee,var(--radius-field));border-end-start-radius:var(--sl-join-es,var(--radius-field));flex-wrap:nowrap;flex-shrink:0;justify-content:center;align-items:center;gap:.375rem;font-weight:600;transition-property:color,background-color,border-color,box-shadow,transform;transition-duration:.2s;transition-timing-function:cubic-bezier(0,0,.2,1);display:inline-flex}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn{--sl-btn-border:color-mix(in oklab, var(--sl-btn-color,var(--color-base-200)), var(--dsw-alias-label-primary) calc(var(--depth) * 5%))}}.salah .sl-btn{--sl-btn-soft-bg:initial;--sl-btn-shadow:0 3px 2px -2px var(--sl-btn-bg), 0 4px 3px -2px var(--sl-btn-bg)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn{--sl-btn-shadow:0 3px 2px -2px color-mix(in oklab, var(--sl-btn-bg) calc(var(--depth) * 30%), transparent), 0 4px 3px -2px color-mix(in oklab, var(--sl-btn-bg) calc(var(--depth) * 30%), transparent)}}.salah .sl-btn{--sl-btn-inset:0 .5px 0 .5px transparent;height:var(--sl-size);padding-inline:var(--sl-btn-p);font-size:var(--sl-fontsize,.875rem);background-color:var(--sl-btn-bg);color:var(--sl-btn-fg);border-color:var(--sl-btn-border);border-style:var(--sl-btn-border-style,solid);outline-color:var(--sl-btn-color,var(--color-base-content));--tw-prose-links:var(--sl-btn-fg);background-image:none, var(--sl-fx-noise);background-size:auto, calc(var(--noise,0) * 100%);text-shadow:0 .5px transparent;box-shadow:var(--sl-btn-inset) inset, var(--sl-btn-shadow)}.salah .sl-btn:is([type=checkbox],[type=radio]){appearance:none}.salah .sl-btn:is([type=checkbox],[type=radio])[aria-label]:after{--tw-content:attr(aria-label);content:var(--tw-content)}.salah .sl-btn:where(:checked:not(.sl-filter [type=radio].sl-btn)){--sl-btn-color:var(--color-primary);--sl-btn-fg:var(--color-primary-content)}.salah .sl-input{appearance:none;background-color:var(--color-base-100);vertical-align:middle;white-space:nowrap;--sl-size:calc(var(--size-field,.25rem) * var(--sl-in-size-mul,10));--sl-input-color:var(--color-base-content);flex-shrink:1;align-items:center;gap:.5rem;padding-inline:.75rem;display:inline-flex;position:relative}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-input{--sl-input-color:color-mix(in oklab, var(--color-base-content) 20%, transparent)}}.salah .sl-input{cursor:text;width:clamp(3rem,20rem,100%);height:var(--sl-size);font-size:max(var(--sl-font-size,0rem), var(--sl-font-size-min,.875rem));touch-action:manipulation;border:var(--border) solid var(--sl-input-color,transparent);box-shadow:0 1px var(--sl-input-color) inset, 0 -1px transparent inset;border-start-start-radius:var(--sl-join-ss,var(--radius-field));border-start-end-radius:var(--sl-join-se,var(--radius-field));border-end-end-radius:var(--sl-join-ee,var(--radius-field));border-end-start-radius:var(--sl-join-es,var(--radius-field))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-input{box-shadow:0 1px color-mix(in oklab, var(--sl-input-color) calc(var(--depth) * 10%), transparent) inset, 0 -1px transparent inset}}.salah .sl-input input{appearance:none;background-color:transparent;border:none;width:100%;height:100%}.salah .sl-input input::placeholder{color:var(--color-base-content);opacity:.5}.salah .sl-input input:focus,.salah .sl-input input:focus-within{--tw-outline-style:none;outline-style:none}@media (forced-colors:active){.salah .sl-input input:focus,.salah .sl-input input:focus-within{outline-offset:2px;outline:2px solid transparent}}.salah .sl-input input::-webkit-calendar-picker-indicator{inset-inline-end:-.15em}.salah .sl-input::-webkit-inner-spin-button{margin-inline-end:-10px}.salah .sl-input::-webkit-calendar-picker-indicator{inset-inline-end:.75em}.salah input.sl-input{text-align:start;display:inline-flex;position:relative}.salah input.sl-input[type=url],.salah input.sl-input[type=tel],.salah input.sl-input[type=email],.salah input.sl-input[type=number]{direction:ltr}.salah input.sl-input::-webkit-datetime-edit{min-height:100%;text-align:inherit;align-items:center;display:grid}.salah input.sl-input::-webkit-date-and-time-value{min-height:100%;text-align:inherit;align-items:center;display:grid}.salah input.sl-input::-webkit-inner-spin-button{margin-block:calc(.25rem * var(--sl-spin-my,-3))}.salah input.sl-input::-webkit-calendar-picker-indicator{cursor:pointer;width:1em;height:1em;position:absolute}.salah input.sl-input::-webkit-color-swatch-wrapper{padding-block:.25rem}.salah .sl-input input{text-align:start;display:inline-flex;position:relative}.salah .sl-input input[type=url],.salah .sl-input input[type=tel],.salah .sl-input input[type=email],.salah .sl-input input[type=number]{direction:ltr}.salah .sl-input input::-webkit-datetime-edit{min-height:100%;text-align:inherit;align-items:center;display:grid}.salah .sl-input input::-webkit-date-and-time-value{min-height:100%;text-align:inherit;align-items:center;display:grid}.salah .sl-input input::-webkit-inner-spin-button{margin-block:calc(.25rem * var(--sl-spin-my,-3))}.salah .sl-input input::-webkit-calendar-picker-indicator{cursor:pointer;width:1em;height:1em;position:absolute}.salah .sl-input input::-webkit-color-swatch-wrapper{padding-block:.25rem}.salah .sl-input:focus{--sl-input-color:var(--color-base-content);box-shadow:0 1px var(--sl-input-color)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-input:focus{box-shadow:0 1px color-mix(in oklab, var(--sl-input-color) calc(var(--depth) * 10%), transparent)}}.salah .sl-input:focus{outline:2px solid var(--sl-input-color);outline-offset:2px}@media (pointer:coarse){@supports (-webkit-touch-callout:none){.salah .sl-input:focus{--sl-font-size:1rem}}}.salah .sl-input:focus-within{--sl-input-color:var(--color-base-content);box-shadow:0 1px var(--sl-input-color)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-input:focus-within{box-shadow:0 1px color-mix(in oklab, var(--sl-input-color) calc(var(--depth) * 10%), transparent)}}.salah .sl-input:focus-within{outline:2px solid var(--sl-input-color);outline-offset:2px}@media (pointer:coarse){@supports (-webkit-touch-callout:none){.salah .sl-input:focus-within{--sl-font-size:1rem}}}.salah .sl-select{appearance:none;background-color:var(--color-base-100);vertical-align:middle;--sl-size:calc(var(--size-field,.25rem) * var(--sl-sl-size-mul,10));--sl-input-color:var(--color-base-content);flex-shrink:1;align-items:center;gap:.375rem;padding-inline:.75rem 1.75rem;display:inline-flex;position:relative}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-select{--sl-input-color:color-mix(in oklab, var(--color-base-content) 20%, transparent)}}.salah .sl-select{width:clamp(3rem,20rem,100%);height:var(--sl-size);font-size:max(var(--sl-font-size,0rem), var(--sl-font-size-min,.875rem));touch-action:manipulation;white-space:nowrap;text-overflow:ellipsis;border:var(--border) solid var(--sl-input-color,transparent);box-shadow:0 1px var(--sl-input-color) inset, 0 -1px transparent inset;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 20px) calc(1px + 50%),calc(100% - 16.1px) calc(1px + 50%);background-repeat:no-repeat;background-size:4px 4px,4px 4px;border-start-start-radius:var(--sl-join-ss,var(--radius-field));border-start-end-radius:var(--sl-join-se,var(--radius-field));border-end-end-radius:var(--sl-join-ee,var(--radius-field));border-end-start-radius:var(--sl-join-es,var(--radius-field));overflow:hidden}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-select{box-shadow:0 1px color-mix(in oklab, var(--sl-input-color) calc(var(--depth) * 10%), transparent) inset, 0 -1px transparent inset}}.salah [dir=rtl] .sl-select{background-position:12px calc(1px + 50%),16px calc(1px + 50%)}.salah .sl-select[multiple]{background-image:none;height:auto;padding-block:.75rem;padding-inline-end:.75rem;overflow:auto}.salah .sl-select select{appearance:none;width:calc(100% + 2.75rem);height:calc(100% - calc(var(--border) * 2));background:inherit;border-radius:inherit;border-style:none;align-items:center;margin-inline:-.75rem -1.75rem;padding-inline:.75rem 1.75rem}.salah .sl-select select::placeholder{color:var(--color-base-content);opacity:.5}.salah .sl-select select:focus,.salah .sl-select select:focus-within{--tw-outline-style:none;outline-style:none}@media (forced-colors:active){.salah .sl-select select:focus,.salah .sl-select select:focus-within{outline-offset:2px;outline:2px solid transparent}}.salah .sl-select select:not(:last-child){background-image:none;margin-inline-end:-1.375rem}.salah .sl-select:focus{--sl-input-color:var(--color-base-content);box-shadow:0 1px var(--sl-input-color)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-select:focus{box-shadow:0 1px color-mix(in oklab, var(--sl-input-color) calc(var(--depth) * 10%), transparent)}}.salah .sl-select:focus{outline:2px solid var(--sl-input-color);outline-offset:2px}.salah .sl-select:focus-within{--sl-input-color:var(--color-base-content);box-shadow:0 1px var(--sl-input-color)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-select:focus-within{box-shadow:0 1px color-mix(in oklab, var(--sl-input-color) calc(var(--depth) * 10%), transparent)}}.salah .sl-select:focus-within{outline:2px solid var(--sl-input-color);outline-offset:2px}.salah .sl-select:open{--sl-input-color:var(--color-base-content);box-shadow:0 1px var(--sl-input-color)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-select:open{box-shadow:0 1px color-mix(in oklab, var(--sl-input-color) calc(var(--depth) * 10%), transparent)}}.salah .sl-select:open{outline:2px solid var(--sl-input-color);outline-offset:2px;background-image:linear-gradient(135deg,transparent 50%,currentColor 50%),linear-gradient(45deg,currentColor 50%,transparent 50%)}@supports (appearance:base-select){.salah :is(.sl-select,.sl-select select){appearance:base-select}.salah :is(.sl-select,.sl-select select)::picker(select){appearance:base-select}}.salah :is(.sl-select,.sl-select select)::picker(select){color:inherit;border:var(--border) solid var(--color-base-200);border-radius:var(--radius-box);background-color:inherit;max-height:min(24rem,70dvh);box-shadow:0 2px calc(var(--depth) * 3px) -2px transparent;box-shadow:0 20px 25px -5px transparent, 0 8px 10px -6px transparent;margin-block:.5rem;margin-inline:.5rem;padding:.5rem;translate:-.5rem}.salah :is(.sl-select,.sl-select select)::picker-icon{display:none}.salah :is(.sl-select,.sl-select select) selectedcontent{text-overflow:ellipsis;white-space:nowrap;width:100%;overflow:hidden}.salah :is(.sl-select,.sl-select select) optgroup{padding-top:.5em}.salah :is(.sl-select,.sl-select select) optgroup option:first-child{margin-top:.5em}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah :is(.sl-select,.sl-select select) option:not(:disabled):hover,.salah :is(.sl-select,.sl-select select) option:not(:disabled):focus-visible{background-color:color-mix(in oklab, var(--color-base-content) 10%, transparent)}}@media (forced-colors:active){.salah :is(.sl-select,.sl-select select) option:not(:disabled):hover,.salah :is(.sl-select,.sl-select select) option:not(:disabled):focus-visible{outline-offset:2px;outline:2px solid transparent}}.salah :is(.sl-select,.sl-select select) option{border-radius:var(--radius-field);padding-block:.375rem;padding-inline:calc(.25rem * var(--sl-option-px,3));white-space:normal;transition-property:color,background-color;transition-duration:.2s;transition-timing-function:cubic-bezier(0,0,.2,1)}.salah :is(.sl-select,.sl-select select) option:not(:disabled):hover,.salah :is(.sl-select,.sl-select select) option:not(:disabled):focus-visible{cursor:pointer;background-color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah :is(.sl-select,.sl-select select) option:not(:disabled):hover,.salah :is(.sl-select,.sl-select select) option:not(:disabled):focus-visible{background-color:color-mix(in oklab, var(--color-base-content) 10%, transparent)}}.salah :is(.sl-select,.sl-select select) option:not(:disabled):hover,.salah :is(.sl-select,.sl-select select) option:not(:disabled):focus-visible{--tw-outline-style:none;outline-style:none}@media (forced-colors:active){.salah :is(.sl-select,.sl-select select) option:not(:disabled):hover,.salah :is(.sl-select,.sl-select select) option:not(:disabled):focus-visible{outline-offset:2px;outline:2px solid transparent}}.salah :is(.sl-select,.sl-select select) option:not(:disabled):active{background-color:var(--color-neutral);color:var(--color-neutral-content);box-shadow:0 2px calc(var(--depth) * 3px) -2px var(--color-neutral)}.salah [dir=rtl] .sl-select::picker(select){translate:.5rem}.salah [dir=rtl] .sl-select select::picker(select){translate:.5rem}.salah .sl-checkbox{border:var(--border) solid var(--sl-input-color,var(--color-base-content))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-checkbox{border:var(--border) solid var(--sl-input-color,color-mix(in oklab, var(--color-base-content) 20%, transparent))}}.salah .sl-checkbox{cursor:pointer;appearance:none;border-radius:var(--radius-selector);vertical-align:middle;color:var(--color-base-content);box-shadow:0 1px transparent inset, 0 0 transparent inset, 0 0 transparent;--sl-size:calc(var(--size-selector,.25rem) * 6);width:var(--sl-size);height:var(--sl-size);background-size:auto, calc(var(--noise) * 100%);background-image:none, var(--sl-fx-noise);flex-shrink:0;padding:.25rem;transition:background-color .2s,box-shadow .2s;display:inline-block;position:relative}.salah .sl-checkbox:before{--tw-content:\"\";content:var(--tw-content);opacity:0;clip-path:polygon(20% 100%,20% 80%,50% 80%,50% 80%,70% 80%,70% 100%);width:100%;height:100%;box-shadow:0px 3px 0 0px transparent inset;background-color:currentColor;font-size:1rem;line-height:.75;transition:clip-path .3s .1s,opacity .1s .1s,rotate .3s .1s,translate .3s .1s;display:block;rotate:45deg}.salah .sl-checkbox:focus-visible{outline:2px solid var(--sl-input-color,currentColor);outline-offset:2px}.salah .sl-checkbox:checked{background-color:var(--sl-input-color,transparent);box-shadow:0 0 transparent inset, 0 8px 0 -4px transparent inset, 0 1px transparent}.salah .sl-checkbox:checked:before{clip-path:polygon(20% 100%,20% 80%,50% 80%,50% 0%,70% 0%,70% 100%);opacity:1;translate:3.5% -7%}@media (forced-colors:active){.salah .sl-checkbox:checked:before{--tw-content:\"✔︎\";clip-path:none;background-color:transparent;rotate:0deg}}@media print{.salah .sl-checkbox:checked:before{--tw-content:\"✔︎\";clip-path:none;background-color:transparent;rotate:0deg}}.salah .sl-checkbox[aria-checked=true]{background-color:var(--sl-input-color,transparent);box-shadow:0 0 transparent inset, 0 8px 0 -4px transparent inset, 0 1px transparent}.salah .sl-checkbox[aria-checked=true]:before{clip-path:polygon(20% 100%,20% 80%,50% 80%,50% 0%,70% 0%,70% 100%);opacity:1;translate:3.5% -7%}@media (forced-colors:active){.salah .sl-checkbox[aria-checked=true]:before{--tw-content:\"✔︎\";clip-path:none;background-color:transparent;rotate:0deg}}@media print{.salah .sl-checkbox[aria-checked=true]:before{--tw-content:\"✔︎\";clip-path:none;background-color:transparent;rotate:0deg}}.salah .sl-checkbox:indeterminate{background-color:var(--sl-input-color,var(--color-base-content))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-checkbox:indeterminate{background-color:var(--sl-input-color,color-mix(in oklab, var(--color-base-content) 20%, transparent))}}.salah .sl-checkbox:indeterminate:before{opacity:1;clip-path:polygon(20% 100%,20% 80%,50% 80%,50% 80%,80% 80%,80% 100%);translate:0 -40%;rotate:0deg}@media (forced-colors:active){.salah .sl-checkbox:indeterminate:before{--tw-content:\"−\";clip-path:none;background-color:transparent;translate:0;rotate:0deg}}.salah .sl-checkbox[aria-checked=mixed]{background-color:var(--sl-input-color,var(--color-base-content))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-checkbox[aria-checked=mixed]{background-color:var(--sl-input-color,color-mix(in oklab, var(--color-base-content) 20%, transparent))}}.salah .sl-checkbox[aria-checked=mixed]:before{opacity:1;clip-path:polygon(20% 100%,20% 80%,50% 80%,50% 80%,80% 80%,80% 100%);translate:0 -40%;rotate:0deg}@media (forced-colors:active){.salah .sl-checkbox[aria-checked=mixed]:before{--tw-content:\"−\";clip-path:none;background-color:transparent;translate:0;rotate:0deg}}.salah .sl-card-body{padding:var(--sl-card-p,1.5rem);font-size:var(--sl-card-fs,.875rem);flex-direction:column;flex:auto;gap:.5rem;display:flex}.salah .sl-card{border-radius:var(--radius-box);outline-offset:2px;outline:2px solid transparent;flex-direction:column;transition:outline .2s ease-in-out;display:flex;position:relative}.salah .sl-card:focus-visible,.salah .sl-card[aria-checked=true],.salah .sl-card:has(>:checked,>:is([type=checkbox],[type=radio]):focus-visible){outline-color:currentColor}.salah .sl-card:has(>:checked:focus-visible),.salah .sl-card[aria-checked=true]:focus-visible,.salah .sl-card[aria-checked=true]:has(>:is([type=checkbox],[type=radio]):focus-visible){outline-width:4px}.salah .sl-card:has(>:is([type=checkbox],[type=radio])){cursor:pointer;-webkit-user-select:none;user-select:none}.salah .sl-card>:is([type=checkbox],[type=radio]){appearance:none}.salah .sl-fieldset-legend{color:var(--color-base-content);margin-bottom:-.25rem;justify-content:space-between;align-items:center;gap:.5rem;margin-inline-end:auto;padding-block:.5rem;font-weight:600;display:flex}.salah .sl-badge{border-radius:var(--radius-selector);vertical-align:middle;color:var(--sl-badge-fg);border:var(--border) solid var(--sl-badge-color,var(--color-base-200));background-size:auto, calc(var(--noise) * 100%);background-image:none, var(--sl-fx-noise);background-color:var(--sl-badge-bg);--sl-badge-bg:var(--sl-badge-color,var(--color-base-100));--sl-badge-fg:var(--color-base-content);--sl-size:calc(var(--size-selector,.25rem) * 6);width:fit-content;height:var(--sl-size);padding-inline:calc(var(--sl-size) / 2 - var(--border));flex-shrink:0;justify-content:center;align-items:center;gap:.5rem;font-size:.875rem;display:inline-flex}.salah .sl-fieldset{grid-template-columns:1fr;grid-auto-rows:max-content;gap:.375rem;padding-block:.25rem;font-size:.75rem;display:grid}.salah .sl-card-title{font-size:var(--sl-cardtitle-fs,1.125rem);align-items:center;gap:.5rem;font-weight:600;display:flex}.salah .sl-btn-ghost{--sl-btn-bg:transparent;color:var(--sl-btn-rest-fg,var(--sl-btn-color,var(--color-base-content,currentColor)));--sl-btn-border:transparent;--sl-btn-inset:0 0 0 0 transparent;--sl-btn-shadow:0 0 0 0 transparent;background-image:none}.salah .prose :where(a.sl-btn:not(.sl-btn-link)):not(:where([class~=not-prose],[class~=not-prose] *)){text-decoration-line:none}@media (hover:hover){.salah .sl-btn:hover{--sl-btn-bg:var(--sl-btn-color,var(--color-base-200))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:hover{--sl-btn-bg:color-mix(in oklab, var(--sl-btn-color,var(--color-base-200)), var(--dsw-alias-label-primary) 7%)}}.salah .sl-btn:hover{color:var(--sl-btn-fg);--sl-btn-border:var(--sl-btn-bg)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:hover{--sl-btn-border:color-mix(in oklab, var(--sl-btn-bg), var(--dsw-alias-label-primary) calc(var(--depth) * 5%))}}.salah .sl-btn:hover{--sl-btn-border-style:solid;--sl-btn-inset:0 .5px 0 .5px transparent;--sl-btn-shadow:0 3px 2px -2px var(--sl-btn-bg), 0 4px 3px -2px var(--sl-btn-bg)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:hover{--sl-btn-shadow:0 3px 2px -2px color-mix(in oklab, var(--sl-btn-bg) calc(var(--depth) * 30%), transparent), 0 4px 3px -2px color-mix(in oklab, var(--sl-btn-bg) calc(var(--depth) * 30%), transparent)}}}.salah .sl-btn:active:not(.sl-btn-active,[aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-bg:var(--sl-btn-color,var(--color-base-200));translate:0 .5px}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:active:not(.sl-btn-active,[aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-bg:color-mix(in oklab, var(--sl-btn-color,var(--color-base-200)), var(--dsw-alias-label-primary) 5%)}}.salah .sl-btn:active:not(.sl-btn-active,[aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){color:var(--sl-btn-fg,var(--color-base-content));--sl-btn-border:var(--sl-btn-color,var(--color-base-200))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:active:not(.sl-btn-active,[aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-border:color-mix(in oklab, var(--sl-btn-color,var(--color-base-200)), var(--dsw-alias-label-primary) 7%)}}.salah .sl-btn:active:not(.sl-btn-active,[aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-border-style:solid;--sl-btn-inset:0 0 0 0 transparent;--sl-btn-shadow:0 0 0 0 transparent}.salah .sl-btn:where(:checked:not(.sl-filter [type=radio].sl-btn),:not([type=radio],[type=checkbox]):focus-visible){--sl-btn-bg:var(--sl-btn-color,var(--color-base-200));color:var(--sl-btn-fg,var(--color-base-content));--sl-btn-border:var(--sl-btn-bg)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:where(:checked:not(.sl-filter [type=radio].sl-btn),:not([type=radio],[type=checkbox]):focus-visible){--sl-btn-border:color-mix(in oklab, var(--sl-btn-bg), var(--dsw-alias-label-primary) calc(var(--depth) * 5%))}}.salah .sl-btn:where(:checked:not(.sl-filter [type=radio].sl-btn),:not([type=radio],[type=checkbox]):focus-visible){--sl-btn-border-style:solid;--sl-btn-inset:0 .5px 0 .5px transparent;--sl-btn-shadow:0 3px 2px -2px var(--sl-btn-bg), 0 4px 3px -2px var(--sl-btn-bg)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:where(:checked:not(.sl-filter [type=radio].sl-btn),:not([type=radio],[type=checkbox]):focus-visible){--sl-btn-shadow:0 3px 2px -2px color-mix(in oklab, var(--sl-btn-bg) calc(var(--depth) * 30%), transparent), 0 4px 3px -2px color-mix(in oklab, var(--sl-btn-bg) calc(var(--depth) * 30%), transparent)}}.salah .sl-btn:where(:checked:not(.sl-filter [type=radio].sl-btn),:not([type=radio],[type=checkbox]):focus-visible){isolation:isolate}.salah .sl-btn:focus-visible,.salah .sl-btn:has(:focus-visible){isolation:isolate;outline-width:2px;outline-style:solid}.salah .sl-btn:is([aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-bg:var(--sl-btn-color,var(--color-base-200))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:is([aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-bg:color-mix(in oklab, var(--sl-btn-color,var(--color-base-200)), var(--dsw-alias-label-primary) 5%)}}.salah .sl-btn:is([aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){color:var(--sl-btn-fg,var(--color-base-content));--sl-btn-border:var(--sl-btn-color,var(--color-base-200))}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:is([aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-border:color-mix(in oklab, var(--sl-btn-color,var(--color-base-200)), var(--dsw-alias-label-primary) 7%)}}.salah .sl-btn:is([aria-pressed=true],[aria-checked=true],[aria-current]:not([aria-current=false],[aria-current=\"\"])){--sl-btn-border-style:solid;--sl-btn-inset:0 0 0 0 transparent;--sl-btn-shadow:0 0 0 0 transparent;isolation:isolate}.salah .sl-input:has(>input[disabled]){cursor:not-allowed;border-color:var(--color-base-200);background-color:var(--color-base-200)}.salah .sl-input:has(>input[disabled]):is(input),.salah .sl-input:has(>input[disabled]) :is(input){color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-input:has(>input[disabled]):is(input),.salah .sl-input:has(>input[disabled]) :is(input){color:color-mix(in oklab, var(--color-base-content) 40%, transparent)}}.salah .sl-input:has(>input[disabled]){box-shadow:none}.salah .sl-input:has(>input[disabled])::placeholder,.salah .sl-input:has(>input[disabled]) ::placeholder{color:var(--color-base-content);opacity:.2}.salah .sl-input:is(:disabled,[disabled]){cursor:not-allowed;border-color:var(--color-base-200);background-color:var(--color-base-200)}.salah .sl-input:is(:disabled,[disabled]):is(input),.salah .sl-input:is(:disabled,[disabled]) :is(input){color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-input:is(:disabled,[disabled]):is(input),.salah .sl-input:is(:disabled,[disabled]) :is(input){color:color-mix(in oklab, var(--color-base-content) 40%, transparent)}}.salah .sl-input:is(:disabled,[disabled]){box-shadow:none}.salah .sl-input:is(:disabled,[disabled])::placeholder,.salah .sl-input:is(:disabled,[disabled]) ::placeholder{color:var(--color-base-content);opacity:.2}.salah fieldset:disabled .sl-input{cursor:not-allowed;border-color:var(--color-base-200);background-color:var(--color-base-200)}.salah fieldset:disabled .sl-input:is(input),.salah fieldset:disabled .sl-input :is(input){color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah fieldset:disabled .sl-input:is(input),.salah fieldset:disabled .sl-input :is(input){color:color-mix(in oklab, var(--color-base-content) 40%, transparent)}}.salah fieldset:disabled .sl-input{box-shadow:none}.salah fieldset:disabled .sl-input::placeholder,.salah fieldset:disabled .sl-input ::placeholder{color:var(--color-base-content);opacity:.2}.salah .sl-input:has(>input[disabled])>input[disabled]{cursor:not-allowed}.salah .sl-select:has(>select[disabled]){cursor:not-allowed;border-color:var(--color-base-200);background-color:var(--color-base-200)}.salah .sl-select:has(>select[disabled]):is(select),.salah .sl-select:has(>select[disabled]) :is(select){color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-select:has(>select[disabled]):is(select),.salah .sl-select:has(>select[disabled]) :is(select){color:color-mix(in oklab, var(--color-base-content) 40%, transparent)}}.salah .sl-select:has(>select[disabled]){box-shadow:none}.salah .sl-select:has(>select[disabled])::placeholder,.salah .sl-select:has(>select[disabled]) ::placeholder{color:var(--color-base-content);opacity:.2}.salah .sl-select:is(:disabled,[disabled]){cursor:not-allowed;border-color:var(--color-base-200);background-color:var(--color-base-200)}.salah .sl-select:is(:disabled,[disabled]):is(select),.salah .sl-select:is(:disabled,[disabled]) :is(select){color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-select:is(:disabled,[disabled]):is(select),.salah .sl-select:is(:disabled,[disabled]) :is(select){color:color-mix(in oklab, var(--color-base-content) 40%, transparent)}}.salah .sl-select:is(:disabled,[disabled]){box-shadow:none}.salah .sl-select:is(:disabled,[disabled])::placeholder,.salah .sl-select:is(:disabled,[disabled]) ::placeholder{color:var(--color-base-content);opacity:.2}.salah fieldset:disabled .sl-select{cursor:not-allowed;border-color:var(--color-base-200);background-color:var(--color-base-200)}.salah fieldset:disabled .sl-select:is(select),.salah fieldset:disabled .sl-select :is(select){color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah fieldset:disabled .sl-select:is(select),.salah fieldset:disabled .sl-select :is(select){color:color-mix(in oklab, var(--color-base-content) 40%, transparent)}}.salah fieldset:disabled .sl-select{box-shadow:none}.salah fieldset:disabled .sl-select::placeholder,.salah fieldset:disabled .sl-select ::placeholder{color:var(--color-base-content);opacity:.2}.salah .sl-select:has(>select[disabled])>select[disabled]{cursor:not-allowed}.salah .sl-checkbox:disabled{cursor:not-allowed;opacity:.2}.salah .sl-image-full>.sl-card-body{color:var(--color-neutral-content);position:relative}.salah .sl-card-xs .sl-card-body{--sl-card-p:.5rem;--sl-card-fs:.6875rem}.salah .sl-card-sm .sl-card-body{--sl-card-p:1rem;--sl-card-fs:.75rem}.salah .sl-card-md .sl-card-body{--sl-card-p:1.5rem;--sl-card-fs:.875rem}.salah .sl-card-lg .sl-card-body{--sl-card-p:2rem;--sl-card-fs:1rem}.salah .sl-card-xl .sl-card-body{--sl-card-p:2.5rem;--sl-card-fs:1.125rem}.salah .sl-card-xs .sl-card-title{--sl-cardtitle-fs:.875rem}.salah .sl-card-sm .sl-card-title{--sl-cardtitle-fs:1rem}.salah .sl-card-md .sl-card-title{--sl-cardtitle-fs:1.125rem}.salah .sl-card-lg .sl-card-title{--sl-cardtitle-fs:1.25rem}.salah .sl-card-xl .sl-card-title{--sl-cardtitle-fs:1.375rem}.salah .sl-badge-outline{color:var(--sl-badge-color);--sl-badge-bg:transparent;background-image:none;border-color:currentColor}.salah .sl-checkbox-sm{--sl-size:calc(var(--size-selector,.25rem) * 5);padding:.1875rem}.salah .sl-badge-sm{--sl-size:calc(var(--size-selector,.25rem) * 5);font-size:.75rem}.salah .sl-input-sm{--sl-in-size-mul:8;--sl-font-size-min:.75rem;--sl-spin-my:-2}.salah .sl-floating-label:has(.sl-input-sm){--sl-top-mul:4;--sl-font-size:.75rem}.salah .sl-select-sm{--sl-sl-size-mul:8;--sl-font-size-min:.75rem;--sl-option-px:2.5}.salah .sl-floating-label:has(.sl-select-sm){--sl-top-mul:4;--sl-font-size:.75rem}.salah .sl-btn-sm{--sl-fontsize:.75rem;--sl-btn-p:.75rem;--sl-size:calc(var(--size-field,.25rem) * 8)}.salah .sl-btn-xs{--sl-fontsize:.6875rem;--sl-btn-p:.5rem;--sl-size:calc(var(--size-field,.25rem) * 6)}.salah .sl-card-border{border:var(--border) solid var(--color-base-200)}.salah .sl-btn:is(.sl-btn-disabled,:disabled,[disabled],[aria-disabled=true]){pointer-events:none;color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:is(.sl-btn-disabled,:disabled,[disabled],[aria-disabled=true]){color:color-mix(in oklch, var(--color-base-content) 20%, transparent)}}.salah .sl-btn:is(.sl-btn-disabled,:disabled,[disabled],[aria-disabled=true]){--sl-btn-bg:transparent;--sl-btn-border:transparent;--sl-btn-inset:0 0 0 0 transparent;--sl-btn-shadow:0 0 0 0 transparent;background-image:none}.salah .sl-btn:is(.sl-btn-disabled,:disabled,[disabled],[aria-disabled=true]):not(.sl-btn-link,.sl-btn-ghost){background-color:var(--color-base-content)}@supports (color:color-mix(in lab, currentColor, currentColor)){.salah .sl-btn:is(.sl-btn-disabled,:disabled,[disabled],[aria-disabled=true]):not(.sl-btn-link,.sl-btn-ghost){background-color:color-mix(in oklab, var(--color-base-content) 10%, transparent)}}.salah :is(.sl-input[type=url],.sl-input[type=tel],.sl-input[type=email],.sl-input[type=number]):dir(rtl){border-start-start-radius:var(--sl-join-se,var(--radius-field));border-start-end-radius:var(--sl-join-ss,var(--radius-field));border-end-end-radius:var(--sl-join-es,var(--radius-field));border-end-start-radius:var(--sl-join-ee,var(--radius-field))}.salah .sl-card-body p{flex-grow:1}.salah .sl-card figure:first-child{border-start-start-radius:inherit;border-start-end-radius:inherit;border-end-end-radius:unset;border-end-start-radius:unset;overflow:hidden}.salah .sl-card figure:last-child{border-start-start-radius:unset;border-start-end-radius:unset;border-end-end-radius:inherit;border-end-start-radius:inherit;overflow:hidden}.salah .sl-card figure{justify-content:center;align-items:center;display:flex}\n\n/* Only plugin-owned surfaces; all UI colors track the live Harness theme. */\n.salah {\n  --color-base-100: var(--dsw-alias-bg-layer-1); --color-base-200: var(--dsw-alias-bg-layer-2); --color-base-300: var(--dsw-alias-border-l1); --color-base-content: var(--dsw-alias-label-primary);\n  --color-primary: var(--dsw-alias-brand-primary); --color-primary-content: var(--dsw-alias-bg-base);\n  --color-secondary: var(--dsw-alias-brand-primary); --color-secondary-content: var(--dsw-alias-bg-base);\n  --color-accent: var(--dsw-alias-brand-primary); --color-accent-content: var(--dsw-alias-bg-base);\n  --color-neutral: var(--dsw-alias-bg-layer-2); --color-neutral-content: var(--dsw-alias-label-primary);\n  --color-info: var(--dsw-alias-state-idle-primary); --color-info-content: var(--dsw-alias-bg-base);\n  --color-success: var(--dsw-alias-state-success-primary); --color-success-content: var(--dsw-alias-bg-base);\n  --color-warning: var(--dsw-alias-state-warn-primary); --color-warning-content: var(--dsw-alias-bg-base);\n  --color-error: var(--dsw-alias-state-error-primary); --color-error-content: var(--dsw-alias-bg-base);\n  --radius-selector: .375rem; --radius-field: .375rem; --radius-box: .75rem; --size-selector: .25rem; --size-field: .25rem;\n  --border: 1px; --depth: 0; --noise: 0; --font-weight-normal: 400; --font-weight-medium: 500; --font-weight-semibold: 600;\n  box-sizing: border-box; color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 1.5; color-scheme: inherit;\n}\n.salah *, .salah *::before, .salah *::after { box-sizing: border-box; }\n.salah h1, .salah h2, .salah h3, .salah p, .salah dl, .salah dd { margin: 0; }\n.salah button, .salah input, .salah select { font: inherit; }\n.salah :focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 3px; }\n.salah.salah-panel { width: 100%; height: 100%; min-width: 0; overflow: auto; background: var(--dsw-alias-bg-base); overscroll-behavior: contain; }\n.salah .salah-page { max-width: 1040px; margin: 0 auto; padding: 28px 32px; display: flex; flex-direction: column; gap: 24px; }\n.salah .salah-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; min-width: 0; }\n.salah .salah-between { justify-content: space-between; }\n.salah .salah-top { display: flex; justify-content: space-between; align-items: start; gap: 16px; }\n.salah .salah-brand { display: flex; gap: 12px; align-items: center; }\n.salah h1 { font-size: 24px; font-weight: 600; letter-spacing: -.025em; }\n.salah h2 { font-size: 17px; font-weight: 600; }\n.salah .salah-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }\n.salah .salah-muted { color: var(--dsw-alias-label-secondary); }\n.salah .salah-small { font-size: 12px; }\n.salah .salah-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.65; overflow-wrap: anywhere; }\n.salah .sl-btn { min-height: 32px; height: auto; font-size: 13px; padding-block: 7px; font-weight: 500; box-shadow: none; border-color: var(--dsw-alias-border-l1); }\n.salah .sl-btn-ghost { border-color: transparent; }\n.salah .sl-btn:disabled { cursor: not-allowed; }\n.salah .sl-input, .salah .sl-select { width: 100%; min-width: 0; background-color: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); font-size: 13px; }\n.salah .sl-card { min-width: 0; box-shadow: none; background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-border-l1); }\n.salah .sl-card-body { min-width: 0; padding: 22px; gap: 16px; }\n.salah .sl-card-title { font-size: 16px; font-weight: 600; }\n.salah .sl-badge { height: auto; min-height: 20px; white-space: normal; padding: 2px 7px; font-size: 11px; border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }\n.salah .salah-hero { position: relative; overflow: hidden; }\n.salah .salah-hero .sl-card-body { padding: 28px; gap: 20px; }\n.salah .salah-hero-main { display: flex; align-items: end; justify-content: space-between; flex-wrap: wrap; gap: 24px; }\n.salah .salah-next-name { font-size: 36px; line-height: 1.2; font-weight: 500; letter-spacing: -.025em; margin: 8px 0; }\n.salah .salah-next-time { font-size: 14px; color: var(--dsw-alias-label-secondary); }\n.salah .salah-digits { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n.salah .salah-countdown { font-size: clamp(30px, 4.7vw, 50px); font-weight: 400; line-height: 1.15; letter-spacing: -.04em; white-space: nowrap; }\n.salah .salah-count-label { margin-bottom: 8px; }\n.salah .salah-location-line { padding-top: 16px; border-top: 1px solid var(--dsw-alias-border-l1); }\n.salah .salah-schedule { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }\n.salah .salah-prayer { padding: 16px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); min-width: 0; }\n.salah .salah-prayer[data-next=\"true\"] { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, var(--dsw-alias-bg-layer-1)); }\n.salah .salah-prayer-name { font-size: 12px; color: var(--dsw-alias-label-secondary); margin-bottom: 10px; }\n.salah .salah-prayer-time { font-size: 22px; font-weight: 500; }\n.salah .salah-prayer-note { font-size: 10px; min-height: 15px; margin-top: 6px; color: var(--dsw-alias-label-secondary); }\n.salah .salah-section-head { margin-bottom: 12px; }\n.salah .salah-settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }\n.salah .salah-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }\n.salah .salah-field > label { font-size: 12px; font-weight: 500; }\n.salah .salah-search { display: flex; gap: 8px; }\n.salah .salah-search input { flex: 1; }\n.salah .salah-results { list-style: none; padding: 0; margin: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; max-height: 270px; overflow: auto; }\n.salah .salah-results li + li { border-top: 1px solid var(--dsw-alias-border-l1); }\n.salah .salah-result { padding: 11px 12px; width: 100%; text-align: start; background: transparent; border: 0; color: inherit; cursor: pointer; display: block; }\n.salah .salah-result:hover { background: var(--dsw-alias-bg-layer-2); }\n.salah .salah-result small { display: block; color: var(--dsw-alias-label-secondary); margin-top: 2px; }\n.salah .salah-error { border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 6px; padding: 12px 14px; color: var(--dsw-alias-state-error-primary); overflow-wrap: anywhere; font-size: 12px; }\n.salah .salah-notice { padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; background: var(--dsw-alias-bg-layer-1); font-size: 12px; }\n.salah .salah-warning { border-color: var(--dsw-alias-state-warn-primary); }\n.salah .salah-empty { padding: 28px; text-align: center; border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px; }\n.salah .salah-empty h2 { margin: 10px 0 6px; }\n.salah .salah-empty p { max-width: 460px; margin: 0 auto; }\n.salah .salah-coordinates { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 12px; }\n.salah .salah-wide { grid-column: 1 / -1; }\n.salah details summary { cursor: pointer; font-size: 12px; color: var(--dsw-alias-label-secondary); }\n.salah details[open] > summary { margin-bottom: 12px; }\n.salah .salah-tomorrow { margin-top: 4px; }\n.salah .salah-footer { border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 16px; display: flex; flex-direction: column; gap: 7px; }\n.salah .salah-help-content { display: flex; flex-direction: column; gap: 10px; }\n.salah a { color: var(--dsw-alias-brand-primary); text-decoration: underline; text-underline-offset: 3px; }\n.salah.salah-dock { display: inline-flex; flex: 0 0 auto; align-items: center; width: max-content; max-width: 100%; height: 20px; padding: 0; margin: 0; line-height: 1; vertical-align: middle; }\n.salah .salah-dock-button.sl-btn { appearance: none; background: transparent; border: 0; border-radius: 4px; color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 400; cursor: pointer; display: inline-flex; align-items: center; flex-wrap: nowrap; justify-content: flex-start; gap: 4px; width: max-content; min-width: 0; height: 20px; min-height: 20px; padding: 0 3px; line-height: 1; white-space: nowrap; }\n.salah .salah-dock-button > svg { flex: 0 0 12px; }\n.salah .salah-dock-warning { color: var(--dsw-alias-state-warn-primary); font-size: 10px; }\n.salah .salah-dock-button:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }\n.salah.salah-floating { position: fixed; z-index: 1; pointer-events: auto; width: 264px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); overflow: auto; border-radius: 10px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); box-shadow: 0 8px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent); }\n.salah .salah-float-head { display: flex; align-items: center; gap: 2px; padding: 5px 6px 5px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); }\n.salah .salah-float-grip { flex: 1; min-width: 0; display: flex; align-items: center; gap: 7px; padding: 4px 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 500; cursor: grab; user-select: none; touch-action: none; border-radius: 4px; }\n.salah .salah-float-grip:active { cursor: grabbing; }\n.salah .salah-float-grip-mark { margin-inline-start: auto; color: var(--dsw-alias-label-secondary); font-size: 17px; }\n.salah .salah-float-action.sl-btn { flex: 0 0 auto; width: 26px; height: 26px; min-height: 26px; padding: 0; font-size: 18px; line-height: 1; }\n.salah .salah-float-body.sl-card-body { padding: 12px 14px 10px; gap: 8px; }\n.salah .salah-float-current { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px 7px; font-size: 12px; }\n.salah .salah-float-current > span { margin-inline-end: auto; font-size: 10px; }\n.salah .salah-float-current strong { font-weight: 600; }\n.salah .salah-float-next { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--dsw-alias-label-secondary); padding-top: 8px; border-top: 1px solid var(--dsw-alias-border-l1); }\n.salah .salah-float-count { font-size: 32px; line-height: 1.1; letter-spacing: -.04em; }\n.salah .salah-float-zone { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-size: 10px; }\n.salah .salah-float-warning { font-size: 10px; line-height: 1.5; color: var(--dsw-alias-state-warn-primary); overflow-wrap: anywhere; }\n.salah .salah-calculation-settings { min-width: 0; margin: 0; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--radius-field); display: flex; flex-direction: column; gap: 12px; }\n.salah .salah-calculation-settings > legend { padding-inline: 5px; font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }\n.salah .salah-review { border-color: var(--dsw-alias-state-warn-primary); }\n.salah .salah-review-step { display: flex; align-items: flex-start; gap: 12px; min-width: 0; cursor: pointer; font-size: 13px; }\n.salah .salah-review-step > input { flex-shrink: 0; margin-top: 3px; }\n.salah .salah-review-step > span { min-width: 0; }\n.salah .salah-review-step small { display: block; margin-top: 3px; }\n.salah .salah-float-provenance { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; font-size: 10px; color: var(--dsw-alias-label-secondary); }\n.salah .salah-float-provenance .sl-badge { font-size: 10px; min-height: 17px; padding: 1px 5px; line-height: 1.4; }\n.salah .salah-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }\n@media (pointer: coarse) { .salah.salah-dock { height: 28px; } .salah .salah-dock-button.sl-btn { height: 28px; min-height: 28px; padding-inline: 5px; } }\n@media (max-width: 800px) { .salah .salah-schedule { grid-template-columns: repeat(3,minmax(0,1fr)); } .salah .salah-settings-grid { grid-template-columns: 1fr; } }\n@media (max-width: 480px) { .salah .salah-page { padding: 20px 16px; gap: 20px; } .salah .salah-hero .sl-card-body { padding: 20px; } .salah .salah-top { flex-wrap: wrap; } .salah .salah-next-name { font-size: 30px; } .salah .salah-prayer-time { font-size: 20px; } .salah .salah-coordinates { grid-template-columns: 1fr; } }\n@media (prefers-reduced-motion: reduce) { .salah *, .salah *::before, .salah *::after { transition-duration: 0s; } }\n";
    /* SALAH_CSS_END */
    const EN = {
      helpDetails: 'Help & details', dockReview: 'Review setup', dockLoading: 'Loading', dockLocating: 'Locating', dockError: 'Retry', dockLocation: 'Choose city', dockExhausted: 'Refresh', dockStale: 'Stale', dockFallback: 'Fallback', geocodingMissingKeyShort: 'Add SALAH_OPEN_METEO_API_KEY on the Host, then refresh.',
      offlineSettings: 'Offline fallback settings', calculationSettings: 'Calculation settings', providerTimetable: 'Provider-controlled timetable',
      reviewTitle: 'Review your prayer-time setup', reviewIntro: 'Review each saved choice, then confirm. Existing preferences are kept; no regional method is selected for you.', reviewNeeds: 'Setup needs review', reviewReady: 'Setup reviewed in this browser', reviewReopen: 'Review setup again', reviewConfirm: 'Confirm reviewed setup', reviewSource: 'I reviewed the prayer-time source', reviewLocation: 'I reviewed the location and time zone', reviewMethod: 'I reviewed the calculation method and Asr convention', reviewFallback: 'I reviewed MyQuran’s timetable and the offline fallback settings', reviewLocal: 'This is a browser-only acknowledgement, not Host authorization. Only a hash of saved settings is stored in this browser; device GPS coordinates are never stored in browser storage.', reviewLocationNeeded: 'Choose a city or explicitly share your device location before confirming.', preview: 'Preview · setup not yet confirmed',
      sourcePublic: 'Online timetable', sourceOffline: 'Intentional offline', fresh: 'Recently fetched', freshnessFailed: 'Refresh failed · previously fetched data', freshnessStale: 'Needs refresh · older data', freshnessExhausted: 'Schedule exhausted · refresh required', freshnessUnknown: 'Fetch time unavailable', freshnessMissing: 'No schedule loaded', fetchedAt: 'Fetched at',
      geocodingProvider: 'City-search provider', 'open-meteo-public': 'Open-Meteo public · non-commercial only', 'open-meteo-commercial': 'Open-Meteo commercial · paid license required', geocodingPublicHelp: 'The public geocoding endpoint is for non-commercial use under Open-Meteo’s terms. City queries go to Open-Meteo; GeoNames supplies the place data.', geocodingCommercialHelp: 'Commercial use requires a paid Open-Meteo license and a key configured on the Host. Selecting this option never switches back to public search automatically.', geocodingMissingKey: 'Commercial search is unavailable: configure SALAH_OPEN_METEO_API_KEY on the Host using its environment or managed credential store, then refresh. Ask your Host administrator if needed. No key is entered in this page.', geocodingKeyReady: 'Host credential is configured; a paid commercial license is still required.', geocodingKeyHelp: 'Set up a commercial key on the Host', geocodingTerms: 'Open-Meteo terms',
      floatingTitle: 'Salah widget', showFloating: 'Show floating widget', hideFloating: 'Hide floating widget', resetFloating: 'Reset widget position', moveFloating: 'Move prayer widget', moveHint: 'Drag to move, or focus and use the arrow keys. Hold Shift to move faster.', currentPrayer: 'Current prayer', currentPrayerHelp: 'Latest scheduled prayer to start, not a ruling on its valid prayer window. Fajr is hidden at sunrise.', betweenPrayers: 'Between prayers', beforeFajr: 'Before Fajr', staleShort: 'Check prayer times', fallbackShort: 'Offline fallback', floatingHelp: 'Appears above Harness panels, not other desktop apps.',
      title: 'Salah', subtitle: 'Prayer times and a live countdown for your location.', prayerTimes: 'Prayer times', nextPrayer: 'Next prayer', beginsIn: 'Begins in', tomorrow: 'Tomorrow', today: 'Today',
      Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha', notPrayer: 'For reference', upcoming: 'Up next', passed: 'Started',
      refresh: 'Refresh', refreshing: 'Refreshing…', loading: 'Loading prayer times…', locating: 'Finding your location…', configure: 'Choose a location', retry: 'Try again',
      source: 'Prayer-time source', aladhan: 'AlAdhan · worldwide', myquran: 'MyQuran · Indonesia', offline: 'Adhan · offline calculation',
      sourceHelp: 'AlAdhan and Adhan support locations worldwide. MyQuran provides Indonesian city schedules.',
      method: 'Calculation method', school: 'Asr convention', standard: 'Standard · Shafi‘i / Maliki / Hanbali', hanafi: 'Hanafi', providerMethod: 'MyQuran sets its own method and Asr convention. These selections apply only if it falls back to Adhan.',
      location: 'Location', currentLocation: 'Current location', manualLocation: 'Choose a city', useCurrent: 'Use current location', selectedLocation: 'Selected location',
      currentHelp: 'Browser location permission is required. Coordinates are sent to the Host for this visit, not saved in plugin preferences. You can also choose a city below.',
      locationDenied: 'Location access was denied. Allow it in your browser or choose a city.', locationUnavailable: 'Your location is unavailable. Try again or choose a city.',
      locationTimeout: 'Finding your location timed out. Try again or choose a city.', locationUnsupported: 'This browser cannot share your location. Choose a city instead.',
      citySearch: 'Search for a city', cityPlaceholder: 'City name, e.g. Jakarta or London', search: 'Search', searching: 'Searching…', noResults: 'No matching cities. Try another spelling or a nearby city.',
      searchHint: 'Select the matching city and country. City search uses Open-Meteo / GeoNames.',
      myquranSearchHint: 'Select the matching Indonesian city or regency. MyQuran provides city listings; Open-Meteo / GeoNames supplies coordinates and time zones.',
      myquranHelp: 'MyQuran needs a city or regency from its Indonesian directory. Search and select one below; GPS coordinates alone are not enough.',
      coordinates: 'Enter coordinates instead', latitude: 'Latitude', longitude: 'Longitude', timezone: 'IANA time zone', label: 'Location name', applyCoordinates: 'Use these coordinates',
      invalidCoordinates: 'Enter a location name, latitude (−90 to 90), longitude (−180 to 180), and an IANA time zone such as Asia/Jakarta.',
      invalidSchedule: 'The prayer schedule is incomplete or invalid. Refresh to try again.',
      timeZoneHint: 'Times and dates use the schedule’s displayed time zone.',
      noLocation: 'Choose a location for prayer times', noLocationHelp: 'Use your browser’s location, search for a city, or enter coordinates. The plugin does not use the Host server’s location.',
      noNext: 'No upcoming prayer is available', noNextHelp: 'Refresh to load the next day’s schedule.',
      fallback: 'Using offline fallback', fallbackHelp: 'The selected online source is unavailable. Adhan calculated these times on the Host using your selected method and Asr convention.',
      stale: 'Refresh failed. Previously loaded times may be out of date. Check the date and source before using them.',
      saved: 'Preferences and manual locations are saved for this Harness profile.', updated: 'Updated', scheduleFor: 'Schedule', settings: 'Source & preferences', back: 'Back to conversation',
      hours: 'hours', minutes: 'minutes', seconds: 'seconds', opensPanel: 'Open Salah prayer times', failed: 'Could not complete the request. Try again.',
      accuracy: 'Calculation methods and local timetables may differ. Check your local mosque’s schedule, especially at high latitudes.',
      privacy: 'Schedule requests send coordinates to AlAdhan or a city ID to MyQuran. Adhan calculates on the Host without prayer-time network requests. City queries go to the selected Open-Meteo provider; MyQuran city search also uses MyQuran’s directory. Device GPS is sent to the Host for this visit, never saved in plugin preferences or browser storage. Commercial credentials stay on the Host.',
      attribution: 'Sources', offlineHint: 'Adhan uses the saved location’s time zone, or the browser time zone for current location.',
      MuslimWorldLeague: 'Muslim World League', Egyptian: 'Egyptian General Authority of Survey', Karachi: 'University of Islamic Sciences, Karachi', UmmAlQura: 'Umm al-Qura, Makkah', Dubai: 'Dubai', MoonsightingCommittee: 'Moonsighting Committee Worldwide', NorthAmerica: 'North America (ISNA)', Kuwait: 'Kuwait', Qatar: 'Qatar', Singapore: 'Singapore', Tehran: 'University of Tehran', Turkey: 'Turkey', Other: 'Other',
    };
    const ID = {
      helpDetails: 'Bantuan & detail', dockReview: 'Tinjau pengaturan', dockLoading: 'Memuat', dockLocating: 'Mencari lokasi', dockError: 'Coba lagi', dockLocation: 'Pilih kota', dockExhausted: 'Muat ulang', dockStale: 'Data lama', dockFallback: 'Cadangan', geocodingMissingKeyShort: 'Tambahkan SALAH_OPEN_METEO_API_KEY di Host, lalu muat ulang.',
      offlineSettings: 'Pengaturan cadangan luring', calculationSettings: 'Pengaturan perhitungan', providerTimetable: 'Jadwal ditetapkan penyedia',
      reviewTitle: 'Tinjau pengaturan jadwal salat', reviewIntro: 'Tinjau setiap pilihan tersimpan, lalu konfirmasikan. Preferensi lama dipertahankan; tidak ada metode wilayah yang dipilih otomatis.', reviewNeeds: 'Pengaturan perlu ditinjau', reviewReady: 'Pengaturan telah ditinjau di peramban ini', reviewReopen: 'Tinjau pengaturan lagi', reviewConfirm: 'Konfirmasi pengaturan yang ditinjau', reviewSource: 'Saya telah meninjau sumber jadwal salat', reviewLocation: 'Saya telah meninjau lokasi dan zona waktu', reviewMethod: 'Saya telah meninjau metode perhitungan dan ketentuan Asar', reviewFallback: 'Saya telah meninjau jadwal MyQuran dan pengaturan cadangan luring', reviewLocal: 'Ini hanya tanda peninjauan di peramban, bukan otorisasi Host. Hanya hash pengaturan tersimpan yang disimpan di peramban; koordinat GPS perangkat tidak pernah disimpan di penyimpanan peramban.', reviewLocationNeeded: 'Pilih kota atau bagikan lokasi perangkat secara eksplisit sebelum mengonfirmasi.', preview: 'Pratinjau · pengaturan belum dikonfirmasi',
      sourcePublic: 'Jadwal daring', sourceOffline: 'Luring pilihan Anda', fresh: 'Baru diambil', freshnessFailed: 'Gagal memuat ulang · data lama', freshnessStale: 'Perlu dimuat ulang · data lama', freshnessExhausted: 'Jadwal habis · wajib dimuat ulang', freshnessUnknown: 'Waktu pengambilan tidak tersedia', freshnessMissing: 'Belum ada jadwal', fetchedAt: 'Diambil pada',
      geocodingProvider: 'Penyedia pencarian kota', 'open-meteo-public': 'Open-Meteo publik · hanya nonkomersial', 'open-meteo-commercial': 'Open-Meteo komersial · wajib lisensi berbayar', geocodingPublicHelp: 'Endpoint geokode publik hanya untuk penggunaan nonkomersial sesuai ketentuan Open-Meteo. Kueri kota dikirim ke Open-Meteo; data tempat berasal dari GeoNames.', geocodingCommercialHelp: 'Penggunaan komersial memerlukan lisensi Open-Meteo berbayar dan kunci yang dikonfigurasi di Host. Pilihan ini tidak pernah beralih otomatis ke pencarian publik.', geocodingMissingKey: 'Pencarian komersial belum tersedia: atur SALAH_OPEN_METEO_API_KEY di Host melalui variabel lingkungan atau penyimpanan kredensial terkelola, lalu muat ulang. Hubungi administrator Host bila perlu. Kunci tidak dimasukkan di halaman ini.', geocodingKeyReady: 'Kredensial Host telah dikonfigurasi; lisensi komersial berbayar tetap diperlukan.', geocodingKeyHelp: 'Siapkan kunci komersial di Host', geocodingTerms: 'Ketentuan Open-Meteo',
      floatingTitle: 'Widget Salah', showFloating: 'Tampilkan widget mengambang', hideFloating: 'Sembunyikan widget', resetFloating: 'Atur ulang posisi widget', moveFloating: 'Pindahkan widget salat', moveHint: 'Seret untuk memindahkan, atau fokuskan lalu gunakan tombol panah. Tahan Shift agar bergerak lebih cepat.', currentPrayer: 'Salat saat ini', currentPrayerHelp: 'Salat terakhir yang sudah dimulai menurut jadwal, bukan penentu batas waktu sah salat. Subuh tidak ditampilkan sejak matahari terbit.', betweenPrayers: 'Di antara waktu salat', beforeFajr: 'Sebelum Subuh', staleShort: 'Periksa jadwal salat', fallbackShort: 'Cadangan luring', floatingHelp: 'Tampil di atas panel Harness, bukan aplikasi desktop lain.',
      title: 'Salah', subtitle: 'Jadwal salat dan hitung mundur untuk lokasi Anda.', prayerTimes: 'Waktu salat', nextPrayer: 'Salat berikutnya', beginsIn: 'Dimulai dalam', tomorrow: 'Besok', today: 'Hari ini',
      Fajr: 'Subuh', Sunrise: 'Terbit', Dhuhr: 'Zuhur', Asr: 'Asar', Maghrib: 'Magrib', Isha: 'Isya', notPrayer: 'Sebagai acuan', upcoming: 'Berikutnya', passed: 'Sudah dimulai',
      refresh: 'Muat ulang', refreshing: 'Memuat ulang…', loading: 'Memuat jadwal salat…', locating: 'Mencari lokasi Anda…', configure: 'Pilih lokasi', retry: 'Coba lagi',
      source: 'Sumber jadwal salat', aladhan: 'AlAdhan · seluruh dunia', myquran: 'MyQuran · Indonesia', offline: 'Adhan · perhitungan luring',
      sourceHelp: 'AlAdhan dan Adhan mendukung lokasi di seluruh dunia. MyQuran menyediakan jadwal kota di Indonesia.',
      method: 'Metode perhitungan', school: 'Ketentuan Asar', standard: 'Standar · Syafi‘i / Maliki / Hanbali', hanafi: 'Hanafi', providerMethod: 'MyQuran menetapkan metode dan ketentuan Asarnya sendiri. Pilihan ini hanya digunakan jika jadwal beralih ke perhitungan cadangan Adhan.',
      location: 'Lokasi', currentLocation: 'Lokasi saat ini', manualLocation: 'Pilih kota', useCurrent: 'Gunakan lokasi saat ini', selectedLocation: 'Lokasi terpilih',
      currentHelp: 'Memerlukan izin lokasi peramban. Koordinat dikirim ke Host untuk kunjungan ini, tanpa disimpan dalam preferensi plugin. Anda juga dapat memilih kota di bawah.',
      locationDenied: 'Izin lokasi ditolak. Izinkan di peramban atau pilih kota.', locationUnavailable: 'Lokasi tidak tersedia. Coba lagi atau pilih kota.', locationTimeout: 'Pencarian lokasi melewati batas waktu. Coba lagi atau pilih kota.', locationUnsupported: 'Peramban ini tidak dapat membagikan lokasi Anda. Pilih kota.',
      citySearch: 'Cari kota', cityPlaceholder: 'Nama kota, misalnya Jakarta atau London', search: 'Cari', searching: 'Mencari…', noResults: 'Kota tidak ditemukan. Coba ejaan lain atau kota terdekat.',
      searchHint: 'Pilih kota dan negara yang sesuai. Pencarian kota menggunakan Open-Meteo / GeoNames.',
      myquranSearchHint: 'Pilih kota atau kabupaten di Indonesia yang sesuai. Daftar kota berasal dari MyQuran; koordinat dan zona waktu dari Open-Meteo / GeoNames.',
      myquranHelp: 'MyQuran memerlukan kota atau kabupaten dari daftar wilayah Indonesia. Cari dan pilih di bawah; koordinat GPS saja tidak cukup.',
      coordinates: 'Masukkan koordinat', latitude: 'Lintang', longitude: 'Bujur', timezone: 'Zona waktu IANA', label: 'Nama lokasi', applyCoordinates: 'Gunakan koordinat ini',
      invalidCoordinates: 'Masukkan nama lokasi, lintang (−90 hingga 90), bujur (−180 hingga 180), dan zona waktu IANA seperti Asia/Jakarta.',
      invalidSchedule: 'Jadwal salat tidak lengkap atau tidak valid. Muat ulang untuk mencoba lagi.',
      timeZoneHint: 'Waktu dan tanggal mengikuti zona waktu yang ditampilkan pada jadwal.',
      noLocation: 'Pilih lokasi untuk jadwal salat', noLocationHelp: 'Gunakan lokasi peramban, cari kota, atau masukkan koordinat. Plugin tidak menggunakan lokasi server Host.',
      noNext: 'Jadwal salat berikutnya tidak tersedia', noNextHelp: 'Muat ulang untuk mengambil jadwal hari berikutnya.', fallback: 'Menggunakan cadangan luring', fallbackHelp: 'Sumber daring yang dipilih tidak tersedia. Adhan menghitung jadwal ini di Host dengan metode dan ketentuan Asar pilihan Anda.',
      stale: 'Gagal memuat ulang. Jadwal sebelumnya mungkin sudah tidak mutakhir. Periksa tanggal dan sumber sebelum digunakan.',
      saved: 'Preferensi dan lokasi manual disimpan untuk profil Harness ini.', updated: 'Diperbarui', scheduleFor: 'Jadwal', settings: 'Sumber & preferensi', back: 'Kembali ke percakapan',
      hours: 'jam', minutes: 'menit', seconds: 'detik', opensPanel: 'Buka jadwal salat Salah', failed: 'Permintaan tidak dapat diselesaikan. Coba lagi.',
      accuracy: 'Metode perhitungan dan jadwal setempat dapat berbeda. Periksa jadwal masjid setempat, terutama di lintang tinggi.',
      privacy: 'Permintaan jadwal mengirim koordinat ke AlAdhan atau ID kota ke MyQuran. Adhan menghitung di Host tanpa permintaan jaringan jadwal salat. Kueri kota dikirim ke penyedia Open-Meteo terpilih; pencarian kota MyQuran juga memakai direktori MyQuran. GPS perangkat dikirim ke Host untuk kunjungan ini, tanpa disimpan dalam preferensi plugin atau penyimpanan peramban. Kredensial komersial tetap di Host.',
      attribution: 'Sumber', offlineHint: 'Adhan memakai zona waktu lokasi tersimpan, atau zona waktu peramban untuk lokasi saat ini.',
      MuslimWorldLeague: 'Liga Muslim Dunia', Egyptian: 'Otoritas Survei Umum Mesir', Karachi: 'Universitas Ilmu Islam, Karachi', UmmAlQura: 'Umm al-Qura, Makkah', Dubai: 'Dubai', MoonsightingCommittee: 'Moonsighting Committee Worldwide', NorthAmerica: 'Amerika Utara (ISNA)', Kuwait: 'Kuwait', Qatar: 'Qatar', Singapore: 'Singapura', Tehran: 'Universitas Teheran', Turkey: 'Turki', Other: 'Lainnya',
    };
    const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    function Icon({ size = 20, active = false }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: active ? 1.9 : 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M17 3a4 4 0 1 0 4 5 4 4 0 0 1-4-5ZM4 21v-7c0-3 4-4 7-8 3 4 7 5 7 8v7M2 21h18M9 21v-6a2 2 0 0 1 4 0v6' }));
    }
    function getNext(schedule, now) {
      if (!schedule) return null;
      const prayers = schedule.days.flatMap(day => day.prayers.map(prayer => ({ ...prayer, date: day.date })));
      if (schedule.precedingPrayer) prayers.unshift(schedule.precedingPrayer);
      return prayers.filter(prayer => prayer.name !== 'Sunrise' && prayer.time > now).sort((a, b) => a.time - b.time)[0] || null;
    }
    // Current means latest prayer whose start has passed, not a ruling on its
    // jurisprudential end time. Sunrise explicitly ends the Fajr display.
    function getCurrent(schedule, now) {
      if (!schedule || !getNext(schedule, now)) return null;
      const events = schedule.days.flatMap(day => day.prayers.map(prayer => ({ ...prayer, date: day.date })));
      if (schedule.previousPrayer) events.unshift(schedule.previousPrayer);
      if (schedule.precedingPrayer) events.unshift(schedule.precedingPrayer);
      const latest = events.filter(prayer => prayer.time <= now).sort((a, b) => b.time - a.time || (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))[0];
      return latest && latest.name !== 'Sunrise' ? latest : null;
    }
    function clampFloating(position, viewport, size = { width: 264, height: 196 }) {
      const width = Math.max(0, Number.isFinite(viewport.width) ? viewport.width : 0);
      const height = Math.max(0, Number.isFinite(viewport.height) ? viewport.height : 0);
      const padding = Math.min(12, width / 2, height / 2);
      const xMax = Math.max(padding, width - Math.max(0, size.width) - padding);
      const yMax = Math.max(padding, height - Math.max(0, size.height) - padding);
      return {
        x: Math.min(xMax, Math.max(padding, Number.isFinite(position?.x) ? position.x : width - size.width - 24)),
        y: Math.min(yMax, Math.max(padding, Number.isFinite(position?.y) ? position.y : 88)),
      };
    }
    function civilDate(time, timezone) {
      const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(time)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    }
    function countdown(time, now) {
      const seconds = Math.max(0, Math.ceil((time - now) / 1000));
      return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
    }
    function compactCountdown(time, now) {
      const [hours, minutes, seconds] = countdown(time, now).split(':');
      return Number(hours) ? `${Number(hours)}:${minutes}:${seconds}` : `${Number(minutes)}:${seconds}`;
    }
    function validSchedule(value, message = 'Invalid prayer schedule.') {
      if (!value || typeof value.timezone !== 'string' || !Array.isArray(value.days) || value.days.length !== 2) throw new Error(message);
      try { new Intl.DateTimeFormat('en', { timeZone: value.timezone }); }
      catch { throw new Error(message); }
      for (const day of value.days) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Array.isArray(day.prayers) || day.prayers.length !== 6) throw new Error(message);
        for (let index = 0; index < PRAYERS.length; index++) if (day.prayers[index].name !== PRAYERS[index] || !Number.isFinite(day.prayers[index].time)) throw new Error(message);
      }
      for (const key of ['precedingPrayer', 'previousPrayer']) {
        const prayer = value[key];
        if (prayer != null && ((key === 'precedingPrayer' ? prayer.name !== 'Isha' : !PRAYERS.includes(prayer.name) || prayer.name === 'Sunrise') || !Number.isFinite(prayer.time) || !/^\d{4}-\d{2}-\d{2}$/.test(prayer.date))) throw new Error(message);
      }
      return value;
    }
    function clientMetadata(value, message = 'Invalid Salah metadata.') {
      const geo = value?.geocoding;
      const ids = ['open-meteo-public', 'open-meteo-commercial'];
      if (!value?.settings || !Array.isArray(value.sources) || !Array.isArray(value.methods) || !geo || !Array.isArray(geo.providers) || !geo.providers.length || !ids.includes(geo.provider) || typeof geo.keyConfigured !== 'boolean' || geo.credentialRef !== 'SALAH_OPEN_METEO_API_KEY') throw new Error(message);
      if (geo.providers.some(item => !ids.includes(item.id) || typeof item.label !== 'string' || typeof item.description !== 'string' || typeof item.requiresKey !== 'boolean') || new Set(geo.providers.map(item => item.id)).size !== geo.providers.length || !geo.providers.some(item => item.id === geo.provider) || (value.settings.geocodingProvider != null && value.settings.geocodingProvider !== geo.provider)) throw new Error(message);
      return { settings: value.settings, sources: value.sources, methods: value.methods, geocoding: { providers: geo.providers.map(({ id, label, description, requiresKey }) => ({ id, label, description, requiresKey })), provider: geo.provider, keyConfigured: geo.keyConfigured, credentialRef: geo.credentialRef } };
    }
    function widgetStatus(schedule, now, refreshFailed = false) {
      if (!schedule) return { sourceKind: null, freshness: 'missing' };
      const sourceKind = schedule.actualSource === 'offline' ? (schedule.fallbackReason ? 'fallback' : 'intentional-offline') : 'public';
      const freshness = !getNext(schedule, now) ? 'exhausted' : refreshFailed ? 'refresh-failed' : !Number.isFinite(schedule.fetchedAt) || schedule.fetchedAt > now + 60000 ? 'unknown' : now - schedule.fetchedAt >= 1800000 || schedule.days[0].date !== civilDate(now, schedule.timezone) ? 'stale' : 'fresh';
      return { sourceKind, freshness };
    }
    function dockState(model) {
      const status = widgetStatus(model.schedule, model.now, model.refreshFailed || !!model.error);
      const next = getNext(model.schedule, model.now);
      const kind = model.error || model.geoError ? 'error' : model.locating ? 'locating' : !model.reviewed ? (model.busy && !model.settings ? 'loading' : 'review') : next ? 'countdown' : model.busy ? 'loading' : model.schedule ? 'exhausted' : 'location';
      const warnings = [];
      if (!['fresh', 'missing'].includes(status.freshness) && kind !== 'exhausted') warnings.push('stale');
      if (status.sourceKind === 'fallback') warnings.push('fallback');
      return { ...status, kind, next: kind === 'countdown' ? next : null, warnings };
    }
    // Browser acknowledgement only, never Host authority. Only persisted settings
    // enter this projection; current-device GPS is never fingerprinted or stored.
    function reviewSettings(settings) {
      const location = settings?.locationMode === 'manual' ? settings.location : null;
      return {
        source: settings?.source, method: settings?.method, school: settings?.school,
        locationMode: settings?.locationMode, geocodingProvider: settings?.geocodingProvider || 'open-meteo-public',
        location: location ? { label: location.label, latitude: location.latitude, longitude: location.longitude, timezone: location.timezone, myquranId: location.myquranId } : null,
      };
    }
    function canConfirmReview(model, checked, hasLocation) {
      return !!(model.settings && !model.busy && !model.locating && hasLocation && checked.source && checked.location && checked.method && model.sources.some(item => item.id === model.settings.source) && model.methods.some(item => item.id === model.settings.method) && ['standard', 'hanafi'].includes(model.settings.school));
    }
    function reconcileReview(previous, settings) {
      const reviewIdentity = JSON.stringify(reviewSettings(settings));
      return previous.reviewIdentity === reviewIdentity ? previous : { reviewIdentity, reviewed: false, reviewOpen: true };
    }
    async function reviewFingerprint(settings) {
      const bytes = new TextEncoder().encode(JSON.stringify(reviewSettings(settings)));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    }
    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.locale.register('salah', 'en', EN);
        ctx.locale.register('salah', 'id', ID);
        const t = ctx.locale.bind('salah');
        const viewKey = 'dsh.salah.floating.v1';
        const floatingToggleRef = { current: null }, dockRef = { current: null };
        let view = { visible: true, position: null };
        try {
          const saved = JSON.parse(window.localStorage.getItem(viewKey) || 'null');
          if (saved && typeof saved.visible === 'boolean') view.visible = saved.visible;
          if (Number.isFinite(saved?.position?.x) && Number.isFinite(saved?.position?.y)) view.position = { x: saved.position.x, y: saved.position.y };
        } catch { /* Browser storage is optional; view controls still work. */ }
        const reviewKey = 'dsh.salah.review.v1';
        let savedReviewHash = '';
        try { const saved = window.localStorage.getItem(reviewKey); if (/^[a-f0-9]{64}$/.test(saved || '')) savedReviewHash = saved; } catch { /* Acknowledgement can remain in memory. */ }
        let state = { settings: null, sources: [], methods: [], geocoding: null, schedule: null, busy: true, locating: false, hasDeviceLocation: false, error: '', refreshFailed: false, geoError: '', now: Date.now(), floatingVisible: view.visible, floatingPosition: view.position, reviewIdentity: null, reviewed: false, reviewOpen: true, reviewEpoch: 0 };
        let alive = true, gps = null, operation = 0, geoGeneration = 0, reviewGeneration = 0, lastAttempt = 0;
        const listeners = new Set(), requests = new Set();
        const emit = patch => { if (!alive) return; state = { ...state, ...patch }; for (const listener of listeners) listener(); };
        const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
        function setFloating(visible, position = state.floatingPosition, persist = true) {
          emit({ floatingVisible: visible, floatingPosition: position });
          if (persist) try { window.localStorage.setItem(viewKey, JSON.stringify({ visible, position })); } catch { /* Optional browser-only view preference. */ }
        }
        const errorText = error => String(error?.message || t('failed'));
        async function api(args, outerSignal) {
          const controller = new AbortController(); requests.add(controller);
          const abort = () => controller.abort();
          if (outerSignal?.aborted) controller.abort(); else outerSignal?.addEventListener('abort', abort, { once: true });
          const timeout = setTimeout(abort, 45000);
          try {
            const response = await fetch('/api/salah', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(args), signal: controller.signal });
            const data = await response.json();
            if (!response.ok || !data.ok) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || t('failed'));
            return data.value;
          } finally { clearTimeout(timeout); outerSignal?.removeEventListener('abort', abort); requests.delete(controller); }
        }
        const metadata = value => clientMetadata(value, t('failed'));
        function forgetReview() {
          savedReviewHash = ''; reviewGeneration++;
          try { window.localStorage.removeItem(reviewKey); } catch { /* Browser storage is optional. */ }
          emit({ reviewed: false, reviewOpen: true, reviewEpoch: state.reviewEpoch + 1 });
        }
        function observeMetadata(snapshot) {
          if (snapshot.settings.locationMode !== 'current' || snapshot.settings.source === 'myquran') {
            gps = null; geoGeneration++;
            emit({ hasDeviceLocation: false, locating: false });
          }
          const next = reconcileReview({ reviewIdentity: state.reviewIdentity, reviewed: state.reviewed, reviewOpen: state.reviewOpen }, snapshot.settings);
          const changed = next.reviewIdentity !== state.reviewIdentity;
          if (changed && state.reviewIdentity !== null) forgetReview();
          emit({ ...snapshot, ...next });
          if (changed) {
            const generation = ++reviewGeneration;
            // Async restoration must not undo a later edit, reopen, or disposal.
            void reviewFingerprint(snapshot.settings).then(hash => {
              if (alive && generation === reviewGeneration && state.reviewIdentity === next.reviewIdentity && savedReviewHash === hash) emit({ reviewed: true, reviewOpen: false });
            }).catch(() => { /* Without WebCrypto, review still works for this visit. */ });
          }
        }
        async function confirmReview(identity, checked) {
          const location = state.settings?.locationMode === 'manual' ? state.settings.location : gps;
          const hasLocation = !!location && (state.settings?.source !== 'myquran' || !!location.myquranId);
          if (!alive || identity !== state.reviewIdentity || !canConfirmReview(state, checked, hasLocation)) return;
          const generation = ++reviewGeneration, settings = state.settings;
          // Re-read shared preferences before acknowledging the displayed choices.
          const id = ++operation;
          emit({ busy: true, error: '' });
          try {
            const snapshot = metadata(await api({ action: 'status' }));
            if (!alive || id !== operation || generation !== reviewGeneration) return;
            observeMetadata(snapshot);
            if (state.reviewIdentity !== identity) { emit({ busy: false, schedule: null }); void refresh(); return; }
            if (!canConfirmReview({ ...state, busy: false }, checked, hasLocation)) { emit({ busy: false }); return; }
            let hash = '';
            try { hash = await reviewFingerprint(settings); } catch { /* Memory-only acknowledgement is sufficient. */ }
            if (!alive || id !== operation || generation !== reviewGeneration || state.reviewIdentity !== identity) return;
            savedReviewHash = hash;
            if (hash) try { window.localStorage.setItem(reviewKey, hash); } catch { /* Optional acknowledgement persistence. */ }
            emit({ busy: false, reviewed: true, reviewOpen: false });
          } catch (error) { if (alive && id === operation) emit({ busy: false, error: errorText(error) }); }
        }
        async function refresh() {
          if (!alive || !state.settings) return;
          const id = ++operation;
          lastAttempt = Date.now();
          emit({ busy: true, error: '' });
          try {
            // Other tabs and the agent share these preferences. Read them before
            // deciding whether a transient browser GPS fix may be sent.
            const snapshot = metadata(await api({ action: 'status' }));
            if (!alive || id !== operation) return;
            const changed = JSON.stringify(snapshot) !== JSON.stringify({ settings: state.settings, sources: state.sources, methods: state.methods, geocoding: state.geocoding });
            observeMetadata(snapshot);
            emit({ ...(changed ? { schedule: null } : {}), locating: false, hasDeviceLocation: !!gps });
            const value = await api({ action: 'times', ...(snapshot.settings.locationMode === 'current' && gps ? { location: gps } : {}) });
            if (!alive || id !== operation) return;
            const latest = metadata(value), schedule = value.schedule ? validSchedule(value.schedule, t('invalidSchedule')) : null;
            observeMetadata(latest);
            emit({ schedule, busy: false, refreshFailed: false, now: Date.now() });
          } catch (error) { if (alive && id === operation) emit({ busy: false, refreshFailed: true, error: errorText(error) }); }
        }
        async function configure(patch, { reload = true } = {}) {
          const id = ++operation;
          forgetReview();
          emit({ busy: true, error: '', schedule: null });
          try {
            const value = await api({ action: 'configure', patch });
            if (!alive || id !== operation) return false;
            observeMetadata(metadata(value));
            emit({ busy: false });
            if (reload) await refresh();
            return true;
          } catch (error) { if (alive && id === operation) emit({ busy: false, error: errorText(error) }); return false; }
        }
        async function locate(changeMode = true) {
          const generation = ++geoGeneration;
          gps = null; emit({ hasDeviceLocation: false });
          if (changeMode && !await configure({ locationMode: 'current', location: null }, { reload: false })) return;
          if (!alive || generation !== geoGeneration || state.settings?.locationMode !== 'current') return;
          if (!navigator.geolocation) { emit({ geoError: 'locationUnsupported', locating: false }); return; }
          emit({ locating: true, geoError: '', schedule: null });
          try {
            navigator.geolocation.getCurrentPosition(position => {
              if (!alive || generation !== geoGeneration) return;
              if (state.settings?.locationMode !== 'current') { emit({ locating: false }); return; }
              gps = { label: t('currentLocation'), latitude: position.coords.latitude, longitude: position.coords.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
              forgetReview(); emit({ locating: false, geoError: '', hasDeviceLocation: true }); void refresh();
            }, error => {
              if (alive && generation === geoGeneration) emit({ locating: false, geoError: error.code === 1 ? 'locationDenied' : error.code === 3 ? 'locationTimeout' : 'locationUnavailable' });
            }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
          } catch { emit({ locating: false, geoError: 'locationUnavailable' }); }
        }
        async function selectLocation(location) {
          gps = null; geoGeneration++; emit({ locating: false, geoError: '', hasDeviceLocation: false });
          await configure({ locationMode: 'manual', location });
        }
        async function boot() {
          try {
            const value = await api({ action: 'status' });
            if (!alive) return;
            observeMetadata(metadata(value));
            emit({ busy: false });
            // Device permission is requested only by the explicit browser button.
            await refresh();
          } catch (error) { emit({ busy: false, error: errorText(error) }); }
        }
        ctx.effect(() => {
          alive = true; void boot();
          const timer = setInterval(() => {
            const now = Date.now(); emit({ now });
            if (!state.settings || state.busy || state.locating || now - lastAttempt < 60000) return;
            const schedule = state.schedule;
            const today = schedule && civilDate(now, schedule.timezone);
            if (!schedule || schedule.days[0].date !== today || now - lastAttempt >= 1800000) void refresh();
          }, 1000);
          const onFocus = () => { if (alive && state.settings && !state.busy && !state.locating) void refresh(); };
          window.addEventListener('focus', onFocus);
          return () => { alive = false; operation++; geoGeneration++; reviewGeneration++; clearInterval(timer); window.removeEventListener('focus', onFocus); for (const request of requests) request.abort(); listeners.clear(); gps = null; };
        });
        function useModel() { return useSyncExternalStore(subscribe, () => state); }
        function useLocale() { return useSyncExternalStore(fn => ctx.locale.subscribe(fn), () => ctx.locale.getSnapshot()); }
        const sourceLabel = source => Object.hasOwn(EN, source) ? t(source) : source;
        const methodLabel = method => Object.hasOwn(EN, method.id) ? t(method.id) : method.label;
        const formatTime = (time, timezone) => new Intl.DateTimeFormat(ctx.locale.getLocale().active, { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(time));
        const formatDate = (date, timezone) => {
          const [year, month, day] = date.split('-').map(Number);
          return new Intl.DateTimeFormat(ctx.locale.getLocale().active, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day, 12)));
        };
        const formatFetched = (time, timezone) => new Intl.DateTimeFormat(ctx.locale.getLocale().active, { timeZone: timezone, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(time));
        function Provenance({ model }) {
          const schedule = model.schedule, status = widgetStatus(schedule, model.now, model.refreshFailed || !!model.error);
          if (!schedule) return null;
          const freshness = t(({ fresh: 'fresh', 'refresh-failed': 'freshnessFailed', stale: 'freshnessStale', exhausted: 'freshnessExhausted', unknown: 'freshnessUnknown' })[status.freshness]);
          const source = `${({ aladhan: 'AlAdhan', myquran: 'MyQuran', offline: 'Adhan' })[schedule.actualSource] || schedule.actualSource} · ${t(status.sourceKind === 'fallback' ? 'fallbackShort' : status.sourceKind === 'intentional-offline' ? 'sourceOffline' : 'sourcePublic')}`;
          const fetched = Number.isFinite(schedule.fetchedAt) ? `${t('fetchedAt')}: ${formatFetched(schedule.fetchedAt, schedule.timezone)} · ${schedule.timezone}` : `${t('freshnessUnknown')} · ${schedule.timezone}`;
          const description = `${source}. ${freshness}. ${fetched}${model.error ? `. ${t('freshnessFailed')}` : ''}`;
          return h('p', { className: 'salah-float-provenance', 'data-testid': 'salah-widget-provenance', 'data-source-kind': status.sourceKind, 'data-freshness': status.freshness, title: description, 'aria-label': description, tabIndex: 0 }, h('span', { className: 'sl-badge sl-badge-sm sl-badge-outline' }, source), status.freshness !== 'fresh' && h('span', { className: 'salah-float-warning' }, freshness));
        }
        const button = (text, onClick, disabled = false, extra = {}) => h('button', { type: 'button', className: 'sl-btn sl-btn-sm', onClick, disabled, ...extra }, text);
        const badge = text => h('span', { className: 'sl-badge sl-badge-sm sl-badge-outline' }, text);
        function PrayerGrid({ day, schedule, next, now }) {
          return h('div', { className: 'salah-schedule' }, day.prayers.map(prayer => h('div', { className: 'salah-prayer', key: prayer.name, 'data-next': prayer.time === next?.time, 'aria-label': `${t(prayer.name)} ${formatTime(prayer.time, schedule.timezone)}` },
            h('p', { className: 'salah-prayer-name' }, t(prayer.name)),
            h('time', { className: 'salah-prayer-time salah-digits', dateTime: new Date(prayer.time).toISOString() }, formatTime(prayer.time, schedule.timezone)),
            h('p', { className: 'salah-prayer-note' }, prayer.name === 'Sunrise' ? t('notPrayer') : prayer.time === next?.time ? t('upcoming') : prayer.time < now ? t('passed') : '\u00a0'))));
        }
        function Review({ model }) {
          const [checked, setChecked] = useState({ source: false, location: false, method: false });
          const source = model.settings.source, location = model.settings.locationMode === 'manual' ? model.settings.location : gps;
          const hasLocation = !!location && (source !== 'myquran' || !!location.myquranId);
          const disabled = model.busy || model.locating;
          const method = `${t(source === 'myquran' ? 'offlineSettings' : 'calculationSettings')}: ${methodLabel({ id: model.settings.method, label: model.settings.method })} · ${t(model.settings.school)}`;
          const step = (name, label, detail) => h('label', { className: 'salah-review-step' }, h('input', { type: 'checkbox', className: 'sl-checkbox sl-checkbox-sm', 'data-testid': `salah-review-${name}`, checked: checked[name], disabled, onChange: event => setChecked(previous => ({ ...previous, [name]: event.target.checked })) }), h('span', null, h('span', null, t(label)), h('small', { className: 'salah-hint' }, detail)));
          return h('section', { className: 'sl-card sl-card-border salah-review', 'data-testid': 'salah-review', 'aria-label': t('reviewTitle') }, h('div', { className: 'sl-card-body' },
            h('h2', { className: 'sl-card-title', title: t('reviewIntro') }, t('reviewTitle')),
            step('source', 'reviewSource', `${sourceLabel(source)} · ${t(model.geocoding.provider)}`),
            step('location', 'reviewLocation', location ? `${location.label} · ${location.timezone} · ${Number(location.latitude).toFixed(3)}, ${Number(location.longitude).toFixed(3)}` : t('reviewLocationNeeded')),
            step('method', source === 'myquran' ? 'reviewFallback' : 'reviewMethod', method),
            location && !hasLocation && h('p', { className: 'salah-hint' }, t('reviewLocationNeeded')),
            button(t('reviewConfirm'), () => void confirmReview(model.reviewIdentity, checked), !canConfirmReview(model, checked, hasLocation), { 'data-testid': 'salah-review-confirm' })));
        }
        function App() {
          const model = useModel(); useLocale();
          const uid = useId();
          const [query, setQuery] = useState(''), [results, setResults] = useState(null), [searching, setSearching] = useState(false), [searchError, setSearchError] = useState('');
          const [coords, setCoords] = useState({ label: '', latitude: '', longitude: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
          const searchController = useRef(null), resultsRef = useRef(null), searchInput = useRef(null);
          const source = model.settings?.source || 'aladhan';
          const geocodingProvider = model.geocoding?.provider;
          const missingGeocodingKey = model.geocoding?.providers.find(item => item.id === geocodingProvider)?.requiresKey && !model.geocoding.keyConfigured;
          useEffect(() => { searchController.current?.abort(); setResults(null); setSearching(false); setSearchError(''); }, [source, geocodingProvider, model.geocoding?.keyConfigured, model.reviewIdentity]);
          useEffect(() => () => searchController.current?.abort(), []);
          const schedule = model.schedule, next = getNext(schedule, model.now), disabled = model.busy || model.locating;
          const currentDate = schedule && civilDate(model.now, schedule.timezone);
          const displayDay = schedule && (schedule.days.find(day => day.date === currentDate) || schedule.days[0]);
          const followingDay = schedule && schedule.days.find(day => day.date > displayDay.date);
          async function search(event) {
            event.preventDefault(); searchController.current?.abort();
            if (missingGeocodingKey) { setSearchError(t('geocodingMissingKey')); return; }
            const controller = new AbortController(); searchController.current = controller;
            const identity = state.reviewIdentity, geocodingSnapshot = JSON.stringify(state.geocoding);
            setSearching(true); setResults(null); setSearchError('');
            try {
              const value = await api({ action: 'search', query: query.trim(), source }, controller.signal);
              if (controller.signal.aborted || identity !== state.reviewIdentity || geocodingSnapshot !== JSON.stringify(state.geocoding)) return;
              if (!Array.isArray(value.results)) throw new Error(t('failed'));
              setResults(value.results); setTimeout(() => { if (!controller.signal.aborted) resultsRef.current?.focus(); }, 0);
            } catch (error) { if (!controller.signal.aborted) setSearchError(errorText(error)); }
            finally { if (!controller.signal.aborted) setSearching(false); }
          }
          function applyCoords(event) {
            event.preventDefault(); setSearchError('');
            const latitude = Number(coords.latitude), longitude = Number(coords.longitude);
            try {
              if (!coords.label.trim() || !coords.latitude.trim() || !coords.longitude.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !coords.timezone.trim()) throw new Error();
              new Intl.DateTimeFormat('en', { timeZone: coords.timezone.trim() });
              void selectLocation({ label: coords.label.trim(), latitude, longitude, timezone: coords.timezone.trim() });
            } catch { setSearchError(t('invalidCoordinates')); }
          }
          function field(name, element) { return h('div', { className: 'salah-field' }, h('label', { htmlFor: `${uid}-${name}` }, t(name)), element); }
          function changeSource(event) {
            searchController.current?.abort(); setResults(null); setSearching(false); setSearchError('');
            void configure({ source: event.target.value });
          }
          return h('section', { className: 'salah salah-panel', 'aria-label': t('prayerTimes') }, h('style', null, CSS),
            h('div', { className: 'salah-page' },
              h('header', { className: 'salah-top' },
                h('div', { className: 'salah-brand' }, h(Icon, { size: 30 }), h('h1', null, t('title'))),
                h('div', { className: 'salah-row' }, button(t('back'), () => ctx.layout.selectPanel(null), false, { className: 'sl-btn sl-btn-sm sl-btn-ghost' }), button(t(model.floatingVisible ? 'hideFloating' : 'showFloating'), () => setFloating(!model.floatingVisible), false, { ref: floatingToggleRef, 'aria-pressed': model.floatingVisible, title: t('floatingHelp') }), model.floatingVisible && button(t('resetFloating'), () => setFloating(true, null)), model.settings && !model.reviewOpen && button(t('reviewReopen'), forgetReview, disabled, { 'data-testid': 'salah-review-reopen', title: t('reviewReady'), className: 'sl-btn sl-btn-sm sl-btn-ghost' }), button(t(model.busy ? 'refreshing' : 'refresh'), () => model.settings ? void refresh() : void boot(), disabled))),
              model.error && h('div', { className: 'salah-error', role: 'alert' }, schedule && h('p', null, t('stale')), h('p', null, model.error)),
              model.settings && model.reviewOpen && h(Review, { key: `${model.reviewIdentity}:${model.reviewEpoch}`, model }),
              model.geoError && h('div', { className: 'salah-notice salah-warning', role: 'status' }, t(model.geoError)),
              (model.busy || model.locating) && h('p', { className: 'salah-hint', role: 'status' }, t(model.locating ? 'locating' : 'loading')),
              schedule ? h(React.Fragment, null,
                !model.reviewed && h('p', { className: 'salah-notice salah-warning', role: 'status' }, t('preview')),
                schedule.fallbackReason && h('div', { className: 'salah-notice salah-warning', role: 'status' }, h('strong', null, t('fallback')), h('p', null, t('fallbackHelp')), h('p', { className: 'salah-hint' }, `${t('method')}: ${methodLabel({ id: schedule.method })} · ${t('school')}: ${t(schedule.school)}`)),
                h('section', { className: 'sl-card sl-card-border salah-hero', 'aria-label': t('nextPrayer') }, h('div', { className: 'sl-card-body' },
                  h('div', { className: 'salah-row salah-between' }, h('p', { className: 'salah-eyebrow' }, t('nextPrayer')), badge(sourceLabel(schedule.actualSource))),
                  next ? h('div', { className: 'salah-hero-main' },
                    h('div', null, h('h2', { className: 'salah-next-name', 'aria-live': 'polite' }, t(next.name)), h('p', { className: 'salah-next-time' }, h('time', { dateTime: new Date(next.time).toISOString() }, formatTime(next.time, schedule.timezone)), civilDate(next.time, schedule.timezone) > currentDate && ` · ${t('tomorrow')}`)),
                    h('div', null, h('p', { className: 'salah-eyebrow salah-count-label' }, t('beginsIn')), h('div', { className: 'salah-countdown salah-digits', role: 'timer', 'aria-live': 'off', 'aria-label': countdown(next.time, model.now) }, countdown(next.time, model.now)))) : h('div', null, h('h2', null, t('noNext')), h('p', { className: 'salah-hint' }, t('noNextHelp'))),
                  h('div', { className: 'salah-row salah-between salah-location-line' }, h('span', null, schedule.location?.label || t('currentLocation')), h('span', { className: 'salah-hint' }, schedule.timezone)))),
                h('section', { 'aria-label': t(displayDay.date === currentDate ? 'today' : 'scheduleFor') },
                  h('div', { className: 'salah-row salah-between salah-section-head' }, h('h2', null, t(displayDay.date === currentDate ? 'today' : 'scheduleFor')), h('p', { className: 'salah-hint' }, formatDate(displayDay.date, schedule.timezone))),
                  h(PrayerGrid, { day: displayDay, schedule, next, now: model.now })),
                followingDay && h('details', { className: 'salah-tomorrow' }, h('summary', null, t(displayDay.date === currentDate ? 'tomorrow' : 'scheduleFor'), ' · ', formatDate(followingDay.date, schedule.timezone)), h(PrayerGrid, { day: followingDay, schedule, next, now: model.now }))) :
                !disabled && h('div', { className: 'salah-empty' }, h(Icon, { size: 32 }), h('h2', null, t('noLocation')), h('p', { className: 'salah-hint' }, t(source === 'myquran' ? 'myquranHelp' : 'noLocationHelp'))),
              model.settings && h('div', { className: 'salah-settings-grid' },
                h('section', { className: 'sl-card sl-card-border' }, h('div', { className: 'sl-card-body' },
                  h('h2', { className: 'sl-card-title' }, t('location')),
                  model.settings.location && h('p', { className: 'salah-small' }, model.settings.location.label, ' · ', model.settings.location.timezone),
                  source !== 'myquran' && button(t(model.locating ? 'locating' : 'useCurrent'), () => void locate(), disabled, { title: t('currentHelp'), 'aria-description': t('currentHelp') }),
                  source === 'myquran' && !model.settings.location?.myquranId && h('p', { className: 'salah-hint' }, t('myquranHelp')),
                  model.geocoding && h('div', { className: 'salah-field' },
                    field('geocodingProvider', h('select', { id: `${uid}-geocodingProvider`, className: 'sl-select sl-select-sm', 'data-testid': 'salah-geocoding', value: geocodingProvider, title: t(geocodingProvider === 'open-meteo-commercial' ? 'geocodingCommercialHelp' : 'geocodingPublicHelp'), 'aria-description': t(geocodingProvider === 'open-meteo-commercial' ? 'geocodingCommercialHelp' : 'geocodingPublicHelp'), disabled, onChange: event => { searchController.current?.abort(); setResults(null); setSearching(false); setSearchError(''); void configure({ geocodingProvider: event.target.value }); } }, model.geocoding.providers.map(provider => h('option', { key: provider.id, value: provider.id }, t(provider.id))))),
                    missingGeocodingKey && h('p', { className: 'salah-notice salah-warning', role: 'status', title: t('geocodingMissingKey') }, t('geocodingMissingKeyShort'))),
                  h('form', { onSubmit: search }, field('citySearch', h('div', { className: 'salah-search' }, h('input', { id: `${uid}-citySearch`, ref: searchInput, className: 'sl-input sl-input-sm', value: query, placeholder: t('cityPlaceholder'), required: true, minLength: 2, maxLength: 100, onChange: event => { searchController.current?.abort(); setSearching(false); setQuery(event.target.value); setResults(null); } }), h('button', { type: 'submit', className: 'sl-btn sl-btn-sm', disabled: searching || disabled || missingGeocodingKey || query.trim().length < 2 }, t(searching ? 'searching' : 'search'))))),
                  searchError && h('p', { className: 'salah-error', role: 'alert' }, searchError),
                  results && h('div', { ref: resultsRef, tabIndex: -1, 'aria-label': t('citySearch') }, results.length ? h('ul', { className: 'salah-results' }, results.map((location, index) => h('li', { key: `${location.myquranId || location.label}-${index}` }, h('button', { className: 'salah-result', disabled, onClick: () => { searchInput.current?.focus(); setResults(null); void selectLocation(location); } }, location.label, h('small', null, location.timezone, ' · ', Number(location.latitude).toFixed(3), ', ', Number(location.longitude).toFixed(3)))))) : h('p', { className: 'salah-hint', role: 'status' }, t('noResults'))),
                  source !== 'myquran' && h('details', null, h('summary', null, t('coordinates')), h('form', { className: 'salah-coordinates', onSubmit: applyCoords }, ['label', 'latitude', 'longitude', 'timezone'].map(name => field(name, h('input', { id: `${uid}-${name}`, className: 'sl-input sl-input-sm', type: ['latitude', 'longitude'].includes(name) ? 'number' : 'text', step: 'any', min: name === 'latitude' ? -90 : name === 'longitude' ? -180 : undefined, max: name === 'latitude' ? 90 : name === 'longitude' ? 180 : undefined, maxLength: name === 'label' ? 160 : 100, required: true, value: coords[name], onChange: event => setCoords(previous => ({ ...previous, [name]: event.target.value })) }))), h('button', { type: 'submit', className: 'sl-btn sl-btn-sm salah-wide', disabled }, t('applyCoordinates')))))),
                h('section', { className: 'sl-card sl-card-border' }, h('div', { className: 'sl-card-body' },
                  h('h2', { className: 'sl-card-title' }, t('settings')),
                  field('source', h('select', { id: `${uid}-source`, className: 'sl-select sl-select-sm', 'data-testid': 'salah-source', value: source, 'aria-description': t(source === 'myquran' ? 'providerMethod' : 'sourceHelp'), disabled, onChange: changeSource }, !model.sources.some(item => item.id === source) && h('option', { value: source }, sourceLabel(source)), model.sources.map(item => h('option', { value: item.id, key: item.id }, sourceLabel(item.id))))),
                  source === 'myquran' && h('p', { className: 'salah-hint', title: t('providerMethod') }, t('providerTimetable')),
                  h('fieldset', { className: 'sl-fieldset salah-calculation-settings', 'aria-label': t(source === 'myquran' ? 'offlineSettings' : 'calculationSettings') },
                    h('legend', { className: 'sl-fieldset-legend' }, t(source === 'myquran' ? 'offlineSettings' : 'calculationSettings')),
                    field('method', h('select', { id: `${uid}-method`, className: 'sl-select sl-select-sm', 'data-testid': 'salah-method', value: model.settings.method, disabled, onChange: event => void configure({ method: event.target.value }) }, !model.methods.some(method => method.id === model.settings.method) && h('option', { value: model.settings.method }, model.settings.method), model.methods.map(method => h('option', { key: method.id, value: method.id }, methodLabel(method))))),
                    field('school', h('select', { id: `${uid}-school`, className: 'sl-select sl-select-sm', 'data-testid': 'salah-school', value: model.settings.school, disabled, onChange: event => void configure({ school: event.target.value }) }, !['standard', 'hanafi'].includes(model.settings.school) && h('option', { value: model.settings.school }, model.settings.school), ['standard', 'hanafi'].map(school => h('option', { key: school, value: school }, t(school))))))))),
              h('footer', { className: 'salah-footer' }, h('details', { 'data-testid': 'salah-help' }, h('summary', null, t('helpDetails')),
                h('div', { className: 'salah-help-content' },
                  h('p', { className: 'salah-hint' }, t('sourceHelp')), source === 'myquran' && h('p', { className: 'salah-hint' }, t('providerMethod')),
                  h('p', { className: 'salah-hint' }, t(source === 'myquran' ? 'myquranSearchHint' : 'currentHelp')), h('p', { className: 'salah-hint' }, t('offlineHint')),
                  h('p', { className: 'salah-hint' }, t(geocodingProvider === 'open-meteo-commercial' ? 'geocodingCommercialHelp' : 'geocodingPublicHelp')),
                  geocodingProvider === 'open-meteo-commercial' && h('p', { className: 'salah-hint' }, t(missingGeocodingKey ? 'geocodingMissingKey' : 'geocodingKeyReady')),
                  h('p', { className: 'salah-hint' }, h('a', { href: 'https://open-meteo.com/en/terms', target: '_blank', rel: 'noreferrer' }, t('geocodingTerms')), ' · ', h('a', { href: 'https://open-meteo.com/en/pricing', target: '_blank', rel: 'noreferrer' }, t('geocodingKeyHelp'))),
                  h('p', { className: 'salah-hint' }, t('reviewIntro')), h('p', { className: 'salah-hint' }, t('reviewLocal')), h('p', { className: 'salah-hint' }, t('saved')),
                  h('p', { className: 'salah-hint' }, t('accuracy')), h('p', { className: 'salah-hint' }, t('privacy')), h('p', { className: 'salah-hint' }, t('timeZoneHint')),
                  schedule && Number.isFinite(schedule.fetchedAt) && h('p', { className: 'salah-hint' }, t('fetchedAt'), ': ', formatFetched(schedule.fetchedAt, schedule.timezone), ' · ', schedule.timezone),
                  h('p', { className: 'salah-hint' }, t('attribution'), ': ', h('a', { href: 'https://aladhan.com/prayer-times-api', target: '_blank', rel: 'noreferrer' }, 'AlAdhan'), ' · ', h('a', { href: 'https://myquran.com/', target: '_blank', rel: 'noreferrer' }, 'MyQuran'), ' · ', h('a', { href: 'https://github.com/batoulapps/adhan-js', target: '_blank', rel: 'noreferrer' }, 'Adhan'), ' · ', h('a', { href: 'https://open-meteo.com/en/docs/geocoding-api', target: '_blank', rel: 'noreferrer' }, 'Open-Meteo / GeoNames')))))));
        }
        function Floating() {
          const model = useModel(); useLocale();
          const card = useRef(null), drag = useRef(null), handle = useRef(null);
          const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
          const cardSize = () => ({ width: card.current?.offsetWidth || 264, height: card.current?.offsetHeight || 196 });
          const fit = position => clampFloating(position, viewport(), cardSize());
          useEffect(() => {
            if (!model.floatingVisible) return;
            const resize = () => {
              const point = fit(state.floatingPosition);
              if (point.x !== state.floatingPosition?.x || point.y !== state.floatingPosition?.y) setFloating(true, point);
            };
            const cancel = () => { drag.current = null; };
            resize();
            window.addEventListener('resize', resize);
            window.addEventListener('blur', cancel);
            const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
            if (card.current) observer?.observe(card.current);
            return () => { drag.current = null; window.removeEventListener('resize', resize); window.removeEventListener('blur', cancel); observer?.disconnect(); };
          }, [model.floatingVisible]);
          function beginMove(event) {
            if (event.button !== 0 || event.isPrimary === false) return;
            const point = fit(state.floatingPosition);
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { return; }
            event.currentTarget.focus();
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: point };
          }
          function move(event) {
            const start = drag.current;
            if (!start || start.id !== event.pointerId) return;
            setFloating(true, fit({ x: start.origin.x + event.clientX - start.x, y: start.origin.y + event.clientY - start.y }), false);
          }
          function finishMove(event) {
            if (drag.current?.id !== event.pointerId) return;
            drag.current = null;
            try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* The browser may already have cancelled capture. */ }
            setFloating(state.floatingVisible, fit(state.floatingPosition));
          }
          function keyboardMove(event) {
            const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
            if (!delta) return;
            event.preventDefault();
            const point = fit(state.floatingPosition), step = event.shiftKey ? 40 : 10;
            setFloating(true, fit({ x: point.x + delta[0] * step, y: point.y + delta[1] * step }));
          }
          if (!model.floatingVisible) return null;
          const position = fit(model.floatingPosition);
          const schedule = model.schedule, next = getNext(schedule, model.now), current = getCurrent(schedule, model.now);
          const currentName = current ? t(current.name) : next?.name === 'Fajr' ? t('beforeFajr') : schedule ? t('betweenPrayers') : '—';
          const open = () => ctx.layout.selectPanel('salah');
          const hide = () => { (floatingToggleRef.current || dockRef.current)?.focus(); setFloating(false); };
          return h('aside', { ref: card, className: 'salah salah-floating sl-card sl-card-border', 'data-testid': 'salah-floating', 'data-setup-reviewed': model.reviewed, style: { left: position.x, top: position.y }, 'aria-label': t('floatingTitle') },
            h('style', null, CSS),
            h('div', { className: 'salah-float-head' },
              h('button', { ref: handle, type: 'button', className: 'salah-float-grip', onPointerDown: beginMove, onPointerMove: move, onPointerUp: finishMove, onPointerCancel: finishMove, onLostPointerCapture: finishMove, onKeyDown: keyboardMove, title: t('moveHint'), 'aria-label': t('moveFloating') }, h(Icon, { size: 15 }), h('span', null, t('title')), h('span', { 'aria-hidden': true, className: 'salah-float-grip-mark' }, '⠿')),
              h('button', { type: 'button', className: 'sl-btn sl-btn-xs sl-btn-ghost salah-float-action', onClick: open, title: t('opensPanel'), 'aria-label': t('opensPanel') }, '↗'),
              h('button', { type: 'button', className: 'sl-btn sl-btn-xs sl-btn-ghost salah-float-action', onClick: hide, title: t('hideFloating'), 'aria-label': t('hideFloating') }, '×')),
            h('div', { className: 'sl-card-body salah-float-body' },
              model.reviewed && next && h('div', { className: 'salah-float-current', title: t('currentPrayerHelp') }, h('span', { className: 'salah-muted' }, t('currentPrayer')), h('strong', null, currentName), current && h('time', { className: 'salah-digits', dateTime: new Date(current.time).toISOString() }, formatTime(current.time, schedule.timezone))),
              !model.reviewed ? h('button', { type: 'button', className: 'sl-btn sl-btn-sm', 'data-testid': 'salah-widget-review', onClick: open }, t('reviewNeeds')) : next ? h(React.Fragment, null,
                h('div', { className: 'salah-float-next' }, h('span', null, t('nextPrayer'), ' · ', t(next.name)), h('time', { className: 'salah-digits', dateTime: new Date(next.time).toISOString() }, formatTime(next.time, schedule.timezone))),
                h('div', { className: 'salah-float-count salah-digits', role: 'timer', 'aria-live': 'off', 'aria-label': `${t(next.name)}: ${countdown(next.time, model.now)}` }, countdown(next.time, model.now)),
                h('p', { className: 'salah-float-zone', title: `${schedule.location?.label || ''} · ${schedule.timezone}` }, schedule.location?.label || schedule.timezone)) :
                h('button', { type: 'button', className: 'sl-btn sl-btn-sm', onClick: open }, t(model.locating ? 'locating' : model.busy ? 'loading' : schedule ? 'noNext' : 'configure')),
              h(Provenance, { model }),
              (model.error || model.geoError) && h('p', { className: 'salah-float-warning', role: 'status', title: model.error || t(model.geoError) }, model.error ? t('staleShort') : t(model.geoError))));
        }
        function Dock() {
          const model = useModel(); useLocale();
          const view = dockState(model), schedule = model.schedule, next = view.next, upcoming = getNext(schedule, model.now);
          const status = next ? null : t(({ review: 'dockReview', loading: 'dockLoading', locating: 'dockLocating', error: 'dockError', location: 'dockLocation', exhausted: 'dockExhausted' })[view.kind]);
          const freshness = t(({ fresh: 'fresh', 'refresh-failed': 'freshnessFailed', stale: 'freshnessStale', exhausted: 'freshnessExhausted', unknown: 'freshnessUnknown', missing: 'freshnessMissing' })[view.freshness]);
          const details = [t('opensPanel'), !model.reviewed && t('reviewNeeds'), upcoming && `${t('nextPrayer')}: ${t(upcoming.name)} ${formatFetched(upcoming.time, schedule.timezone)}`, status, schedule && `${sourceLabel(schedule.actualSource)} · ${schedule.timezone}`, view.sourceKind === 'fallback' && t('fallbackHelp'), freshness, schedule && Number.isFinite(schedule.fetchedAt) && `${t('fetchedAt')}: ${formatFetched(schedule.fetchedAt, schedule.timezone)} · ${schedule.timezone}`, model.error, model.geoError && t(model.geoError)].filter(Boolean).join('. ');
          return h('div', { className: 'salah salah-dock', 'data-testid': 'salah-dock' }, h('style', null, CSS),
            h('button', { type: 'button', className: 'sl-btn sl-btn-ghost sl-btn-xs salah-dock-button', 'data-testid': 'salah-dock-button', ref: dockRef, onClick: () => ctx.layout.selectPanel('salah'), title: details, 'aria-label': details },
              h(Icon, { size: 12 }), next ? h(React.Fragment, null, h('span', null, t(next.name)), h('span', { className: 'salah-digits', role: 'timer', 'aria-live': 'off' }, compactCountdown(next.time, model.now))) : h('span', null, status),
              view.warnings.map(warning => h('span', { key: warning, className: 'salah-dock-warning' }, t(warning === 'fallback' ? 'dockFallback' : 'dockStale')))));
        }
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'salah-floating', order: 10, label: () => t('floatingTitle') }, Floating));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'salah' }, App));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'salah', order: 15, label: () => t('prayerTimes') }, Icon));
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({ name: 'conversation.composer.dock', id: 'salah-countdown', order: 15, label: () => t('prayerTimes') }, Dock));
      },
    };
  },
});
