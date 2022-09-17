//Teach UI
function sepiaFW_build_teach(sepiaSessionId){
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
	var parameterCommons;

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
		$('#sepiaFW-main-window')
			.addClass('sepiaFW-teach-mode')
			.removeClass('sepiaFW-skin-mod');
		
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
					//load command via ID?
					if (info.commandId){
						SepiaFW.teach.loadPersonalCommandsWithIds(SepiaFW.account.getKey(sepiaSessionId), [info.commandId], 
							function(data){
								//result should be exactly one entry
								if (data.result && data.result.length == 1){
									var cmd = data.result[0];
									if (cmd.id == info.commandId){
										if (cmd.sentence && cmd.sentence.length == 1){
											loadCommandToEditor(cmd.sentence[0]);
										}
									}else{
										SepiaFW.debug.error("Teach-UI wanted to load command ID '" + info.commandId + "' but found '" + cmd.id + "'. HOW?!");
									}
								}else{
									SepiaFW.ui.showPopup("Sorry but something went wrong while loading the data :-(");		//TODO: localize	
								}
							}, 
							function(errMsg){
								SepiaFW.ui.showPopup(errMsg);		//TODO: localize
							}
						);
					//load command via given data?
					}else{
						//fill now
						if (info.input){
							$('#sepiaFW-teach-input').val(info.input);
						}
						if (info.service || info.cmd){
							$('#sepiaFW-teach-commands').val(info.service || info.cmd);
						}
						//TODO: we could add parameters ...
					}
				}
			});
			Teach.isOpen = true;
			SepiaFW.ui.switchSwipeBars('teach');
		}
	}
	Teach.closeUI = function(){
		$('#sepiaFW-main-window')
			.removeClass('sepiaFW-teach-mode')
			.addClass('sepiaFW-skin-mod');
		
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
					name : "and says ...",
					type : "text",
					examples : {
						"0" : ["Hello world :-)"]
					}
				}]
			}
		};
		if (SepiaFW.client.isDemoMode()){
			//add demo note
			services = $.extend(true, {
				demo: {
					command: "demo",
					name: "Just a demo",
					desc: "Offline Teach-UI demo service.",
					help: "To use the Teach-UI please connect to your SEPIA server.",
					parameters: [{
						value : "required",
						name : "A required parameter (yes, no)",
						examples : {
							"1" : ["&lt;yes&gt;", "&lt;no&gt;"],
							"2" : [{"value": "yes", "value_local": "Ja"}],
							"3" : ["of cause", "never"]
						}
					},{
						value : "optional",
						name : "An optional parameter (more info)",
						optional : true,
						examples : {
							"1" : ["&lt;type_a&gt;", "&lt;type_b&gt;", "&lt;setting&gt;;;C"],
							"2" : [	
									{"value": "type_A", "value_local": "local name for type A value"},
									{"value": "type_B", "value_local": "local name for type B"}
								  ],
							"3" : ["type A", "the property B", "my configuration C"]
						}
					},{
						value : "optional",
						name : "An optional reply",
						optional : true,
						type : "text"
					}]
				}
			}, defaultServices);
			if (successCallback) successCallback(services);
		}else{
			Teach.loadTeachUiServices(SepiaFW.account.getKey(sepiaSessionId), function(servicesJson){
				//success
				if (servicesJson){
					if (servicesJson.commands){
						services = servicesJson.commands;
						parameterCommons = servicesJson.parameter_commons;
					}else{
						services = servicesJson;	//old version
						parameterCommons = {};
					}
					if (successCallback) successCallback(services);
				}else{
					//error
					if (errorCallback) errorCallback("services result was empty.");	
				}
			}, function(msg){
				//error
				if (errorCallback) errorCallback(msg);
			});
		}
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
				parameterCommons = {};
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
							loadRecentCommands();
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
				option.textContent = value.name;
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
				Teach.submitPersonalCommand(SepiaFW.account.getKey(sepiaSessionId), submitData, function(){
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
			//-IMPORT COMMAND
			$('#sepiaFW-teachUI-import').on('click', function(){
				SepiaFW.ui.showFileImportAndViewPopup(
					"Drag & drop command file here or add data:", {
						addFileSelect: true,
						accept: ".json",
						buttonOneName: "Import",
						buttonTwoName: "Abort",
						initialPreviewValue: "- Import data -"
					}, 
					function(readRes, viewTxtArea){
						//read
						if (readRes){
							var parsedData = JSON.parse(readRes);
							viewTxtArea.value = JSON.stringify(parsedData, null, 2);
						}
					}, function(viewTxtAreaValue, viewTxtArea){
						//confirm and close
						if (viewTxtAreaValue){
							var parsedData = JSON.parse(viewTxtAreaValue);
							loadCommandToEditor(parsedData);
							Teach.uic.showPane(0);
						}
					}, function(err, viewTxtArea){
						//read error
						viewTxtArea.value = "- ERROR -";
					}
				);
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

			//-SEARCH commands
			var $cmdSearchInput = $('#sepiaFW-teachUI-cmd-search');
			function searchCommands(){
				var searchText = $cmdSearchInput.val();
				if (searchText){
					Teach.searchPersonalCommands(SepiaFW.account.getKey(sepiaSessionId), searchText, function(data){
						//success
						$cmdSearchInput.val("");
						buildPersonalCommandsResult(data.result, true, "Search Results:");
						//console.log(JSON.stringify(data));
						$('#sepiaFW-teachUI-load-more-commands').fadeIn(300);
						
					}, function(msg){
						//error
						SepiaFW.ui.showPopup(msg);
					}, '');
				}
			}
			$cmdSearchInput.keydown(function(event){
				if (event.key == "Enter"){
					searchCommands();
				}
			});
			$('#sepiaFW-teachUI-cmd-search-btn').on('click', function(){
				searchCommands();
			});
			
			//-LOAD commands (recent)
			function loadRecentCommands(){
				var startingFrom = 0;
				nextStartingFrom = 8;	//reset
				var loadMax = 8;
				Teach.loadPersonalCommands(SepiaFW.account.getKey(sepiaSessionId), startingFrom, loadMax, function(data){
					//success
					buildPersonalCommandsResult(data.result, true, "Recent:");
					//console.log(JSON.stringify(data));
					$('#sepiaFW-teachUI-load-more-commands').fadeIn(300);
					
				}, function(msg){
					//error
					SepiaFW.ui.showPopup(msg);
				}, '', {
					sortByDate: true
				});
			}
			$('#sepiaFW-teachUI-load-commands').on('click', function(){
				loadRecentCommands();
			});
			//-LOAD more commands
			function loadMoreCommands(){
				var startingFrom = nextStartingFrom;
				nextStartingFrom += loadAtOnce;
				Teach.loadPersonalCommands(SepiaFW.account.getKey(sepiaSessionId), startingFrom, loadAtOnce, function(data){
					//success
					var resultComment;
					var startN = (startingFrom + 1);
					var endN = (data.result && data.result.length)? (startingFrom + data.result.length) : 0;
					//show more?
					if (data.result && data.result.length < loadAtOnce){
						resultComment = (startN != endN)? ("Last " + startN + "-" + endN) : "Last";
						$('#sepiaFW-teachUI-load-more-commands').fadeOut(300);
					}else if (endN){
						resultComment = "Next "  + startN + "-" + endN;
					}else{
						resultComment = "Done";
					}
					buildPersonalCommandsResult(data.result, startingFrom == 0, resultComment);
					//console.log(JSON.stringify(data));
					
				}, function(msg){
					//error
					SepiaFW.ui.showPopup(msg);
				}, '', {
					sortByDate: true
				});
			}
			$('#sepiaFW-teachUI-load-more-commands').on('click', function(){
				loadMoreCommands();
			});
			
			if (finishCallback) finishCallback();
		});
	}

	//TODO: replace ancient pop-up functions with 'UI.showPopup' (or convenience version)

	//parameter input help box pop-up
	function showInputHelpPopup(paramName, value, assignFun, type, examples){
		var $box = $('#sepiaFW-teachUI-input-helper');
		var $input = $box.find(".sepiaFW-input-popup-value-1");
		var $title = $box.find(".sepiaFW-input-popup-title");
		var $examples = $box.find(".sepiaFW-input-popup-examples");
		var $select = $box.find('.sepiaFW-input-popup-select-1');
		var $note = $box.find('.sepiaFW-input-popup-note-1');
		$note.html("").hide();
		$input[0].style.height = "auto";
		$('#sepiaFW-teachUI-input-helper-cover').fadeIn(200);
		//$('#sepiaFW-teachUI-input-helper-cover').show();
		setTimeout(function(){
			$input.focus();
		}, 0);
		//convert value format
		var isText = (type == "text");
		var isGeneric = (type == "generic");
		value = value.trim();
		if (isText){
			$box.find('.show-if-text').show();
			$box.find('.show-if-default').hide();
			$input.val(value);
			$input[0].style.height = "auto";
			$select.val(0);
		}else{
			$box.find('.show-if-text').hide();
			$box.find('.show-if-default').show();
			if (isGeneric){
				$box.find('.in-type-raw').hide();
			}
			if (value.indexOf("{") == 0){
				$input.val(JSON.stringify(JSON.parse(value), undefined, 4));
				$input[0].style.height = ($input[0].scrollHeight + 8 + "px");
				$select.val(2);
			}else if (value.indexOf("<i_raw>") == 0){
				$input.val(value.replace(/^<i_raw>/, "").trim());
				$input[0].style.height = "auto";
				$select.val(3);
			}else{
				$input.val(value);
				$input[0].style.height = "auto";
				$select.val(1);
			}
		}
		$title.html("<label>'" + paramName + "'</label><p>Select your input type and enter value</p>");
		//add examples
		addInputHelpExample(examples, $select.val(), $examples);
		$select.off().on('change', function(){
			addInputHelpExample(examples, $select.val(), $examples);
		});
		//confirm
		$box.find(".sepiaFW-input-popup-confirm").off().on('click', function(){
			//convert format
			var value = $input.val().trim();
			if (!isText){
				var typeSelected = $select.val();
				var isJson = value.indexOf("{") == 0;
				var isRaw = value.indexOf("<i_raw>") == 0;
				//JSON
				if (typeSelected == 2 && isJson){
					value = JSON.stringify(JSON.parse(value));
				}else if (typeSelected == 2 && !isJson){
					$input.val(JSON.stringify({"value": value}, undefined, 4));
					$input[0].style.height = ($input[0].scrollHeight + 8 + "px");
					$note.html("The selected type requires a value in JSON format and has been converted. Please review the result.")
						.show().fadeTo(150, 0.1).fadeTo(150, 1.0);
					return;
				}else if (isJson){
					$note.html("The selected type does NOT allow a value in JSON format. Please change type or adjust value format.")
						.show().fadeTo(150, 0.1).fadeTo(150, 1.0);
					return;
				//RAW
				}else if (typeSelected == 3 && !isRaw){
					value = "<i_raw>" + value.replace(/^<(.*?)>/, "$1 ").replace(/;;/g, " ").trim();
				}else if (isRaw){
					value = value.replace(/^<i_raw>/, "").trim();
				}
			}
			assignFun(value);
			closeInputHelpPopup();
		});
		$box.find(".sepiaFW-input-popup-abort").off().on('click', function(){
			closeInputHelpPopup();
		});
	}
	function addInputHelpExample(examples, type, $examples){
		type = (type + "").trim();
		var exLabel = document.createElement('label');
		var exTag = (type == "0")? "Info " : "Examples ";
		exLabel.innerHTML = exTag + "<i class='material-icons md-inherit'>play_circle_outline</i></label>";
		$examples.html(exLabel);
		if (examples && examples[type] && examples[type].length > 0){
			var exBox = document.createElement("div");
			if (type == "2"){
				exBox.style.flexDirection = "column";
			}else{
				exBox.style.justifyContent = "space-around";
			}
			var $exBox = $(exBox);
			//examples for 'all'
			if (examples['all']){
				examples['all'].forEach(function(ex){
					$exBox.append("<span class='parameter-example'>" + SepiaFW.tools.sanitizeHtml(ex) + "</span>");
				});
			}
			//examples for types
			examples[type].forEach(function(ex){
				if (type == "2"){
					ex = JSON.stringify(ex, undefined, 4);
					$exBox.append("<span class='parameter-example json'>" + SepiaFW.tools.sanitizeHtml(ex) + "</span>");
				}else{
					$exBox.append("<span class='parameter-example'>" + SepiaFW.tools.sanitizeHtml(ex) + "</span>");
				}
			});
			$examples.append(exBox);
			if ($examples.hasClass("open")){
				$exBox.show();
			}else{
				$exBox.hide();
			}
			$(exLabel).on('click', function(){
				$examples.toggleClass("open");
				$exBox.toggle(200);
			});
			$examples.show();
		}else{
			$examples.hide();
		}
	}
	function closeInputHelpPopup(){
		//$('#sepiaFW-teachUI-input-helper-cover').hide();
		$('#sepiaFW-teachUI-input-helper-cover').fadeOut(200);
	}
	
	//make parameter entry
	function makeParameter(uiName, pName, isOptional, pType, pExamples, parentBlock){
		var label = document.createElement('LABEL');
		label.textContent = uiName;
		var input = document.createElement('INPUT');
		input.className = "sepiaFW-teach-parameter-input";
		input.placeholder = "click here";
		$(input).attr("data-name", pName);
		$(input).attr("type", "text");
		if (isOptional){
			label.className = "optional";
			input.className += " optional";
		}
		if (!pType)	pType = "default";
		//extra type CSS?
		if (pType && pType == "text"){
			input.className += " text-only";
		}
		$(parentBlock).append(label);
		$(parentBlock).append(input);
		//help popup
		input.readOnly = true;
		$(input).off().on('click', function(){
			showInputHelpPopup(pName, input.value, function(newVal){
				input.value = newVal;
			}, pType, pExamples);
		});
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
					var pAlias = (p.alias? parameterCommons[p.alias] : {}) || {};
					var pValue = p.value || pAlias.value;
					var pName = p.name || pAlias.name;
					var pType = p.type || pAlias.type;
					var pExamples = p.examples || pAlias.examples;
					var isOptional = p.optional;
					makeParameter(pName, pValue, isOptional, pType, pExamples, parameterBox[0]);
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
	function buildPersonalCommandsResult(data, clearBox, headerTitle){
		var cmdCardsBox = $('#sepiaFW-teachUI-manager').find('.sepiaFW-command-cards-container');
		if (clearBox){
			cmdCardsBox.html('');
		}
		if (headerTitle){
			var ht = document.createElement("h3");
			ht.textContent = headerTitle;
			cmdCardsBox.append(ht);
		}
		$.each(data, function(index, obj){
			var sentence = obj.sentence[0];
			var id = obj.id;
			if (sentence && id){
				var newCmdCard = makeCmdCard(sentence, id);
				cmdCardsBox.append(newCmdCard);
				(function(card){
					var $card = $(card);
					$card.find('.cmdDownloadBtn').on('click', function(){
						//on download click
						var data = JSON.parse(card.dataset.sentence);
						var blob = new Blob([card.dataset.sentence], {type: "application/json"});
						var filename = data.text || "command";
						filename = filename.toLowerCase().replace(/\s+/g, "-").replace(/(\?|!|,|;|\.)/g, "") + ".json";
						SepiaFW.files.saveBlobAs(filename, blob, cmdCardsBox[0]);
					});
					$card.find('.cmdLabel').on('click', function(){
						//on label click
						//console.log('sentence: ' + card.dataset.sentence);
						loadCommandToEditor(JSON.parse(card.dataset.sentence));
						Teach.uic.showPane(0);
					});
					$card.find('.cmdRemoveBtn').on('click', function(){
						//on remove click
						SepiaFW.animate.flashObj(this);
						var cmdId = card.dataset.id;
						Teach.removePersonalCommand(SepiaFW.account.getKey(sepiaSessionId), cmdId, function(){
							//success
							//SepiaFW.ui.showPopup('This personal command has been deleted!');
							$card.fadeOut(300, function(){
								$card.remove();
							});
						}, function(msg){
							//error
							alert(msg);
						}, '');
					});
				})(newCmdCard);
			}
		});
	}
	function makeCmdCard(sentence, cmdId){
		var newCard = document.createElement('DIV');
		newCard.className = 'sepiaFW-command-card';
		newCard.innerHTML = ""
			+ "<div class='cmdCardButton cmdDownloadBtn'>"
				+ "<span>" + "<i class='material-icons md-24'>download_for_offline</i>" + "</span>"
			+ "</div>"
			+ "<div class='cmdLabel'>"
				+ "<span>" + SepiaFW.tools.escapeHtml(sentence.text || sentence.tagged_text) + "</span>"
			+ "</div>"
			+ "<div class='cmdCardButton cmdRemoveBtn'>"
				+ "<span>" + "<i class='material-icons md-24'>remove</i>" + "</span>"
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
		//Check dynamic variables: <var1>, <var2> is only for 'sentence_connect' BUT <i_raw> is ok for all!
		if (!!txt.match(/<\w+>/)){
			//we allow this currently only for sentence_connect - TODO: add more
			if (cmd == "sentence_connect"){
				submit.sentence = txt;
				submit.tagged_sentence = txt;
			}else{
				SepiaFW.debug.error("Teach-UI - tried to use <...> in a command that didn't allow it.");
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
					if (name === 'sentences' && value.indexOf("&&") < 0){
						//NOTE: we convert this in advance, because its safer and faster
						value = value
							.replace("<i_raw>", "")
							.replace(/(\.|;;|;|\?)\s/g, " && ")
							.replace(/ \&\& $/, "").trim();
						SepiaFW.debug.log("Teach-UI - note: replaced some tokens with '&&' in 'sentences' parameter for: " + value);
					}
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
	
	//load personal and custom assistant commands
	Teach.loadPersonalCommands = function(key, startingFrom, loadSize, successCallback, errorCallback, debugCallback, options){
		loadPersonalOrCustomAssistantCommands("getAllPersonalCommands", key, startingFrom, loadSize,
			successCallback, errorCallback, debugCallback, options);
	}
	Teach.loadCustomAssistantCommands = function(key, startingFrom, loadSize, successCallback, errorCallback, debugCallback, options){
		loadPersonalOrCustomAssistantCommands("getAllCustomAssistantCommands", key, startingFrom, loadSize, 
			successCallback, errorCallback, debugCallback, options);
	}
	function loadPersonalOrCustomAssistantCommands(endpoint, key, startingFrom, loadSize, successCallback, errorCallback, debugCallback, options){
		if (!options) options = {};
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + endpoint;
		var submitData = new Object();
		submitData.from = startingFrom;
		submitData.size = loadSize;
		if (options.withButtonOnly){
			submitData.button = true;
		}
		if (options.sortByDate){
			submitData.sortByDate = true;
		}
		sendTeachApiRequest(apiUrl, key, submitData, successCallback, errorCallback, debugCallback,
			'Sorry, but something went wrong while loading personal commands! :-(');
	}
	Teach.loadPersonalCommandsWithIds = function(key, ids, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + "getPersonalCommandsByIds";
		var submitData = new Object();
		submitData.ids = JSON.stringify(ids);
		sendTeachApiRequest(apiUrl, key, submitData, successCallback, errorCallback, debugCallback,
			'Sorry, but something went wrong while loading personal commands! :-(');
	}
	Teach.searchPersonalCommands = function(key, searchText, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + "getPersonalCommands";
		var state = SepiaFW.assistant.getState();
		var submitData = new Object();
		submitData.language = state.lang;
		submitData.searchText = searchText;
		sendTeachApiRequest(apiUrl, key, submitData, successCallback, errorCallback, debugCallback,
			'Sorry, but something went wrong while loading personal commands! :-(');
	}
		
	//remove personal command
	Teach.removePersonalCommand = function(key, cmdId, successCallback, errorCallback, debugCallback){
		SepiaFW.ui.showLoader();
		var apiUrl = SepiaFW.config.teachAPI + "deletePersonalCommand";
		var submitData = new Object();
		submitData.id = cmdId;
		sendTeachApiRequest(apiUrl, key, submitData, successCallback, errorCallback, debugCallback,
			'Sorry, but something went wrong while trying to delete the command! Maybe invalid id?');
	}

	//basic request method
	function sendTeachApiRequest(apiUrl, key, submitData, successCallback, errorCallback, debugCallback, resultFailErrorMsg){
		submitData.KEY = key;
		submitData.client = SepiaFW.config.getClientDeviceInfo(); //SepiaFW.config.clientInfo;
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
					if (errorCallback) errorCallback(resultFailErrorMsg ||
						'Sorry, but something went wrong during personal commands request! :-(');
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