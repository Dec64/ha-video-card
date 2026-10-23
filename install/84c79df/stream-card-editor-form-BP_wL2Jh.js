//#region src/editor-form.ts
var e = { text: {} }, t = { boolean: {} }, n = {
	selector: t,
	default: !0
}, r = (e, t, n) => ({ number: {
	min: e,
	max: t,
	mode: "box",
	...n ? { unit_of_measurement: n } : {}
} }), i = [
	{
		name: "dispatcharr_url",
		required: !0,
		selector: { text: { type: "url" } }
	},
	{
		name: "",
		type: "grid",
		flatten: !0,
		schema: [{
			name: "output_profile",
			selector: r(0, 9999)
		}, {
			name: "target",
			selector: e
		}]
	},
	{
		name: "",
		type: "expandable",
		flatten: !0,
		title: "Channels",
		schema: [
			{
				name: "channel_list",
				...n
			},
			{
				name: "guide",
				default: "open",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "open",
							label: "Open under the picture"
						},
						{
							value: "closed",
							label: "Closed until Channels is pressed"
						},
						{
							value: "off",
							label: "Off (Channels opens it over the picture)"
						}
					]
				} }
			},
			{
				name: "channel_groups",
				selector: { text: { multiple: !0 } }
			},
			{
				name: "favourites",
				selector: { text: { multiple: !0 } }
			},
			{
				name: "channel",
				selector: e
			},
			{
				name: "remember_channel",
				...n
			},
			{
				name: "epg",
				...n
			}
		]
	},
	{
		name: "",
		type: "expandable",
		flatten: !0,
		title: "Playback",
		schema: [
			{
				name: "",
				type: "grid",
				flatten: !0,
				schema: [{
					name: "autoplay",
					...n
				}, {
					name: "muted",
					selector: t
				}]
			},
			{
				name: "buffer",
				default: "low",
				selector: { select: {
					mode: "dropdown",
					options: [{
						value: "low",
						label: "Low delay (default)"
					}, {
						value: "stable",
						label: "Stable: for slow devices such as Fire tablets"
					}]
				} }
			},
			{
				name: "aspect_ratio",
				default: "16:9",
				selector: { select: {
					mode: "dropdown",
					custom_value: !0,
					options: [
						"16:9",
						"4:3",
						"21:9",
						"1:1"
					]
				} }
			},
			{
				name: "",
				type: "grid",
				flatten: !0,
				schema: [{
					name: "idle_timeout",
					default: 0,
					selector: r(0, 1440, "min")
				}, {
					name: "start_timeout",
					default: 20,
					selector: r(1, 300, "s")
				}]
			},
			{
				name: "reconnect",
				type: "grid",
				schema: [{
					name: "max_attempts",
					default: 5,
					selector: r(0, 50)
				}]
			},
			{
				name: "settings",
				...n
			},
			{
				name: "debug",
				selector: t
			}
		]
	},
	{
		name: "multiview",
		type: "expandable",
		title: "Multiview",
		schema: [{
			name: "enabled",
			selector: t
		}, {
			name: "",
			type: "grid",
			flatten: !0,
			schema: [{
				name: "max_tiles",
				default: 2,
				selector: r(2, 4)
			}, {
				name: "output_profile",
				key: "tile_profile",
				selector: r(0, 9999)
			}]
		}]
	},
	{
		name: "",
		type: "expandable",
		flatten: !0,
		title: "Advanced",
		schema: [
			{
				name: "url",
				selector: e
			},
			{
				name: "title",
				selector: e
			},
			{
				name: "m3u_url",
				selector: { text: { type: "url" } }
			},
			{
				name: "epg_url",
				selector: { text: { type: "url" } }
			},
			{
				name: "url_template",
				default: "{base}/proxy/ts/stream/{channel}",
				selector: e
			}
		]
	}
], a = {
	dispatcharr_url: "Dispatcharr URL",
	output_profile: "Output profile ID",
	target: "Target name",
	channel_list: "Channel list",
	guide: "Channel guide",
	channel_groups: "Group",
	favourites: "Favourite",
	channel: "Default channel",
	remember_channel: "Remember last channel",
	autoplay: "Autoplay",
	muted: "Start muted",
	buffer: "Buffering",
	aspect_ratio: "Aspect ratio",
	idle_timeout: "Stop after idle",
	start_timeout: "Start timeout",
	max_attempts: "Reconnect attempts",
	settings: "Settings button",
	debug: "Debug overlay",
	enabled: "Multiview button",
	max_tiles: "Most tiles",
	tile_profile: "Output profile for tiles",
	url: "Stream URL instead of a channel",
	title: "Title for the default channel",
	m3u_url: "Channel list (M3U) URL",
	epg: "Now and next",
	epg_url: "Guide (XMLTV) URL",
	url_template: "Channel URL template"
}, o = {
	dispatcharr_url: "e.g. https://dispatcharr.example",
	buffer: "Stable keeps ~8 s in reserve and never skips ahead: smoother on slow devices, a few seconds behind live.",
	output_profile: "The AAC output profile from the README. Leave empty to play streams as they are.",
	target: "Buttons with the same target play on this card.",
	channel_list: "Load every Dispatcharr channel for the picker and channel up/down.",
	guide: "Recent, favourites, groups, search and the number keypad.",
	channel_groups: "Only show these Dispatcharr groups, in this order. None = every group.",
	favourites: "Channel names or numbers, shown first under ★ Favourites.",
	channel: "Name, number or UUID to play when the card appears.",
	remember_channel: "Start on the channel this device watched last.",
	idle_timeout: "0 = never.",
	settings: "Lets each device change buffering, programme info and stats from the control bar. Choices are saved on that device and override these.",
	enabled: "Watch 2–4 channels at once. Each tile is its own Dispatcharr connection.",
	max_tiles: "2 on Fire tablets; up to 4 on desktops and TVs.",
	tile_profile: "e.g. a lower-resolution profile. Empty = the card's output profile.",
	start_timeout: "Seconds to wait for the first data.",
	m3u_url: "Default: <Dispatcharr URL>/output/m3u",
	epg: "Show what's on now and next from Dispatcharr's guide. Downloads the next 24 hours of the guide every 2 hours while a dashboard with the card is open.",
	epg_url: "Default: <Dispatcharr URL>/output/epg?days=1",
	url_template: "Default: {base}/proxy/ts/stream/{channel}"
}, s = {
	schema: i,
	computeLabel: (e) => a[e.key ?? e.name],
	computeHelper: (e) => o[e.key ?? e.name]
};
//#endregion
export { s as configForm };

//# sourceMappingURL=stream-card-editor-form-BP_wL2Jh.js.map