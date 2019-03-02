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
			"environment": SepiaFW.config.environment,
			"mood": 6,
			"bestDirectMatch": "---",
			"context": "default",
			"certainty": 1.00,
			"language": lang,
			"parameters": {}
		};
		//DIRECT CMD
		if (dataType == "directCmd"){
			//convert cmd string
			var data = message.text.split(";;");
			var cmd = data[0];
			nluResult.command = cmd;
			nluResult.context = cmd; 		//this would usually carry more data (e.g. last 3 contexts)
			nluResult.parameters = {};
			if (data.length > 1){
				for (var i=1; i<data.length; i++){
					var pair = data[i].split('=');
					var k = pair.shift();
					var v = pair.join('=');
					if (!!k && v != undefined){
						nluResult.parameters[k] = v;
					}
				}
			}
			nluResult.result = "success";
			//console.log(message.text);
			//console.log(JSON.stringify(nluResult));

		//TEXT
		}else if (dataType == "openText"){
			//Mixed languages:

			//Lists
			if (text.match(/list|todo/gi)){
				getListCmd(nluResult);
			
			//News
			}else if (text.match(/news|nachrichten/gi)){
				getNewsCmd(nluResult);
			
			//Radio
			}else if (text.match(/radio|music|musik/gi)){
				getRadioCmd(nluResult);
			}
			return nluResult;
		}else{
			SepiaFW.debug.info("Embedded.Nlu - offline NLU cannot handle data-type: " + dataType);
		}
		return nluResult;
	}

	//List
	function getListCmd(nluResult){
		nluResult.result = "success";
		nluResult.context = "lists";
		nluResult.parameters = {
			"list_type": "<todo>",
			"list_item": "",
			"list_subtype": "",
			"action": "<show>"
		};
		nluResult.command = "lists";
		return nluResult;
	}

	//News
	function getNewsCmd(nluResult){
		nluResult.result = "success";
		nluResult.context = "news";
		nluResult.parameters = {
			"news_type": "",
			"news_section": "",
			"sports_team": "",
			"sports_league": ""
		};
		nluResult.command = "news";
		return nluResult;
	}

	//Radio
	function getRadioCmd(nluResult){
		nluResult.result = "success";
		nluResult.context = "music_radio";
		nluResult.parameters = {
			"radio_station": "",
			"genre": "rock",
			"action": "<on>"
		};
		nluResult.command = "music_radio";
		return nluResult;
	}
	
	return Nlu;
}