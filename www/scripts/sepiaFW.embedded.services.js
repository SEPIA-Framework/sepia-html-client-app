//Embedded services (e.g. for demo/offline mode)
function sepiaFW_build_embedded_services(){
	var Services = {};

	//ServiceResult
	Services.buildServiceResult = function(user, language, command, answerText, cardInfo, actionInfo, htmlInfo){
		var serviceResult = {
			"result": "success",
			"answer": answerText,
			"answer_clean": answerText,
			"hasCard": cardInfo? true : false,
			"cardInfo": cardInfo,
			"more": {
				"mood": "6",
				"certainty_lvl": 1,
				"cmd_summary": "", 		//we skip this for now
				"context": "",			//we skip this for now
				"language": language,
				"user": user
			},
			"hasAction": actionInfo? true : false,
			"actionInfo": actionInfo,	//note: this is an array of actions
			"hasInfo": htmlInfo? true : false,
			"htmlInfo": htmlInfo,
			"resultInfo": {
				"cmd": command
			}
		};
		return serviceResult;
	}

	//Get answer to nluResult
	Services.answerMessage = function(nluInput, nluResult){
		var serviceResult = {};
		if (nluResult.result == "success"){
			//Lists
			if (nluResult.command == "lists"){
				serviceResult = Services.lists(nluInput, nluResult);
			
			//Alarm/Timer/Reminder etc.
			}else if (nluResult.command == "timer"){
				serviceResult = Services.alarm(nluInput, nluResult);
				if (!serviceResult){
					//not yet supported
					serviceResult = notPossibleInDemo(nluInput, nluResult);
				}

			//News
			}else if (nluResult.command == "news"){
				serviceResult = Services.news(nluInput, nluResult);

			//Music (media player)
			}else if (nluResult.command == "music"){
				serviceResult = Services.music(nluInput, nluResult);

			//Radio
			}else if (nluResult.command == "music_radio"){
				serviceResult = Services.radio(nluInput, nluResult);

			//Weather
			}else if (nluResult.command == "weather"){
				serviceResult = Services.weather(nluInput, nluResult);

			//Link
			}else if (nluResult.command == "open_link"){
				serviceResult = Services.link(nluInput, nluResult);

			//My-Events
			}else if (nluResult.command == "events_personal"){
				serviceResult = Services.personalEvents(nluInput, nluResult);

			//Chat with custom actio or card test
			}else if (nluResult.command == "chat" && nluResult.parameters.data){
				serviceResult = Services.customChatWithActionOrCardTest(nluInput, nluResult);

			//Other
			}else{
				serviceResult = notPossibleInDemo(nluInput, nluResult);
			}
		}
		return serviceResult;
	}
	function notPossibleInDemo(nluInput, nluResult){
		var answerText = SepiaFW.local.g('notPossibleInDemoMode');
		return Services.buildServiceResult(
			nluInput.user, nluInput.language, 
			nluResult.command, answerText, '', '', ''
		);
	}

	//Personal events/recommendations service
	Services.personalEvents = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy list service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = "";
			var actionInfo = Services.buildPersonalEventsActionDummy();
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}
	
	//Embedded list service
	Services.lists = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy list service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = Services.buildListCardInfoDummy();
			var actionInfo = "";
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//Embedded alarm service
	Services.alarm = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		var serviceResult;
		if (SepiaFW.offline){
			//Get dummy list service-result
			var cardInfo;
			if (nluResult.parameters.alarm_type == "<alarmClock>"){
				cardInfo = Services.buildAlarmCardInfoDummy(undefined, undefined, nluResult.language);
			}else if (nluResult.parameters.alarm_type == "<timer>"){
				cardInfo = Services.buildTimerCardInfoDummy(undefined, undefined, nluResult.language);
			}
			if (cardInfo){
				var actionInfo = "";
				var htmlInfo = "";
				serviceResult = Services.buildServiceResult(
					nluInput.user, nluInput.language, 
					nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
				);
			}
		}
		return serviceResult;
	}

	//Embedded news service
	Services.news = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy news list service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = Services.buildNewsCardInfoDummy(nluResult.language);
			var actionInfo = "";
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//Embedded music service
	Services.music = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy media player card
		var serviceResult;
		if (SepiaFW.offline && nluResult.parameters && nluResult.parameters.music_service == "embedded"){
			var cardInfo = dummyCards["embedded_player"]();
			var actionInfo = "";
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//Embedded radio service
	Services.radio = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy radio service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = Services.buildRadioCardInfoDummy(nluResult.language);
			var actionInfo = [{
				"audio_url": cardInfo[0].info[0].streamURL,
				"type": "play_audio_stream",
				"audio_title": cardInfo[0].info[0].name
			}, {
				"type": "button_in_app_browser",
				"title": "Playlist",
				"url": "http://www.size-radio.com"
			}];
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//Embedded weather service
	Services.weather = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy weather service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = Services.buildWeatherCardInfoDummy(nluResult.language);
			var actionInfo = "";
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//Embedded link service
	Services.link = function(nluInput, nluResult, customCardData){
		//Dummy data
		var imageUrl = "";
		var imageBackground = "";
		var title = "Link";
		var description = "Click to open";
		var url = "https://sepia-framework.github.io/app/search.html";
		var answerText = SepiaFW.local.g('opening_link');
		var data = {
			type: "websearch"
		};
		
		//Overwrite with custom data ... if available
		if (customCardData){
			imageUrl = customCardData.image;
			imageBackground = customCardData.imageBackground;
			url = customCardData.url;
			if (customCardData.data){
				data = customCardData.data;
				title = customCardData.data.title;
				description = customCardData.data.desc;
			}

		}else if (nluResult && nluResult.parameters){
			imageUrl = nluResult.parameters.icon_url;
			//imageBackground = nluResult.parameters.???
			title = nluResult.parameters.title;
			description = nluResult.parameters.description;
			url = nluResult.parameters.url;
			answerText = nluResult.parameters.answer_set;
			if (answerText){
				var answers = answerText.split("||"); 
				var randN = Math.floor(Math.random() * answers.length);
				answerText = answers[randN]; 		//TODO: test
			}
		}

		//Get list service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = [SepiaFW.offline.getLinkCard(url, title, description, imageUrl, imageBackground, data)];
			var actionInfo = [SepiaFW.offline.getUrlOpenAction(url, true)]; 	//skipIfEmbeddable = true
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//Custom chat with action or card test - Trigger via 'action [test]' or 'card [test]'
	Services.customChatWithActionOrCardTest = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy action or card
		var serviceResult;
		if (SepiaFW.offline && nluResult.parameters && nluResult.parameters.data){
			var cardInfo = "";
			var actionInfo = "";
			var t = nluResult.parameters.data.test;		//[test] value
			//action
			if (nluResult.parameters.data.type == "action"){
				var fun = dummyActions[t];
				if (fun) actionInfo = fun();
			//card
			}else if (nluResult.parameters.data.type == "card"){
				var fun = dummyCards[t];
				if (fun) cardInfo = fun();
			}
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//----- Actions builder -----

	Services.buildCustomActionInfo = function(actionType, actionData, actionOptions, existingActionInfo){
		var actionInfo = existingActionInfo || [];
		var newAction = actionData || {};
		newAction.type = actionType;
		if (actionOptions){
			newAction.options = actionOptions;
		}
		actionInfo.push(newAction);
		return actionInfo;
	}

	//more specific actions at: SepiaFW.offline
	
	Services.buildPersonalEventsActionDummy = function(){
		var actionInfo = [{
			"type": "events_start",
			"info": "dividerWithTime"
		}, {
			"options": {
				"skipTTS": true,
				"showView": true
			},
			"cmd": "directions;;location_start=<user_location>;;location_end=<user_home>;;travel_request_info=<duration>;;",
			"type": "button_cmd",
			"title": SepiaFW.local.g('way_home'),
			"info": "direct_cmd"
		}, {
			"type": "button_in_app_browser",
			"title": "SEPIA Homepage",
			"url": "https://sepia-framework.github.io"
		}];
		return actionInfo;
	}

	//NOTE: trigger test via chat "action html_1" etc.
	var dummyActions = {
		"html_1": function(){ return Services.buildCustomActionInfo("show_html_result", {
			data: "<div class='card-box'>" 
				+ "<div style='background:#fff; color:#111; padding:5px;'><span>Hello World</span></div>" 
				+ "<script>alert('fail');</script></div>" 	//<-- script will be filtered out (test)
		}); },
		"frame_1": function(){ return Services.buildCustomActionInfo("open_frames_view", {		//test relative link and view itself
			info: {pageUrl: "xtensions/custom-data/views/demo-view.html"}
		}); },
		"frame_2": function(){ return Services.buildCustomActionInfo("open_frames_view", {		//test absolute link
			info: {pageUrl: (location.href.replace(/index.html$/, "") + "xtensions/custom-data/views/demo-view.html")}
		}); },
		"frame_3": function(){ return Services.buildCustomActionInfo("open_frames_view", {		//test remote link
			info: {pageUrl: "https://b07z.net/downloads/cors/demo-view.html"}
		}); },
		"frame_4": function(){ return Services.buildCustomActionInfo("open_frames_view", {		//test path-replaced link
			info: {pageUrl: "<custom_data>/views/clock.html"}
		}); },
		"frame_5": function(){ return Services.buildCustomActionInfo("open_frames_view", {		//server-path + old style
			info: {
				pageUrl: "<assist_server>/views/custom-view-demo.html", onOpen: "sayHelloOnOpen",
				onSpeechToTextInputHandler: "handleSttData", onChatOutputHandler: "handleChatOutput"
			}
		}); },
		"clock": function(){ return Services.buildCustomActionInfo("open_frames_view", {		//test relative link and view itself
			info: {pageUrl: "xtensions/custom-data/views/clock.html"}
		}); },
		"custom_event_btn_1": function(){ return Services.buildCustomActionInfo("button_custom_event", {
			title: "Test", name: "test", data: {"button": 1}
		}); },
		"custom_event_1": function(){ return Services.buildCustomActionInfo("trigger_custom_event", {
			name: "test", data: {"direct": 1}
		}); },
		"settings_1": function(){ return Services.buildCustomActionInfo("open_settings", {
			section: "addresses"
		}); }
	}

	//----- Cards dummy data -----

	//NOTE: trigger test via chat "card embedded_player" etc.
	var dummyCards = {
		"embedded_player": function(){
			var url = "";
			var service = "embedded";
			var serviceResult = {};
			return Services.buildEmbeddedPlayerCardInfoDummy(url, {
				artist: "Ed",
				song: "Twister"
			}, service, serviceResult);
		},
		"embedded_player_youtube": function(){
			var url = "https://www.youtube.com/embed?listType=playlist&list=OLAK5uy_nMLnwHRhSOAO6sO7LmFRkp21RATGG6mT8";
			var service = "youtube_embedded";
			var serviceResult = {};
			return Services.buildEmbeddedPlayerCardInfoDummy(url, {
				playlist: "Metallica",
				uri: url
			}, service, serviceResult);
		}
	}

	//Build a list with custom or dummy data
	Services.buildListCardInfoDummy = function(id, title, section, indexType, group, listData){
		if (!title) title = "Demo To-Do List";
		if (!section) section = "productivity";
		if (!indexType) indexType = "todo";
		if (!group) group = "todo";
		var type = "userDataList";
		var dateAdded = new Date().getTime();
		var id = id || ("ABCDx123456"); 	//usually this is defined by database id generator
		var data = listData || [{
			"name": "Find to-do list", "checked": true, "dateAdded": dateAdded, "lastChange": dateAdded, "eleType": "checkable"
		}, {
			"name": "Check-out tutorial and (this) demo", "checked": false, "state": "inProgress", "dateAdded": dateAdded, "lastChange": dateAdded, "eleType": "checkable"
		}, {
			"name": "Install <b>own</b> SEPIA server", "checked": false, "dateAdded": dateAdded, "lastChange": dateAdded, "eleType": "checkable"
		}, {
			"name": "Create own services and commands", "checked": false, "dateAdded": dateAdded, "lastChange": dateAdded, "eleType": "checkable"
		}, {
			"name": "Find alarms in shortcut-menu", "checked": false, "dateAdded": dateAdded, "lastChange": dateAdded, "eleType": "checkable"
		}, {
			"name": "Don't use HTML like <script>console.log(':-p');</script>", "checked": false, "dateAdded": dateAdded, "lastChange": dateAdded, "eleType": "checkable"
		}];
		var user = "userid";

		var cardInfo = [{
			"cardType": "uni_list",
			"N": 1,
			"info": [{
				"indexType": indexType,
				"data": data,
				"section": section,
				"_id": id,
				"title": title,
				"type": type,
				"lastEdit": dateAdded,
				"user": user,
				"group": group
			}]
		}];
		return cardInfo;
	}

	//Build a collection of dummy alarms
	Services.buildAlarmCardInfoDummy = function(id, alarmData, language, cardInfoTitle){
		var id = id || ("BCDEx123456"); 	//usually this is defined by database id generator
		var data = alarmData;
		if (!alarmData){
			var isTestUser1 = SepiaFW.account.getTestUserType() == 1;
			//dummy dates
			var dateAdded = new Date().getTime() - 300000;
			//5min (6h for test2)
			var time1 = !isTestUser1? (dateAdded + 300000 + (60000*60*6)) : (dateAdded + 600000);
			var date1 = new Date(time1);
			var dateString1 = date1.toLocaleDateString(language);
			var day1 = date1.toLocaleDateString(language, {weekday: 'long'});
			var timeString1 = date1.toLocaleTimeString(language);
			//24h
			var time2 = (dateAdded + 300000 + (60000*60*24));
			var date2 = new Date(time2);
			var dateString2 = date2.toLocaleDateString(language);
			var day2 = date2.toLocaleDateString(language, {weekday: 'long'});
			var timeString2 = date2.toLocaleTimeString(language);
			data = [{
				"name": "Next Alarm", "eleType": "alarm", "repeat": "onetime", "activated": false,
				"date": dateString1,
				"eventId": "alarm-1-630",
				"lastChange": dateAdded,
				"time": timeString1,
				"day": day1,
				"targetTimeUnix": time1
			}, {
				"name": "24h Alarm", "eleType": "alarm", "repeat": "onetime", "activated": false,
				"date": dateString2,
				"eventId": "alarm-2-631",
				"lastChange": dateAdded,
				"time": timeString2,
				"day": day2,
				"targetTimeUnix": time2
			}];
		}
		var user = "userid";

		var title = cardInfoTitle || "alarmClock";
		var cardInfo = [{
			"cardType": "uni_list",
			"N": 1,
			"info": [{
				"indexType": "alarms",
				"data": data,
				"section": "timeEvents",
				"_id": id,
				"title": title,
				"type": "userDataList",
				"lastEdit": new Date().getTime(),
				"user": user,
				"group": "alarms"
			}]
		}];
		return cardInfo;
	}
	//Build a collection of dummy timers
	Services.buildTimerCardInfoDummy = function(id, alarmData, language){
		var id = id || ("BCDEy123456"); 	//usually this is defined by database id generator
		if (!alarmData){
			var isTestUser1 = SepiaFW.account.getTestUserType() == 1;
			//dummy timers
			var now = new Date().getTime();
			alarmData = [{
				"eleType": "timer",
				"eventId": "timer-1-220",
				"name": "Timer",
				"type": "timer",
				"info": "set",
				"lastChange": now,
				"targetTimeUnix": (!isTestUser1? (now + 1000*60*60*5) : (now + 1000*60*30)),
				"activated": false
			}];
		}
		var cardInfo = Services.buildAlarmCardInfoDummy(id, alarmData, language, "timer");
		return cardInfo;
	}

	//Build a collection of dummy outlets
	Services.buildNewsCardInfoDummy = function(language){
		var cardInfo = [{
			"cardType": "grouped_list",
			"N": 1,
			"info": [{
				"image": "",
				"feedName": "Blog – Hackaday",
				"nameClean": "HACKADAY",
				"name": "<span style='color:#000;'><b>HACKADAY</b></span>",
				"type": "news",
				"group": "1",
				"data": [{
					"link": "https://hackaday.com/2019/10/07/dry-your-clothes-in-one-minute-or-less/",
					"description": "<p>If you&#8217;re like most people, then washing clothes is probably a huge pain for you. Figuring out the odd number of minutes necessary to run a wash and dry cycle, trying desperately not to end up with clothes that are still wet, and worst of all having to wait <em>so</em> <a href=\"https://hackaday.com/2019/10/07/dry-your-clothes-in-one-minute-or-less/\" class=\"read_more\">&#8230;read more</a></p>",
					"title": "Dry Your Clothes In <b>One Minute</b> or Less",
					"pubDate": "2019.10.07_18:30:59"
				}, {
					"link": "https://hackaday.com/2019/10/07/ask-hackaday-whats-the-perfect-hacker-smart-watch/",
					"description": "<p>Since <em>Dick Tracy</em> all the way back in &#8217;46, smart watches have captured the public imagination. After several false starts, the technology has gone through a renaissance in the last 10 years or so. For the average consumer, there&#8217;s been a proliferation of hardware in the marketplace, with scores of <a href=\"https://hackaday.com/2019/10/07/ask-hackaday-whats-the-perfect-hacker-smart-watch/\" class=\"read_more\">&#8230;read more</a></p>",
					"title": "Ask Hackaday: What’s The Perfect Hacker Smart Watch?",
					"pubDate": "2019.10.07_17:01:25"
				}, {
					"link": "https://hackaday.com/2019/10/07/designing-sci-fi-hack-chat/",
					"description": "<p>Join us on Wednesday, October 9 at noon Pacific for the Designing Sci-Fi Hack Chat with Seth Molson!</p> <div class=\"post-content details-content\"> <p>We all know the feeling of watching a movie set in a galaxy far, far away and seeing something that makes us say, &#8220;That&#8217;s not realistic at all!&#8221; The irony of watching </p></div><p> <a href=\"https://hackaday.com/2019/10/07/designing-sci-fi-hack-chat/\" class=\"read_more\">&#8230;read more</a></p>",
					"title": "Designing Sci-Fi Hack Chat",
					"pubDate": "2019.10.07_16:00:14"
				}, {
					"link": "https://hackaday.com/2019/10/07/raspberry-pi-ham-radio-remote-reviewed/",
					"description": "<p>One problem with ham radio these days is that most hams live where you can&#8217;t put a big old antenna up due to city laws and homeowner covenants. If you&#8217;re just working local stations on VHF or UHF, that might not be a big problem. But for HF usage, using <a href=\"https://hackaday.com/2019/10/07/raspberry-pi-ham-radio-remote-reviewed/\" class=\"read_more\">&#8230;read more</a></p>",
					"title": "Raspberry Pi Ham Radio Remote Reviewed",
					"pubDate": "2019.10.07_15:00:01"
				}, {
					"link": "https://hackaday.com/2019/10/07/better-battery-management-through-chemistry/",
					"description": "<p>The lead-acid rechargeable battery is a not-quite-modern marvel. Super reliable and easy to use, charging it is just a matter of applying a fixed voltage to it and waiting a while; eventually the battery is charged and stays topped off, and that&#8217;s it. Their ease is countered by their size, <a href=\"https://hackaday.com/2019/10/07/better-battery-management-through-chemistry/\" class=\"read_more\">&#8230;read more</a></p>",
					"title": "Better Battery Management Through Chemistry",
					"pubDate": "2019.10.07_14:01:51"
				}, {
					"link": "https://hackaday.com/2019/10/07/make-wireless-earbuds-truly-wireless/",
					"description": "<p>[Don] bought some off-brand Bluetooth earbuds online that actually sound pretty good. But while it&#8217;s true that they don&#8217;t require wires for listening to tunes, the little storage/charging box they sleep in definitely has a micro USB port around back. Ergo, they are not <em>truly</em> wireless. So [Don] took it <a href=\"https://hackaday.com/2019/10/07/make-wireless-earbuds-truly-wireless/\" class=\"read_more\">&#8230;read more</a></p>",
					"title": "Make “Wireless” Earbuds Truly Wireless",
					"pubDate": "2019.10.07_11:00:00"
				}, {
					"link": "https://hackaday.com/2019/10/07/pvc-pipe-turned-portable-bluetooth-speaker/",
					"description": "<p>We&#8217;ve always felt that sections of PVC pipe from the home improvement store are a criminally underutilized construction material, and it looks like [Troy Proffitt] feels the same way. Rather than trying to entirely 3D print the enclosure for his recently completed portable Bluetooth speaker, he combined printed parts with <a href=\"https://hackaday.com/2019/10/07/pvc-pipe-turned-portable-bluetooth-speaker/\" class=\"read_more\">&#8230;read more</a></p>",
					"title": "PVC Pipe Turned Portable Bluetooth Speaker",
					"pubDate": "2019.10.07_08:00:09"
				}]
			}]
		}];
		return cardInfo;
	}

	//Build a radio dummy card
	Services.buildRadioCardInfoDummy = function(language){
		var cardInfo = [{
			"cardType": "uni_list",
			"N": 2,
			"info": [{
				"streamURL": "https://stream.radiojar.com/atr1e8aswa5tv",
				"playlistURL": "https://www.size-radio.com/",
				"name": "SIZE RADIO",
				"type": "radio"
			},{
				"streamURL": "https://egofm-pure.cast.addradio.de/egofm/pure/mp3/high/stream.mp3",
				"playlistURL": "https://www.egofm.de/radio/playlist?stream=egopure",
				"name": "egoFM Pure",
				"type": "radio"
			}]
		}];
		return cardInfo;
	}

	//Build link dummy card
	Services.buildEmbeddedPlayerCardInfoDummy = function(url, searchObj, service, serviceResult){
		var image = undefined;
		var imageBackground = undefined;
		var cardInfo = [
			SepiaFW.offline.getLinkCard(url, undefined, undefined, image, imageBackground, {})
		];
		if (!searchObj) searchObj = {};
		cardInfo[0].info[0].url = url;
		cardInfo[0].info[0].data = {
			"title": "Embedded Player",
			"desc": "Test Card",
			"type": "musicSearch",	//or "videoSearch"
			"autoplay": true,
			"typeData": {
				"song": searchObj.song || "",
				"playlist": searchObj.playlist || "",
				"artist": searchObj.artist || "",
				"album": searchObj.album || "",
				"genre": searchObj.genre || "",
				"uri": url,
				"service": service || "embedded",
				"serviceResult": serviceResult || {}  //specific to service
			},
			"brand": ""
		}
		return cardInfo;
	}

	//Build a weather dummy card
	Services.buildWeatherCardInfoDummy = function(language){
		var cardInfo = [{
			"cardType": "single",
			"N": 1,
			"info": [{
				"data": {
					"date": "2019.10.19",
					"icon": "cloudy",
					//"icon48h": "rain",
					"dateTag": "Heute",
					"units": "°",
					//"precipRelative": 0,
					"tagA": "jetzt",
					"timeUNIX": 1571470348168,
					//"precipType": null,
					"desc": "Stark bewölkt",
					//"desc48h": "Den ganzen Tag lang überwiegend bewölkt",
					"place": "Berlin",
					"time": "09",
					"tempB": 15,
					"tempC": 16,
					"tagB": "13:00",
					"tempA": 12,
					"tagC": "16:00"
				},
				"details": {
					"hourly": [{
						"timeUNIX": 1571472000000, "precipType": null,	"tag": "10:00",	"precipRelative": 0, "tempA": 13
					}, {
						"timeUNIX": 1571479200000, "precipType": null,	"tag": "12:00",	"precipRelative": 0, "tempA": 14
					}, {
						"timeUNIX": 1571486400000, "precipType": null, "tag": "14:00", "icon": "rain", "precipRelative": 0.02, "tempA": 15, "warning": null
					}, {
						"timeUNIX": 1571493600000, "precipType": null, "tag": "16:00", "icon": "partly-cloudy-day", "precipRelative": 0, "tempA": 12, "warning": "wind"
					}, {
						"timeUNIX": 1571500800000, "precipType": "rain", "tag": "18:00", "icon": "partly-cloudy-day", "precipRelative": 0.05, "tempA": 10, "warning": "wind"
					}, {
						"timeUNIX": 1571508000000, "precipType": "rain", "tag": "20:00", "precipRelative": 0.16, "tempA": 8
					}, {
						"timeUNIX": 1571515200000, "precipType": "rain", "tag": "22:00", "precipRelative": 0.15, "tempA": 5, "warning": "fog"
					}, {
						"timeUNIX": 1571522400000, "precipType": "snow", "tag": "00:00", "precipRelative": 0.11, "tempA": 0
					}, {
						"timeUNIX": 1571529600000, "precipType": "snow", "tag": "02:00", "precipRelative": 1.18, "tempA": -10, "warning": "wind"
					}, {
						"timeUNIX": 1571529600000, "precipType": null, "tag": "04:00", "icon": "partly-cloudy-night", "precipRelative": 0, "tempA": -5
					}]
				},
				"type": "weatherNow"
			}]
		}];
		return cardInfo;
	}
	
	return Services;
}