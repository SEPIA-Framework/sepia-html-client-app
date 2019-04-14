#SEPIA Teach-UI examples

## Client controls
Action: <set>
Function: volume
Data: {"number":11}

Action: <on>
Function: meshNode
Data: {"url":"http://localhost:20780", "plugin":"RuntimePlugin", "data":{"command":["echo", "test"]}}

## Platform actions (platform_controls)
Device IDs: { "a1": {"type": "androidIntent", "data": {"action": "android.media.action.MEDIA_PLAY_FROM_SEARCH", "extras": {"query": "Paradise City"} }} }
Browser:	{ "type": "url", "data": "https://open.spotify.com/track/3YBZIN3rekqsKxbJc9FZko?si=Stqe48xYS52Gim_Lr-JEFg" }

## Mesh node plugin
URL: http://localhost:20780
Plugin: HelloPlugin
JSON: {"name":"Boss"}
Success: Ok I understood <result_hello>
Fail: Sorry I could not get a result

## Useful Android Intents
https://developer.android.com/guide/components/intents-common
android.settings.VOICE_INPUT_SETTINGS
android.media.action.MEDIA_PLAY_FROM_SEARCH