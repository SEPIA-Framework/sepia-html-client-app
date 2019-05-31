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
				if (nluResult.parameters.alarm_type == "<alarmClock>"){
					serviceResult = Services.alarm(nluInput, nluResult);
				}else{
					//not yet supported
				}

			//Link
			}else if (nluResult.command == "open_link"){
				serviceResult = Services.link(nluInput, nluResult);

			//My-Events
			}else if (nluResult.command == "events_personal"){
				serviceResult = Services.personalEvents(nluInput, nluResult);

			//Other
			}else{
				var answerText = SepiaFW.local.g('notPossibleInDemoMode');
				serviceResult = Services.buildServiceResult(
					nluInput.user, nluInput.language, 
					nluResult.command, answerText, '', '', ''
				);
			}
		}
		return serviceResult;
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
		
		//Get dummy list service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = Services.buildAlarmCardInfoDummy(undefined, undefined, nluResult.language);
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
			var actionInfo = [SepiaFW.offline.getUrlOpenAction(url)];
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}

	//----- Actions builder -----

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

	//----- Cards dummy data -----

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
			"name": "Find to-do list", "checked": true, "dateAdded": dateAdded
		}, {
			"name": "Check-out tutorial and (this) demo", "checked": false, "state": "inProgress", "dateAdded": dateAdded
		}, {
			"name": "Install own SEPIA server", "checked": false, "dateAdded": dateAdded
		}, {
			"name": "Create own services and commands", "checked": false, "dateAdded": dateAdded
		}, {
			"name": "Find alarms in shortcut-menu", "checked": false, "dateAdded": dateAdded
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
	Services.buildAlarmCardInfoDummy = function(id, alarmData, language){
		var dateAdded = new Date().getTime() - 300000;
		var id = id || ("BCDEx123456"); 	//usually this is defined by database id generator
		var data = alarmData;
		if (!alarmData){
			//dummy dates
			//5min
			var time1 = (dateAdded + 600000);
			var date1 = new Date(time1);
			var dateString1 = date1.toLocaleDateString();
			var day1 = date1.toLocaleDateString(language, {weekday: 'long'});
			var timeString1 = date1.toLocaleTimeString();
			//24h
			var time2 = (dateAdded + 300000 + (60000*60*24));
			var date2 = new Date(time2);
			var dateString2 = date2.toLocaleDateString();
			var day2 = date2.toLocaleDateString(language, {weekday: 'long'});
			var timeString2 = date2.toLocaleTimeString();
			data = [{
				"name": "5min Alarm", "eleType": "alarm", "repeat": "onetime", "activated": false,
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

		var cardInfo = [{
			"cardType": "uni_list",
			"N": 1,
			"info": [{
				"indexType": "alarms",
				"data": data,
				"section": "timeEvents",
				"_id": id,
				"title": "alarmClock",
				"type": "userDataList",
				"lastEdit": dateAdded,
				"user": user,
				"group": "alarms"
			}]
		}];
		return cardInfo;
	}
	
	return Services;
}