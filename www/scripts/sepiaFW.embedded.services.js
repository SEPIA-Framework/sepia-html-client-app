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
		if (nluResult.result = "success"){
			//Lists
			if (nluResult.command == "lists"){
				serviceResult = Services.lists(nluInput, nluResult);
			
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
	
	//Embedded list service
	Services.lists = function(nluInput, nluResult){
		//Get dummy answer
		var answerText = "Ok";
		
		//Get dummy list service-result
		var serviceResult;
		if (SepiaFW.offline){
			var cardInfo = SepiaFW.offline.buildListCardInfoDummy();
			var actionInfo = "";
			var htmlInfo = "";
			serviceResult = Services.buildServiceResult(
				nluInput.user, nluInput.language, 
				nluResult.command, answerText, cardInfo, actionInfo, htmlInfo
			);
		}
		return serviceResult;
	}
	
	return Services;
}