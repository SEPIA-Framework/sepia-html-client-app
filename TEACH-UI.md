# SEPIA Teach-UI examples

## Client controls

### Set volume
```
Action: <set>
Function: <volume>
Data: 11
```

### Call SEPIA Mesh-Node from client
```
Action: <on>
Function: <meshNode>
Data: {"value": {"url":"http://localhost:20780", "plugin":"RuntimePlugin", "data":{"command":["echo", "test"]}}}
```

### Call CLEXI
```
Action: <on>
Function: <clexi>
Data: {"value": {"xtension":"clexi-broadcaster", "data":{"text":"Hello", "sender":"Me"}}}
```

## Platform actions (platform_controls)

### Call Android Intent for certain device or browser action
```
Device IDs: {"value": { "a1": {"type": "androidActivity", "data": {"action": "android.media.action.MEDIA_PLAY_FROM_SEARCH", "extras": {"query": "Paradise City"} }} } }
Browser: {"value": { "type": "url", "data": "https://open.spotify.com/track/3YBZIN3rekqsKxbJc9FZko?si=Stqe48xYS52Gim_Lr-JEFg" } }
```
***Some useful Android intents:***  
https://developer.android.com/guide/components/intents-common  
android.settings.VOICE_INPUT_SETTINGS  
android.media.action.MEDIA_PLAY_FROM_SEARCH  
  
More Examples:
```
Android Intent (open URL): {"value": {"type": "androidActivity", "data": {"action": "android.intent.action.VIEW", "url":"https://example.com"} } }
Android Intent (set alarm): {"value": {"type": "androidActivity", "data": {"action": "android.intent.action.SET_ALARM", "extras": {"android.intent.extra.alarm.HOUR": 8, "android.intent.extra.alarm.MINUTES": 30}} } }
Android Intent (search): {"value": {"type": "androidActivity", "data": {"action": "android.intent.action.SEARCH", "extras": {"query": "Cowboy Bebob"}} } }
Android Intent (search app): {"value": {"type": "androidActivity", "data": {"action": "android.intent.action.SEARCH", "extras": {"query": "Cowboy Bebob"}, "component": {"package": "com.netflix.mediaclient", "class": "com.netflix.mediaclient.ui.search.SearchActivity"}} } }
```

## Mesh node plugin

### Test HelloPlugin with answer
```
URL: http://localhost:20780
Plugin: HelloPlugin
JSON: {"value": {"name":"Boss"} }
Success: Ok I understood <result_hello>
Fail: Sorry I could not get a result
```
