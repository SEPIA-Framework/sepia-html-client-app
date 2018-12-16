//Embedded NLU (e.g. for demo/offline mode)
function sepiaFW_build_embedded_nlu(){
	var Nlu = {};
	
	//Get an NluResult (just like the server would produce it)
	Nlu.interpretMessage = function(message){
		var dataType = message.data.dataType;
		var lang = message.data.parameters.lang;
		var text = message.text;

		var nluResult = {
			"result": "fail",
			"environment": "all",
			"mood": 6,
			"bestDirectMatch": "---",
			"context": "default",
			"certainty": 1.00,
			"language": lang,
			"parameters": {}
		};
		if (dataType = "openText"){
			//Mixed languages:

			//Lists
			if (text.match(/list|todo/gi)){
				nluResult.result = "success";
				nluResult.context = "lists";
				nluResult.parameters = {
					"list_type": "<todo>",
					"list_item": "",
					"list_subtype": "",
					"action": "<show>"
				};
				nluResult.command = "lists";
			
			//News
			}else if (text.match(/news|nachrichten/gi)){
				nluResult.result = "success";
				nluResult.context = "news";
				nluResult.parameters = {
					"news_type": "",
					"news_section": "",
					"sports_team": "",
					"sports_league": ""
				};
				nluResult.command = "news";
			
			//Radio
			}else if (text.match(/radio|music|musik/gi)){
				nluResult.result = "success";
				nluResult.context = "music_radio";
				nluResult.parameters = {
					"radio_station": "",
					"genre": "rock",
					"action": "<on>"
				};
				nluResult.command = "music_radio";
			}
			return nluResult;
		}else{
			SepiaFW.debug.info("Embedded.Nlu - offline NLU cannot handle data-type: " + dataType);
		}
		return nluResult;
	}
	
	return Nlu;
}