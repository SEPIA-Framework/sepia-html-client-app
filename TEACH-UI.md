# SEPIA Teach-UI examples

## Client controls

### Set volume
´´´
Action: <set>
Function: volume
Data: {"number":11}
´´´

### Call SEPIA Mesh-Node from client
´´´
Action: <on>
Function: meshNode
Data: {"url":"http://localhost:20780", "plugin":"RuntimePlugin", "data":{"command":["echo", "test"]}}
´´´

## Platform actions (platform_controls)

### Call Android Intent for certain device or browser action
´´´
Device IDs: { "a1": {"type": "androidIntent", "data": {"action": "android.media.action.MEDIA_PLAY_FROM_SEARCH", "extras": {"query": "Paradise City"} }} }
Browser:	{ "type": "url", "data": "https://open.spotify.com/track/3YBZIN3rekqsKxbJc9FZko?si=Stqe48xYS52Gim_Lr-JEFg" }
´´´
Useful Android Intents:  
https://developer.android.com/guide/components/intents-common  
android.settings.VOICE_INPUT_SETTINGS  
android.media.action.MEDIA_PLAY_FROM_SEARCH  


## Mesh node plugin

### Test HelloPlugin with answer
´´´
URL: http://localhost:20780
Plugin: HelloPlugin
JSON: {"name":"Boss"}
Success: Ok I understood <result_hello>
Fail: Sorry I could not get a result
´´´
