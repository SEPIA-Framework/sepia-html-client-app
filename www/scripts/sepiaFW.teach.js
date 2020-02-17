//Teach UI
function sepiaFW_build_teach(){
	var Teach = {};
	
	//some states
	var wasLoaded = false;
	Teach.isOpen = false;
	
	//some statics
	var selectedFirstTime = true;
	var nextStartingFrom = 0;
	var loadAtOnce = 10;
	var services;
	var defaultServices;

	var customButtonShowState = false;

	//--------- broadcasting methods ----------

	function broadcastPersonalCommandChange(){
		//Reset custom buttons
		if (SepiaFW.ui.customButtons){
			SepiaFW.ui.customButtons.isOutdated = true;
			SepiaFW.ui.customButtons.onMyViewRefresh();
		}
	}

	//-----------------------------------------
	
	Teach.openUI = function(info){
		if (!wasLoaded){
			Teach.setup(function(){
				Teach.openUI(info);
			});
			wasLoaded = true;
			return;
		
		}else{
			$('#sepiaFW-teachUI-view').slideDown(300, function(){
				Teach.uic.refresh();
				
				//add stuff
				if (info){
					//clean first
					$('#sepiaFW-teach-input').val("");
					$('#sepiaFW-teach-parameters').find("[data-name]").val("");
					$('#sepiaFW-teach-commands').val("");
					//fill now
					if (info.input){
						$('#sepiaFW-teach-input').val(info.input);
					}
					if (info.service || info.cmd){
						$('#sepiaFW-teach-commands').val(info.service || info.cmd);
					}
					//TODO: we could add parameters ...
				}
			});
			Teach.isOpen = true;
			SepiaFW.ui.switchSwipeBars('teach');
		}
	}
	Teach.closeUI = function(){
		$('#sepiaFW-teachUI-view').slideUp(300);
		Teach.isOpen = false;
		SepiaFW.ui.switchSwipeBars();
	}
	
	Teach.loadServices = function(successCallback, errorCallback){
		defaultServices = {
			chat : {
				command : "chat",
				name : "Chat/smalltalk",
				desc : "Use this command to define a simple reply to any input.",
				help : "<p><u><b>Example:</b></u></p>" 
						+ "<i>When I say ...</i>" 
						+ "<br>What did the Buddhist say to the hot dog vendor?<br><br>"
						+ "<i>the assistant does ...</i><br>"
						+ "Chat/smalltalk<br><br>"
						+ "<i>and says ... (reply):</i><br>"
						+ "Make me one with everything.<br><br>"
					,
				parameters : [{
					value : "reply",
					name : "and says ..."
				}]
			}
		};
		Teach.loadTeachUiServices(SepiaFW.account.getKey(), function(servicesJson){
			//success
			services = servicesJson;
			if (successCallback) successCallback(services);
		}, function(msg){
			//error
			if (errorCallback) errorCallback(msg);
		});
	}
	function buildCommandHelpPopup(cmd){
		var html = "<p><b>Command: " + cmd + "</b></p>";
		if (services[cmd] && services[cmd].help){
			if (services[cmd].desc){
				html += "<p class='accent'>" + services[cmd].desc + "</p>";
			}
			html += services[cmd].help;
		}else{
			html += "<p>Sorry, no help available for this command.</p>";
		}
		return html;
	}
	
	Teach.setup = function(finishCallback){
		//setup commands and parameters
		if (!services){
			Teach.loadServices(function(){
				//success ... continue setup
				Teach.setup(finishCallback);
			}, function(){
				//fail ... notify and load a basic set
				SepiaFW.ui.showPopup('Could not load services list from server :-( - Using default set!');
				services = defaultServices;
				Teach.setup(finishCallback);
			});
			return;
		}
		
		//get HTML
		SepiaFW.files.fetch("teach.html", function(teachUiHtml){
            $('#sepiaFW-teachUI-view').html(teachUiHtml);
			
			//nav-bar
			$('#sepiaFW-teachUI-close').on('click', function(){
				Teach.closeUI();
			});
			$('#sepiaFW-teachUI-show-editor').on('click', function(){
				Teach.uic.showPane(0);
			});
			$('#sepiaFW-teachUI-show-manager').on('click', function(){
				Teach.uic.showPane(1);
			});
			
			//teachUI carousel
			var isFirstManagerLoad = true;
			Teach.uic = new SepiaFW.ui.Carousel('#sepiaFW-teachUI-carousel', '', '#sepiaFW-swipeBar-teach-left', '#sepiaFW-swipeBar-teach-right', '',
				function(currentPane){
					$("#sepiaFW-teachUI-nav-bar-page-indicator").find('div').removeClass("active");
					$("#sepiaFW-teachUI-nav-bar-page-indicator > div:nth-child(" + (currentPane+1) + ")").addClass('active').fadeTo(350, 1.0).fadeTo(350, 0.0);
					if (currentPane == 1){
						//manager active
						if (isFirstManagerLoad){
							isFirstManagerLoad = false;
							$('#sepiaFW-teachUI-load-commands').trigger('click');
						}
					}else if (currentPane == 0){
						//editor active
					}
				});
			Teach.uic.init();
			Teach.uic.showPane(0);
			
			//populate service select
			$.each(services, function(key, value){
				var option = document.createElement('OPTION');
				option.value = value.command;
				option.innerHTML = value.name;
				$('#sepiaFW-teach-commands').append(option);
			});

			//build rest of menu:

			//-CUSTOM BUTTON TOGGLE SHOW
			document.getElementById('sepiaFW-teach-cbutton-toggle-li').appendChild(SepiaFW.ui.build.toggleButton('sepiaFW-teach-cbutton-show', 
				function(){
					customButtonShowState = true;
				},function(){
					customButtonShowState = false;
				}, customButtonShowState)
			);
			
			//buttons:
			
			//-SUBMIT (TEACH)
			$('#sepiaFW-teachUI-submit').on('click', function(){
				var submitData = buildTeachInput();
				if (!submitData){
					return;
				}
				Teach.submitPersonalCommand(SepiaFW.account.getKey(), submitData, function(){
					//success
					SepiaFW.ui.showPopup('New command has been stored! :-)');
				}, function(msg){
					//error
					SepiaFW.ui.showPopup(msg);
				}, '');
			});
			//-SHOW OPTIONAL PARAMETERS
			$('#sepiaFW-teachUI-show-optionals').on('click', function(){
				$('#sepiaFW-teach-parameters').find('.optional').fadeToggle(300);
			});
			//-SELECT SERVICE
			$('#sepiaFW-teach-commands').on('change', function(){
				populateParameterBox(this.value);
			});
			//-SERVICE HELP
			$('#sepiaFW-teachUI-command-help').on('click', function(){
				var cmd = $('#sepiaFW-teach-commands').val();
				if (cmd){
					SepiaFW.ui.showPopup(buildCommandHelpPopup(cmd), {
						buttonOneName : SepiaFW.local.g('ok'),
						buttonOneAction : function(){},
						buttonTwoName : SepiaFW.local.g('more'),
						buttonTwoAction : function(){
							SepiaFW.ui.actions.openUrlAutoTarget("https://github.com/SEPIA-Framework/sepia-html-client-app/blob/master/TEACH-UI.md");
						}
					});
				}else{
					SepiaFW.ui.showPopup(SepiaFW.local.g('chooseCommand'), {
						buttonOneName : SepiaFW.local.g('ok'),
						buttonOneAction : function(){},
						buttonTwoName : SepiaFW.local.g('more'),
						buttonTwoAction : function(){
							SepiaFW.ui.actions.openUrlAutoTarget("https://github.com/SEPIA-Framework/sepia-html-client-app/blob/master/TEACH-UI.md");
						}
					});
				}
			});

			//-SHOW ICONS
			$('#sepiaFW-teach-custom-button-select').on('click', function(){
				SepiaFW.ui.showAllIconsInPopUp(function(iconId){
					$('#sepiaFW-teach-custom-button-icon').val(iconId);
					SepiaFW.ui.hidePopup();
				});
			});
			
			//-LOAD commands
			$('#sepiaFW-teachUI-load-commands').on('click', function(){
				var startingFrom = 0;
				nextStartingFrom = 10;
				Teach.loadPersonalCommands(SepiaFW.account.getKey(), startingFrom, loadAtOnce, function(data){
					//success
					buildPersonalCommandsResult(data.result, true);
					//console.log(JSON.stringify(data));
					
				}, function(msg){
					//error
					SepiaFW.ui.showPopup(msg);
				}, '');
			});
			//-LOAD more commands
			$('#sepiaFW-teachUI-load-more-commands').on('click', function(){
				var startingFrom = nextStartingFrom;
				nextStartingFrom += 10;
				Teach.loadPersonalCommands(SepiaFW.account.getKey(), startingFrom, loadAtOnce, function(data){
					//success
					buildPersonalCommandsResult(data.result, false);
					//console.log(JSON.stringify(data));
					
				}, function(msg){
					//error
					SepiaFW.ui.showPopup(msg);
				}, '');
			});
			
			if (finishCallback) finishCallback();
		});
	}
	
	//make parameter entry
	function makeParameter(uiName, pName, isOptional, parentBlock){
		var label = document.createElement('LABEL');
		label.innerHTML = uiName;
		var input = document.createElement('INPUT');
		input.className = "sepiaFW-teach-parameter-input";
		$(input).attr("data-name", pName);
		$(input).attr("type", "text");
		if (isOptional){
			label.className = "optional";
			input.className += " optional";
		}
		$(parentBlock).append(label);
		$(parentBlock).append(input);
	}
	//populate parameter input box
	function populateParameterBox(cmd, onFinishCallback){
		var service = services[cmd];
		var parameterBox = $('#sepiaFW-teach-parameters');
		$('#sepiaFW-teachUI-show-optionals').fadeOut(300);
		parameterBox.fadeOut(300, function(){
			parameterBox.html('');
			var hasOptionals = false;
			if ('parameters' in service && service.parameters.length > 0){
				$.each(service.parameters, function(index, p){
					makeParameter(p.name, p.value, p.optional, parameterBox[0]);
					if (p.optional){
						hasOptionals = true;
					}
				});
				parameterBox.fadeIn(300);
				if (hasOptionals){
					$('#sepiaFW-teachUI-show-optionals').fadeIn(300);
				}
			}
			$('#sepiaFW-teachUI-submit').fadeIn(300);
			if (onFinishCallback) onFinishCallback(parameterBox[0]);
			//if it's the first time show custom button field now
			if (selectedFirstTime){
				selectedFirstTime = false;
				$('#sepiaFW-teach-button-config').fadeIn(300);
			}
		});
	}
	
	//--Load commands to UI--
	
	function loadCommandToEditor(data){
		var text = data.text || data.tagged_text;
		var cmd = data.cmd_summary.replace(/;;.*/,'').trim();
		var params = data.params;
		var service = services[cmd];
		var cmdData = data.data;
		//check support
		if (!service){
			SepiaFW.ui.showPopup('Sorry but this command cannot be edited here yet (custom service?).');
			return;
		}
		//fill UI
		$('#sepiaFW-teach-input').val(text);
		$('#sepiaFW-teach-commands').val(cmd);
		populateParameterBox(cmd, function(parameterBox){
			$.each(params, function(key, value){
				$(parameterBox).find('[data-name="' + key + '"]').each(function(){
					this.value = value;
				});
			});
		});
		//fill custom button
		if (cmdData && cmdData.button){
			var name = cmdData.button.name || "";
			var icon = cmdData.button.icon || "";
			var state = cmdData.show_button || false;
			$('#sepiaFW-teach-custom-button-name').val(name);
			$('#sepiaFW-teach-custom-button-icon').val(icon);
			setCustomToggleButton(state);
		}else{
			$('#sepiaFW-teach-custom-button-name').val("");
			$('#sepiaFW-teach-custom-button-icon').val("");
			setCustomToggleButton(false);
		}
	}

	function setCustomToggleButton(newStateTrueFalse){
		if (customButtonShowState === newStateTrueFalse){
			return;
		}else{
			$("#sepiaFW-teach-cbutton-show").trigger('click');
		}
	}
	
	//build result for command manager page
	function buildPersonalCommandsResult(data, clearBox){
		var cmdCardsBox = $('#sepiaFW-teachUI-manager').find('.sepiaFW-command-cards-container');
		if (clearBox){
			cmdCardsBox.html('');
		}
		$.each(data, function(index, obj){
			var sentence = obj.sentence[0];
			var id = obj.id;
			if (sentence && id){
				var newCmdCard = makeCmdCard(sentence, id);
				cmdCardsBox.append(newCmdCard);
				(function(card){
					$(card).find('.cmdLabel').on('click', function(){
						//on label click
						//console.log('sentence: ' + card.dataset.sentence);
						loadCommandToEditor(JSON.parse(card.dataset.sentence));
						Teach.uic.showPane(0);
					});
					$(card).find('.cmdRemoveBtn').on('click', function(){
						//on remove click
						SepiaFW.animate.flashObj(this);
						var cmdId = card.dataset.id;
						Teach.removePersonalCommand(SepiaFW.account.getKey(), cmdId, function(){
							//success
							//SepiaFW.ui.showPopup('This personal command has been deleted!');
							$(card).fadeOut(300, function(){
								$(card).remove();
							});
						}, function(msg){
							//error
							alert(msg);
						}, '');
					});
				})(newCmdCard);
			}
		});
		//show more?
		if (data && data.length>=10){
			$('#sepiaFW-teachUI-manager-bottom-buttons').fadeIn(300);
		}else if (data){
			$('#sepiaFW-teachUI-manager-bottom-buttons').fadeOut(300);
		}
	}
	function makeCmdCard(sentence, cmdId){
		var newCard = document.createElement('DIV');
		newCard.className = 'sepiaFW-command-card';
		newCard.innerHTML = "<div class='cmdLabel'>"
								+ "<span>" + (sentence.text.replace(/</g, "&lt;") || sentence.tagged_text.replace(/</g, "&lt;")) + "</span>"
							+ "</div>"
							+ "<div class='cmdRemoveBtn'>"
								+ "<span>" + "<i class='material-icons md-24'>&#xE15B;</i>" + "</span>"
							+ "</div>"
		newCard.dataset.id = cmdId;
		newCard.dataset.sentence = JSON.stringify(sentence);
		return newCard;
	}
	
	//--Build command--
	
	//build JSON teach string
	function buildTeachInput(){
		var submit = new Object();
		
		//get base command
		var cmd = $('#sepiaFW-teach-commands').val();
		if (!cmd){
			//TODO: improve
			SepiaFW.ui.showPopup('Please select a command first');
			return;
		}
		var cmdSum = cmd + ";;";
		
		//get text
		var txt = $('#sepiaFW-teach-input').val();
		if (!txt){
			//TODO: improve
			SepiaFW.ui.showPopup('Please enter a sentence for the new command first');
			return;
		}
		
		//get parameter mapping
		var parameters = getParameters();
		$.each(parameters, function(p, v){
			cmdSum += p.replace(/<|>/g,'').trim() + "=" + v + ";;";
		});

		//data - custom button
		var customButton = {
			"name" : $('#sepiaFW-teach-custom-button-name').val(),
			"icon" : $('#sepiaFW-teach-custom-button-icon').val()
		}
		var data = {
			"show_button" : customButtonShowState,
			"button" : customButton
		};
		
		//other stuff - TODO: make editable
		var overwriteExisting = true; 		//check if a command exists and overwrite?
		var env = "all";		//any specific environment?
		var pub = "no";			//public?
		var isLocal = "no";		//local action?
		var explicit = "no";	//explicit content?
		
		var state = SepiaFW.assistant.getState();
		var language = state.lang;
		var userLocation = (state.user_location && state.user_location.latitude)? 
					(state.user_location.latitude + ', ' + state.user_location.longitude).trim() : "";
		
		//build
		submit.environment = env;
		submit.language = language;
		submit.user_location = userLocation || "";
		if (!!txt.match(/<\w+>/)){
			//we allow this currently only for sentence_connect - TODO: add more
			if (cmd == "sentence_connect"){
				submit.sentence = txt;
				submit.tagged_sentence = txt;
			}else{
				submit.sentence = '';
				submit.tagged_sentence = txt;
			}
		}else{
			submit.sentence = txt;
			submit.tagged_sentence = '';
		}
		submit.params = JSON.stringify(parameters);
		submit.command = cmd;
		submit.cmd_summary = cmdSum;
		submit.public = pub;
		submit.local = isLocal;
		submit.explicit = explicit;
		submit.overwriteExisting = overwriteExisting;
		submit.data = JSON.stringify(data);
		
		//console.info("Submit: " + JSON.stringify(submit));		//DEBUG
		return submit;
	}
	
	//get all parameters
	function getParameters(){
		var parameters = new Object();
		$("#sepiaFW-teach-parameters").find("input").each(function(){
			var name = $(this).data('name');
			if (name){
				var value = $(this).val() || "";
				if (value){
					//treat some special parameters:
					if (name === 'sentences'){
						value = value.replace(/(\.|;)\s/g, " && ");
					}
					//parameters["<" + name + ">"] = value; 		//we should really not do this! Lets see if it still works
					parameters[name] = value;
				}
			}
		});
		return parameters;
	}
	
	//--Call server--

	//load services list for Teach-UI
	Teach.loadTeachUiServices = function(key, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + "getTeachUiServices";
		var submitData = new Object();
		submitData.KEY = key;
		submitData.client = SepiaFW.config.getClientDeviceInfo();
		$.ajax({
			url: apiUrl,
			timeout: 10000,
			type: "POST",
			data: submitData,
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (debugCallback) debugCallback(data);
				if (data.result && data.result === "fail"){
					if (errorCallback) errorCallback('Sorry, but something went wrong while loading teach-UI services! :-(');
					return;
				}else{
					//convert result
					var json;
					try{
						json = JSON.parse(data.result);
						if (successCallback) successCallback(json);
					}catch (error){
						if (errorCallback) errorCallback('Sorry, but something went wrong while reading teach-UI services data! (wrong format?) :-(');
					}
				}
			},
			error: function(data) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback('Sorry, but I could not connect to API :-( Please wait a bit and then try again.');
				if (debugCallback) debugCallback(data);
			}
		});
	}
	
	//submit new command
	Teach.submitPersonalCommand = function(key, submitData, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + "submitPersonalCommand";
		submitData.KEY = key;
		submitData.client = SepiaFW.config.getClientDeviceInfo(); //SepiaFW.config.clientInfo;
		var config = {
			url: apiUrl,
			timeout: 10000,
			type: "POST",
			data: submitData,
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			}
		};
		config.success = function(data) {
			SepiaFW.ui.hideLoader();
			if (debugCallback) debugCallback(data);
			if (data.result && data.result === "fail"){
				if (errorCallback) errorCallback('Sorry, but something went wrong during teach process! Maybe invalid data or authentication not possible?');
				return;
			}
			//--callback--
			if (successCallback) successCallback(data);
			//broadcast (but wait a bit for DB changes)
			setTimeout(function(){
				broadcastPersonalCommandChange();
			}, 3000);
		};
		config.error = function(data) {
			SepiaFW.ui.hideLoader();
			if (errorCallback) errorCallback('Sorry, but I could not connect to API :-( Please wait a bit and then try again.');
			if (debugCallback) debugCallback(data);
		};
		$.ajax(config);
	}
	
	//load personal commands
	Teach.loadPersonalCommands = function(key, startingFrom, loadSize, successCallback, errorCallback, debugCallback, with_button_only){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + "getAllPersonalCommands";
		var submitData = new Object();
		submitData.KEY = key;
		submitData.client = SepiaFW.config.getClientDeviceInfo(); //SepiaFW.config.clientInfo;
		submitData.from = startingFrom;
		submitData.size = loadSize;
		if (with_button_only){
			submitData.button = true;
		}
		$.ajax({
			url: apiUrl,
			timeout: 10000,
			type: "POST",
			data: submitData,
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (debugCallback) debugCallback(data);
				if (data.result && data.result === "fail"){
					if (errorCallback) errorCallback('Sorry, but something went wrong while loading personal commands! :-(');
					return;
				}
				//--callback--
				if (successCallback) successCallback(data);
			},
			error: function(data) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback('Sorry, but I could not connect to API :-( Please wait a bit and then try again.');
				if (debugCallback) debugCallback(data);
			}
		});
	}
	
	//remove personal command
	Teach.removePersonalCommand = function(key, cmdId, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + "deletePersonalCommand";
		var submitData = new Object();
		submitData.KEY = key;
		submitData.client = SepiaFW.config.getClientDeviceInfo(); //SepiaFW.config.clientInfo;
		submitData.id = cmdId;
		$.ajax({
			url: apiUrl,
			timeout: 10000,
			type: "POST",
			data: submitData,
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			success: function(data) {
				SepiaFW.ui.hideLoader();
				if (debugCallback) debugCallback(data);
				if (data.result && data.result === "fail"){
					if (errorCallback) errorCallback('Sorry, but something went wrong while trying to delete the command! Maybe invalid id?');
					return;
				}
				//--callback--
				if (successCallback) successCallback(data);
			},
			error: function(data) {
				SepiaFW.ui.hideLoader();
				if (errorCallback) errorCallback('Sorry, but I could not connect to API :-( Please wait a bit and then try again.');
				if (debugCallback) debugCallback(data);
			}
		});
	}
	
	return Teach;
}