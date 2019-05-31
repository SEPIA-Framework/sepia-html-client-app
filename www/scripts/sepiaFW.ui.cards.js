//ACTIONS
function sepiaFW_build_ui_cards(){
	var Cards = {};
	
	//card collection types
	var UNI_LIST = "uni_list";
	var SINGLE = "single";
	var GROUPED_LIST = "grouped_list";
	
	//card element types
	var USER_DATA_LIST = "userDataList";
	var RADIO_CARD_ELE = "radio";
	var NEWS_CARD_ELE = "news";
	var WEATHER_NOW = "weatherNow";
	var WEATHER_TOMORROW = "weatherTmo";
	var WEATHER_WEEK = "weatherWeek";
	var LINK = "link";
	
	//states
	Cards.currentCardId = 0;	//increasing id for every card element
	var topIndexZ = 1;			//to get an active element to the top (deprecated?)

	//some specials
	Cards.canEmbedYouTube = true;
	Cards.canEmbedSpotify = false;		//deactivated by default because it only works in desktop and gives no control over start/stop/volume
	Cards.canEmbedAppleMusic = false;	//"" ""
	Cards.canEmbedWebPlayer = function(service){
		if (!service) return false;
		service = service.toLowerCase().replace(/\s+/,"_"); 		//support brands too
		if (service.indexOf("spotify") == 0){
			return Cards.canEmbedSpotify;
		}else if (service.indexOf("apple_music") == 0){
			return Cards.canEmbedAppleMusic;
		}else if (service.indexOf("youtube") == 0){
			return Cards.canEmbedYouTube;
		}else{
			return false;
		}
	}
	Cards.getSupportedWebPlayers = function(){
		var players = [];
		if (Cards.canEmbedYouTube) players.push("youtube");
		if (Cards.canEmbedSpotify) players.push("spotify");
		if (Cards.canEmbedAppleMusic) players.push("apple_music");
		return players;
	}
	
	//get a full card result as DOM element
	Cards.get = function(assistAnswer, sender){
		var card = {};
		if (assistAnswer.hasCard){
			card.dataInline = [];
			card.dataFullScreen = [];
			
			var cardInfo = assistAnswer.cardInfo;
			if (cardInfo && cardInfo.length > 0){
				//iterate over the different results, e.g. a collection of cards from different service modules
				for (i=0; i<cardInfo.length; i++){
					var cardInfoI = cardInfo[i];
					var cType = cardInfoI.cardType;
					if (!cType){
						continue;
					}
					var N = cardInfoI.N || 1; 		//same as: cardInfoI.info.length
					//N = Math.min(N, 3);				//LIMIT RESULTS
					//console.log('cType: ' + cType);
					//console.log('card: ' + JSON.stringify(cardInfoI));
					
					//iterate over the data on this card
					for (j=0; j<N; j++){
						var elementType = cardInfoI.info[j].type;
						//console.log('dType: ' + elementType);
						
						//UserDataList
						if (elementType === USER_DATA_LIST){
							var section = cardInfoI.info[j].section;
							var dataN = (cardInfoI.info[j].data)? cardInfoI.info[j].data.length : 0;
							var cardElement = buildUserDataList(cardInfoI.info[j]);
							//console.log('card list element info: ' + JSON.stringify(cardInfoI.info[j]));
							if (N == 1){ 	//one list is shown in-chat
								if (section === "timeEvents" && dataN > 3){
									card.dataFullScreen.push(cardElement);
								}else{
									card.dataInline.push(cardElement);
								}
							}else{
								card.dataFullScreen.push(cardElement);
							}
						}
						//Radio
						else if (elementType === RADIO_CARD_ELE){
							var cardElement = buildRadioElement(cardInfoI.info[j]);
							if (j==N-1) cardElement.style.paddingBottom = '5px'; 	//TODO: convert to CSS
							card.dataInline.push(cardElement);
						}
						//News
						else if (elementType === NEWS_CARD_ELE){
							var cardElement = buildNewsElement(cardInfoI.info[j]);
							if (N <= 0){ 	//deactivated
								card.dataInline.push(cardElement);
							}else{
								card.dataFullScreen.push(cardElement);
							}
						}
						//Weather
						else if (elementType === WEATHER_NOW || elementType === WEATHER_TOMORROW || elementType === WEATHER_WEEK){
							var cardElement = buildWeatherElementA(cardInfoI.info[j]);
							card.dataInline.push(cardElement);
						}
						//Link
						else if (elementType === LINK){
							var cardElement = buildLinkElement(cardInfoI.info[j]);
							if (cardInfo.length <= 3){
								card.dataInline.push(cardElement);
							}else{
								card.dataFullScreen.push(cardElement);
							}
						}
					}
				}
			}
		}
		return card;
	}
	
	//Move cards
	var isFirstMove = true;
	Cards.moveToMyViewOrDelete = function(eleOrCard, forceDelete){
		var ele = $(eleOrCard);
		var myViewParent = ele.closest('#sepiaFW-my-view');
		var isAlreadyHidden = false;
		var duration = 500;
		if (ele.css("display") === "none"){
			duration = 0;
			isAlreadyHidden = true;
		}
		ele.fadeOut(duration, function(){
			//remove
			if (!isAlreadyHidden){
				//ele.remove();		//removes all event handlers too
				var parentN = eleOrCard.parentNode;
				var parentFlexCard = ele.closest(".sepiaFW-cards-flexSize-container");
				parentN.removeChild(eleOrCard);
				//parent empty now?
				if (!parentN.hasChildNodes()){
					$(parentN).remove();
				}
				//parent flex card empty?
				if (parentFlexCard.children().length == 0){
					parentFlexCard.remove();
				}
			}
			//if the view is myView then end here
			if (forceDelete || myViewParent.length > 0){
				return;
			}
			//check for flex card container and add one if missing
			if (!ele.hasClass('sepiaFW-cards-flexSize-container')){
				var newCard = buildGenericCard(eleOrCard);
				$(newCard).addClass('oneElement');
				$('#sepiaFW-my-view').prepend(newCard);
			}else{
				$('#sepiaFW-my-view').prepend(eleOrCard);
			}
			ele.fadeIn(500, function(){
				//remove intro on first move
				if (isFirstMove){
					$('#sepiaFW-my-view-intro').remove();
					isFirstMove = false;
					SepiaFW.ui.moc.showPane(0);
				}
			});
		});
	}
	
	//-----------------------------------------------------------------------------------
	
	//CUSTOM HTML CARD
	
	//build flex container with custom HTML RESULTS from actionInfo
	Cards.buildCustomHtmlCardFromAction = function(actionInfoI){
		var htmlData = actionInfoI.data;
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container oneElement";
		cardElement.id = newId;
		
		//console.log('DATA: ' + JSON.stringify(htmlData));
		cardElement.innerHTML = htmlData;
		return cardElement;
	}
	
	//build generic flex-card with body
	function buildGenericCard(bodyContentElement){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container";
		cardElement.id = newId;
		
		if ($(bodyContentElement).hasClass('sepiaFW-cards-list-body')){
			cardElement.appendChild(bodyContentElement);
		}else{
			var cardBody = document.createElement('DIV');
			cardBody.className = "sepiaFW-cards-list-body";  	//TODO: add item-specific class here?
			cardBody.appendChild(bodyContentElement);
			cardElement.appendChild(cardBody);
		}
		return cardElement;
	}
	
	//USER DATA LIST

	var INDEX_TYPE_TODO = "todo";
	var INDEX_TYPE_SHOPPING = "shopping";
	var INDEX_TYPE_REMINDERS = "reminders";
	var INDEX_TYPE_APPOINTMENTS = "appointments";
	var INDEX_TYPE_ALARMS = "alarms";			//includes timers
	var INDEX_TYPE_NEWS_FAVORITES = "newsFavorites";
	var INDEX_TYPE_UNKNOWN = "unknown";

	var SECTION_TIME_EVENTS = "timeEvents";

	//Default sort-drag-options
	var udListCheckablesDragOptions = {
		allowCrossContainerDrag: true,
		activateDragAfterLongPress: true,
		autoDisableAfterDrop: true,
	};

	//Make an empty list object for a certain list type
	function makeProductivityListObject(name, indexType){
		var emptyItemData;
		if (indexType === INDEX_TYPE_TODO){
			//To-Do
			emptyItemData = {
				'name' : name,
				'checked' : false,
				'state' : 'open',
				'dateAdded' : (new Date().getTime())
			};
		}else{
			//Shopping
			emptyItemData = {
				'name' : name,
				'checked' : false,
				'dateAdded' : (new Date().getTime())
			};
		}
		return emptyItemData;
	}
	
	//UserDataList
	function makeUserDataList(user, sectionName, indexType, title, data, _id){
		var list = {};
		
		if (_id) list._id = _id;			//unique ID generated for this list - restructured, is elasticSearch ID now
		if (user) list.user = user;			//user of this list
		if (sectionName) list.section = sectionName;	//section to which this list belongs like productivity (e.g. shopping, todo), timeEvents (alarms, timers) ...
		if (indexType) list.indexType = indexType;		//things like shopping, to-do, reminders, alarms, etc. ... used as DB type as well
		if (title) list.title = title;		//name of the list in the sub-category like 'supermarket' for type 'shopping'
		if (data) list.data = data;			//JSONArray list entries, usually each is a JSONObject
		/*
		var type;			//type of list classifying how the list is structured
		var group;			//group classifying how the list can be clustered
		var titleHtml;		//HTML version of title if you need to make look nice
		var icon; 			//URL to an icon image that can be used for the list
		var desc; 			//a short description of this list
		var moreInfo;		//JSON object with anything else (that you don't want to write on top-level)
		*/
		list.lastEdit = new Date().getTime();		//Long: when was the list last modified?
	
		return list;
	}

	//build card of this type
	function buildUserDataList(cardElementInfo){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container";
		cardElement.id = newId;
		var sortData = false;
		var elementsData = cardElementInfo.data; 		//get data ...
		delete cardElementInfo.data;					//... and remove it from info ...
		cardElement.setAttribute('data-list', JSON.stringify(cardElementInfo)); //... so we have a small basic set here
		
		var titleName = cardElementInfo.title;
		//var isTimerAndAlarmsList = (cardElementInfo.indexType === INDEX_TYPE_ALARMS); 	//Note: section === "timeEvents" might even be better here
		var isTimerAndAlarmsList = (cardElementInfo.section === SECTION_TIME_EVENTS);
		if (isTimerAndAlarmsList){
			sortData = true;	//NOTE: maybe we should read this value from the list info itself ... maybe it is already sorted ...

			//New localized title
			titleName = SepiaFW.local.g(titleName);

			//Sort time data
			if (sortData){
				elementsData.sort(function(a, b){return (a.targetTimeUnix - b.targetTimeUnix)});
			}
		}
		
		//header
		var headerConfig = {
			"name" : titleName,
			"isEditable" : !isTimerAndAlarmsList,
			"addDeleteListButton" : !isTimerAndAlarmsList,
			"addSaveListButton" : true
		};
		if (!isTimerAndAlarmsList){
			headerConfig.addAddDefaultListItemButton = true;
		}
		var title = makeHeader(headerConfig, cardElement);
		cardElement.appendChild(title);
		
		//list elements
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body";
		var maxShow = 4;
		var N = elementsData.length;
		var hasTimer=0, hasAlarm=0, hasCheckable=0;
		for (i=0; i<N; i++){
			//note: if you add element types here don't forget to add them in 'getUserDataList' too! (e.g. listElement, timerEvent, ...)
			//console.log('build card ele: ' + elementsData[i].eleType); 		//DEBUG
			
			//timer element
			if (elementsData[i].eleType === "timer"){
				var listEle = makeTimerElement(elementsData[i], cardElement.id, cardBody);		//make AND add
				if (hasTimer === 0) { hasTimer = 1;	cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-timers"; }
				//refresh interval actions
				SepiaFW.events.addOrRefreshTimeEvent(elementsData[i].targetTimeUnix, elementsData[i].eleType, elementsData[i]);
			
			//alarm element
			}else if (elementsData[i].eleType === "alarm"){
				var listEle = makeAlarmElement(elementsData[i], cardElement.id, cardBody);		//make AND add
				if (hasAlarm === 0) { hasAlarm = 1; cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-alarms"; }
				//refresh interval actions
				SepiaFW.events.addOrRefreshTimeEvent(elementsData[i].targetTimeUnix, elementsData[i].eleType, elementsData[i]);
			
			//default: checkable element (default list element)
			}else{
				var listEle = makeUserDataListElement(elementsData[i], cardElementInfo); 	//just make (add self)
				cardBody.appendChild(listEle);
				if (hasCheckable === 0) { hasCheckable = 1; cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-checkables"; }
				setupUserDataListElementButtons(listEle); 		//we do this as last step, after classes are set and ele ist appended!
			}
			
			//hide element at start?
			if (i >= maxShow) $(listEle).addClass('itemHidden');
		}
		//refresh background notifications
		//is mixed result?
		if ((hasTimer + hasAlarm + hasCheckable) > 1){
			cardBody.className += " sepiaFW-cards-list-mixed"; 	//add class for mixed card body
		}
		cardElement.appendChild(cardBody);
		
		//footer
		if (N > maxShow){
			var footerConfig = {
				"type" : "showHideButton",
				"cardBody" : cardBody,
				"visibleItems" : maxShow
			};
			var cardFooter = makeFooter(footerConfig);
			cardElement.appendChild(cardFooter);
		}
		
		return cardElement;
	}
	//get userDataList
	function getUserDataList(theList){
		var listInfo = JSON.parse(theList.getAttribute('data-list'));
		var data = [];
		
		//checkables
		$(theList).find('.listElement').each(function(){
			var eleData = JSON.parse($(this).attr('data-element'));
			data.push(eleData);
		});
		//timers and alarms
		$(theList).find('.timeEvent').each(function(){
			var eleData = JSON.parse($(this).attr('data-element'));
			data.push(eleData);
		});
		
		listInfo.data = data;
		//console.log('LIST2: ' + JSON.stringify(listInfo));
		return listInfo;
	}
	//build checkable card element (default list element)
	function makeUserDataListElement(elementData, cardElementInfo){
		//console.log(cardElementInfo); 			//DEBUG
		var listEle = document.createElement('DIV');
		listEle.className = 'listElement cardBodyItem';
		if (cardElementInfo.indexType === INDEX_TYPE_TODO){
			//TODO LIST
			if (elementData.checked){
				listEle.innerHTML = "<div class='listLeft checked' oncontextmenu='return false;'></div>";
			}else if (elementData.state && elementData.state == "inProgress"){
				listEle.innerHTML = "<div class='listLeft inProgress' oncontextmenu='return false;'></div>";
			}else{
				listEle.innerHTML = "<div class='listLeft unchecked' oncontextmenu='return false;'></div>";
			}
		}else if (cardElementInfo.indexType === INDEX_TYPE_SHOPPING){
			//SHOPPING LIST
			if (elementData.checked){
				listEle.innerHTML = "<div class='listLeft checked' oncontextmenu='return false;'></div>";
			}else{
				listEle.innerHTML = "<div class='listLeft unchecked' oncontextmenu='return false;'></div>";
			}
		}
		listEle.innerHTML += "<div class='listCenter' contentEditable='true'>" + elementData.name + "</div>"
		listEle.innerHTML += "<div class='listRight'><i class='material-icons md-24'>&#xE15B;</i></div>";
		listEle.setAttribute('data-element', JSON.stringify(elementData));
		
		//note: add button actions with extra method (below)

		return listEle;
	}
	//We separate this because it requires the element to be appended to list body first (list body etc.)
	function setupUserDataListElementButtons(listEle){
		var $listEle = $(listEle);
		var $listBody = $listEle.closest('.sepiaFW-cards-list-body');

		//left
		$listEle.find('.listLeft').each(function(){
			var that = this;
			var $that = $(this);

			function shortPress(){
				//console.log('short-press');
				//get list index-type (we do this here because it can change via drag-drop)
				var listContainer = $listEle.closest('.sepiaFW-cards-flexSize-container').get(0);
				var listInfoObj = getUserDataList(listContainer);
				var eleData = JSON.parse($listEle.attr('data-element'));
				var classesToClean = "checked unchecked inProgress";
				if (listInfoObj.indexType === INDEX_TYPE_TODO){
					//TODO
					if ($that.hasClass('checked')){
						$that.removeClass(classesToClean).addClass('unchecked');
						eleData.state = "open";
						eleData.checked = false;
					}else if ($that.hasClass('inProgress')){
						$that.removeClass(classesToClean).addClass('checked');
						eleData.state = "checked";
						eleData.checked = true;
					}else{
						$that.removeClass(classesToClean).addClass('inProgress');
						eleData.state = "inProgress";
						eleData.checked = false;
					}
				}else{
					//Rest of checkable types (e.g. shopping)
					if ($that.hasClass('checked')){
						$that.removeClass(classesToClean).addClass('unchecked');
						eleData.checked = false;
					}else{
						$that.removeClass(classesToClean).addClass('checked');
						eleData.checked = true;
					}
					//These type do not need a state attribue so we can remove it
					if (eleData.state) 	delete eleData.state;
				}
				//update data
				eleData.lastChange = new Date().getTime();
				$listEle.attr('data-element', JSON.stringify(eleData));
				//activate save button
				var $saveBtn = $(listContainer).find('.sepiaFW-cards-list-saveBtn'); 	//note: we need to (re)load the button here
				$saveBtn.addClass('active');		//saveBtn.css({"opacity": 0.92, "color": saveBtn.parent().css("color")});
			}

			function dropCallback(draggedEle, startListBody, dropListBody, positionChanged){
				var sameTargetContainer = (!!startListBody && !!dropListBody)? startListBody.isSameNode(dropListBody) : true;
				if (positionChanged){
					var $saveBtn = $listBody.parent().find('.sepiaFW-cards-list-saveBtn');
					$saveBtn.addClass('active');
					if (!sameTargetContainer && dropListBody){
						var $saveBtnNewTarget = $(dropListBody).parent().find('.sepiaFW-cards-list-saveBtn');
						$saveBtnNewTarget.addClass('active');
					}
				}
				//TODO: handle data change? (userId, listType etc.)
			}

			//tap and drag handler (for sorting)
			//SepiaFW.ui.onclick(that, shortPress);
			var dragOptions = $.extend({}, {
				"tapCallback": shortPress,
				"dropCallback": dropCallback
			}, udListCheckablesDragOptions);
			/*var dragOptions = Object.assign({		//might not be fully supported by webview ?!
				"tapCallback": shortPress,
				"dropCallback": dropCallback
			}, udListCheckablesDragOptions);*/
			var draggable = new SepiaFW.ui.dragDrop.Draggable(that, ".listElement", ".sepiaFW-cards-list-checkables", dragOptions);
		});
		//right
		$listEle.find('.listRight').each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
				//activate save button
				var $saveBtn = $listBody.parent().find('.sepiaFW-cards-list-saveBtn');
				$saveBtn.addClass('active');
				//remove
				$listEle.remove();
			});
		});
		//center
		$listEle.find('.listCenter').each(function(){
			$(this).on('focusout', function(){
				//update data
				var newName = $(this).html().replace(/<br>|<div>|<\/div>/g,"").trim();
				if (newName){
					var eleData = JSON.parse($listEle.attr('data-element'));
					eleData.name = newName;
					$(this).html(newName);
					$listEle.attr('data-element', JSON.stringify(eleData));
					//activate save button
					var $saveBtn = $listBody.parent().find('.sepiaFW-cards-list-saveBtn'); 	//note: we need to load the button here
					$saveBtn.addClass('active');		//saveBtn.css({"opacity": 0.92, "color": saveBtn.parent().css("color")});
				}
			});
			$(this).keypress(function(event){
				var keycode = event.keyCode || event.which;
				if(keycode == '13') {
					$(this).blur();
				}
			});
		});
	}
	
	//RADIO
	
	//build card of this type
	function buildRadioElement(cardElementInfo){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container oneElement";
		cardElement.id = newId;
		
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-radioStations";
		
		var radioStation = document.createElement('DIV');
		radioStation.className = 'radioStation cardBodyItem';
		radioStation.innerHTML = "<div class='radioLeft'><i class='material-icons md-24'>&#xE03E;</i></div><div class='radioCenter'>" + cardElementInfo.name + "</div><div class='radioRight'><i class='material-icons md-24'>&#xE037;</i></div>";
		radioStation.setAttribute('data-element', JSON.stringify(cardElementInfo));
		cardBody.appendChild(radioStation);
		
		$(radioStation).find('.radioRight').each(function(){
			var assistColor = SepiaFW.ui.assistantColor || SepiaFW.ui.primaryColor;
			$(this).css({"color" : assistColor });
			var that = this;
			SepiaFW.ui.onclick(that, function(){
			//$(this).on('click', function(){
				SepiaFW.animate.flash(newId, 2000);
				var station = JSON.parse($(that).parent().attr('data-element'));
				var action = {};
				action.audio_url = station.streamURL;
				action.audio_title = station.name;
				SepiaFW.ui.actions.playAudioURL(action, true); 	//true: action from button
			});
		});
		
		$(radioStation).find('.radioLeft').each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
			//$(this).on('click', function(){
				Cards.moveToMyViewOrDelete($(that).closest(".sepiaFW-cards-flexSize-container")[0]);
			});
		});
		
		cardElement.appendChild(cardBody);
		return cardElement;
	}
	
	//TIMER AND ALARM
	
	//build time event aka timer or alarm (for now) - this is the single element version from 'action' (see buildUserDataList for array)
	Cards.buildTimeEventElementFromAction = function(actionInfoI, eventType){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container oneElement addSpacer";
		cardElement.id = newId;
		
		var cardBody = document.createElement('DIV');
		var timeEvent = '';
		if (eventType === SepiaFW.events.TIMER){
			//TIMER
			cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-timers";
			timeEvent = makeTimerElement(actionInfoI, cardElement.id, cardBody);
		}else{
			//ALARM
			cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-alarms";
			timeEvent = makeAlarmElement(actionInfoI, cardElement.id, cardBody);
		}
		cardElement.appendChild(cardBody);
		return cardElement;
	}
	//timeEvent elements
	function makeTimerElement(actionInfoI, flexCardId, cardBody, skipAdd){ 	//actionInfoI can also be the data of an list element, should be compatible (in the most important fields)!
		var timeEvent = document.createElement('DIV');
		timeEvent.className = 'timeEvent cardBodyItem';
		timeEvent.innerHTML = "<div class='timeEventLeft'><i class='material-icons md-24'>&#xE425;</i></div>"
							+ "<div class='timeEventCenter'>"
								+ "<div class='sepiaFW-timer-name' contentEditable='true'>" + actionInfoI.name + "</div>"
								+ "<div class='sepiaFW-timer-indicator'>" + SepiaFW.local.g('loading') + " ..." + "</div>"
							+ "</div>"
							+ "<div class='timeEventRight'><i class='material-icons md-24'>&#xE15B;</i></div>";
		timeEvent.setAttribute('data-element', JSON.stringify(actionInfoI));
		timeEvent.setAttribute('data-id', actionInfoI.eventId);
		//buttons
		makeTimeEventNameEditable(timeEvent);
		makeTimeEventRemoveButton(timeEvent, cardBody);
		//makeTimeEventToMyViewButton(timeEvent, SepiaFW.events.TIMER);
		if (!skipAdd){
			cardBody.appendChild(timeEvent);
		}
		makeTimeEventContextMenu(flexCardId, cardBody, timeEvent, actionInfoI, SepiaFW.events.TIMER);
		return timeEvent;
	}
	function makeAlarmElement(actionInfoI, flexCardId, cardBody, skipAdd){		//actionInfoI can also be the data of an list element, should be compatible (in the most important fields)!
		var timeEvent = document.createElement('DIV');
		timeEvent.className = 'timeEvent cardBodyItem';
		timeEvent.innerHTML = "<div class='timeEventLeft'><i class='material-icons md-24'>&#xE855;</i></div>"
							+ "<div class='timeEventCenter'>"
								+ "<div class='sepiaFW-timer-name' contentEditable='true'>" + actionInfoI.name + "</div>"
								+ "<div class='sepiaFW-timer-indicator'>" + actionInfoI.date + " " + actionInfoI.time.replace(/:\d\d$/, " " + SepiaFW.local.g('oclock')) + "</div>"
							+ "</div>"
							+ "<div class='timeEventRight'><i class='material-icons md-24'>&#xE15B;</i></div>";
		timeEvent.setAttribute('data-element', JSON.stringify(actionInfoI));
		timeEvent.setAttribute('data-id', actionInfoI.eventId);
		//buttons
		makeTimeEventNameEditable(timeEvent);
		makeTimeEventRemoveButton(timeEvent, cardBody);
		//makeTimeEventToMyViewButton(timeEvent, SepiaFW.events.ALARM);
		if (!skipAdd){
			cardBody.appendChild(timeEvent);
		}
		makeTimeEventContextMenu(flexCardId, cardBody, timeEvent, actionInfoI, SepiaFW.events.ALARM);
		return timeEvent;
	}
	//buttons
	function makeTimeEventNameEditable(timeEvent){
		var timerEventName = $(timeEvent).find(".sepiaFW-timer-name");
		timerEventName.on('focusout', function(){
			//update data
			var dataString = $(timeEvent).attr('data-element');
			if (dataString){
				var eleData = JSON.parse(dataString);
				var newName = $(this).html();
				newName = newName.replace(/<br>|<div>|<\/div>/g, "").trim(); 			//happens when the user presses enter(?)
				newName = newName.replace(/-|_|!|\?|,|\.|'/g, " ").trim();				//remove some special chars
				newName = (newName.length > 100)? newName.substring(0,99) : newName; 	//brutally shorten name - TODO: improve
				eleData.name = newName;
				$(this).html(newName);
				$(timeEvent).attr('data-element', JSON.stringify(eleData));
				//update stored TIMER
				var Timer = SepiaFW.events.getRunningOrActivatedTimeEventById(eleData.eventId);
				if (Timer){
					eleData.lastChange = new Date().getTime();
					Timer.data = eleData;
					//trigger auto-save
					SepiaFW.events.scheduleTimeEventsSync(eleData.eleType);
				}
				//activate save button
				var saveBtn = $(this).closest('.sepiaFW-cards-flexSize-container').find('.sepiaFW-cards-list-saveBtn');
				saveBtn.addClass('active');
			}
		});
		timerEventName.keypress(function(event){
			var keycode = event.keyCode || event.which;
			if(keycode == '13'){
				//$(this).blur();
				$('#sepiaFW-chat-input').focus().blur(); 	//workaround since it can't be blurred
			}
		});
	}
	function makeTimeEventContextMenu(flexCardId, cardBody, cardBodyItem, event, eventType){
		//some additional data
		var newBodyClass;			//class in case we need to create new body
		var androidIntentButtons;	//Android intent action buttons
		var shareButton;			//button to share event as SEPIA link
		//console.log(event);
		var d = new Date(event.targetTimeUnix);
		if (eventType === SepiaFW.events.TIMER){
			//TIMER
			newBodyClass = "sepiaFW-cards-list-body sepiaFW-cards-list-timers";
			//Android export buttons
			androidIntentButtons = [{
				//add to alarms
				action: "android.intent.action.SET_ALARM",
				extras: {
					"android.intent.extra.alarm.HOUR": d.getHours(),
					"android.intent.extra.alarm.MINUTES": d.getMinutes()
				},
				buttonName: SepiaFW.local.g('exportToAlarms'),
				buttonTitle: "Export event to system alarms."	//TODO: add local translation
			}];
		}else{
			//ALARM - REMINDER
			newBodyClass = "sepiaFW-cards-list-body sepiaFW-cards-list-alarms";
			//Android export buttons
			androidIntentButtons = [{
				//add to calendar
				action: "android.intent.action.INSERT",
				extras: {
					"beginTime": event.targetTimeUnix,
					"title": event.name
				},
				url: "content://com.android.calendar/events",
				buttonName: SepiaFW.local.g('exportToCalendar'),
				buttonTitle: "Export event to system calendar."	//TODO: add local translation
			},{
				//add to alarms
				action: "android.intent.action.SET_ALARM",
				extras: {
					"android.intent.extra.alarm.HOUR": d.getHours(),
					"android.intent.extra.alarm.MINUTES": d.getMinutes()
				},
				buttonName: SepiaFW.local.g('exportToAlarms'),
				buttonTitle: "Export event to system alarms."	//TODO: add local translation
			}];
		}
		//Link button
		shareButton = {
			type: SepiaFW.client.SHARE_TYPE_ALARM,
			data: {
				"beginTime": event.targetTimeUnix,
				"title": event.name
			},
			buttonName: SepiaFW.local.g('exportToUrl'),
			buttonTitle: "Copy SEPIA share link to clipboard."	//TODO: add local translation
		}
		//context menu
		var contextMenu = makeBodyElementContextMenu(flexCardId, cardBody, cardBodyItem, event.eventId, {
			toggleButtonSelector: ".timeEventLeft",
			newBodyClass: newBodyClass,
			androidIntentButtons: androidIntentButtons,
			shareButton: shareButton
		});
	}
	//NOTE: replaced by context menu
	function makeTimeEventToMyViewButton(timeEvent, eventType){
		$(timeEvent).find('.timeEventLeft').each(function(){
			var that = this;

			SepiaFW.ui.onclick(that, function(){
				var flexCard = $(that).closest(".sepiaFW-cards-flexSize-container");
				var title = flexCard.find('.sepiaFW-cards-list-title');
				if (title.length > 0){
					//single element?
					/*
					var isOnlyElement = false;
					if (flexCard.find('.sepiaFW-cards-list-body').children().length == 1){
						isOnlyElement = true;
					}
					*/
					//hide save button (just to be sure the user does not save an incomplete list)
					title.find(".sepiaFW-cards-list-saveBtn").animate({ opacity: 0.0 }, 500, function(){
						$(this).css({opacity: 0.5, visibility: "hidden"});
					});
					//create new body for element
					var cardBody = document.createElement('DIV');
					if (eventType === SepiaFW.events.TIMER){
						//TIMER
						cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-timers";
					}else{
						//ALARM
						cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-alarms";
					}
					//fade out the element, add it to new body and then move it over
					$(timeEvent).fadeOut(500, function(){
						var parentN = timeEvent.parentNode;
						parentN.removeChild(timeEvent);
						$(timeEvent).fadeIn(0);
						cardBody.style.display = "none";
						cardBody.appendChild(timeEvent);
						Cards.moveToMyViewOrDelete(cardBody);
					});
				}else{
					Cards.moveToMyViewOrDelete(flexCard[0]);
				}
			});
		});
	}
	function makeTimeEventRemoveButton(timeEvent, cardBody){
		$button = $(timeEvent).find('.timeEventRight');
		if ($button.length > 0){
			var that = $button[0];
			SepiaFW.ui.onclick(that, function(){
				var $timeEvent = $(timeEvent);
				//delete event
				var Timer = '';
				var eventId = $timeEvent.attr('data-id');
				if (timeEvent.hasAttribute('data-element')){
					//var event = JSON.parse($timeEvent.attr('data-element'));
					Timer = SepiaFW.events.getRunningOrActivatedTimeEventById(eventId);
					if (Timer){
						var resyncList = true;
						SepiaFW.events.removeTimeEvent(Timer.name, resyncList);		//timeEvent.id
					}
				}
				//stop alarm and remove 
				if (SepiaFW.audio){
					SepiaFW.audio.stopAlarmSound();
				}				
				//remove DOM element and parent if emtpy
				if (Timer){
					$(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-id="' + Timer.data.eventId + '"]').each(function(){
						removeTimeEventElement(this, Timer.data.eventId);
					});
					//linked messages:
					$(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-msg-custom-tag="' + Timer.data.eventId + '"]').each(function(){
						this.remove();
					});
				}else{
					removeTimeEventElement(timeEvent, eventId);
				}
			});
		};
	}	
	//remove element and parent if possible
	function removeTimeEventElement(timeEventEle, eventId){
		var $flexCardBody = $(timeEventEle).closest(".sepiaFW-cards-list-body");
		var $flexCard = $flexCardBody.closest('.sepiaFW-cards-flexSize-container');
		if (eventId && $flexCard.length > 0 && $flexCard[0].id){
			//could use: $("[id$=" + eventId + "]")
			//or: var contextMenuSelector = "#" + $flexCard[0].id + "-contextMenu-id-" + eventId;
			if (timeEventEle.nextSibling && timeEventEle.nextSibling.id && timeEventEle.nextSibling.id.indexOf(eventId)){
				//$flexCardBody.find(contextMenuSelector).remove();
				$(timeEventEle.nextSibling).remove();
			}
		}
		$(timeEventEle).remove();
		if ($flexCardBody.children().length == 0 && $flexCard.children().length == 1){
			//only empty body left (no title / header)
			$flexCard.remove();
		}else{
			//assume list update so activate save button
			var saveBtn = $flexCard.find('.sepiaFW-cards-list-saveBtn');
			saveBtn.addClass('active');	
			//note: deleted time events are resynchronized automatically after 5s (which should make the button inactive again)
		}
	}
	
	//NEWS
	
	function buildNewsElement(cardElementInfo){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container";
		cardElement.id = newId;
		
		//header
		var headerConfig = {
			"name" : cardElementInfo.name,
			//"background" : "#fff",
			//"textColor" : "000",
			"cssClass" : "newsHeader",
			"isEditable" : false
		};
		var title = makeHeader(headerConfig, cardElement);
		cardElement.appendChild(title);
		
		//body
		var elementsData = cardElementInfo.data; 		//get data (news headlines per outlet)
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-newsOutlet";
		var maxShow = 2;
		var N = elementsData.length;
		for (i=0; i<N; i++){
			var newsHeadline = elementsData[i].title;
			var newsLink = elementsData[i].link;
			var newsBody = elementsData[i].description;		
			if (newsBody){
				newsBody = newsBody.replace(/(<p>|<\/p>|<strong>|<\/strong>|<b>|<\/b>)/g," ").replace(/\s+/g, " ");
				newsBody = (newsBody.length > 360)? (newsBody.substring(0, 360) + "...") : newsBody;
			}
			var newsPublished = elementsData[i].pubDate;
			var newsArticle = document.createElement('DIV');
			if (i >= maxShow){
				newsArticle.className = 'newsArticle cardBodyItem itemHidden';
			}else{
				newsArticle.className = 'newsArticle cardBodyItem';
			}
			//newsArticle.setAttribute('data-element', JSON.stringify(elementsData[i]));
			newsArticle.innerHTML = "<div class='newsCenter'><h3 class='newsArticleHeadline'>" + newsHeadline + "</h3><div class='newsArticleBody'>" + newsBody + "</div></div>";
			//article "button"
			(function(newsLink, newsArticle){
				SepiaFW.ui.longPressShortPressDoubleTab(newsArticle, function(){
					//long-press - move
					Cards.moveToMyViewOrDelete(newsArticle);
				},'',function(){
					//short-press - open
					SepiaFW.ui.actions.openUrlAutoTarget(newsLink);
				},'', true);
			})(newsLink, newsArticle);
			cardBody.appendChild(newsArticle);
		}
		cardElement.appendChild(cardBody);
		
		//footer
		if (N > maxShow){
			var footerConfig = {
				"type" : "showHideButton",
				"cardBody" : cardBody,
				"cssClass" : "newsFooter",
				"visibleItems" : maxShow
			};
			var cardFooter = makeFooter(footerConfig);
			cardBody.style.paddingBottom = '0px';
			cardElement.appendChild(cardFooter);
		}
		
		return cardElement;
	}
	
	//WEATHER
	
	//-NOW, TOMORROW and WEEK (actually TOMORROW and WEEK can simply use the NOW cards)
	function buildWeatherElementA(cardElementInfo){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container oneElement addSpacer";
		cardElement.id = newId;
		
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-weatherA";
		var visibleItems = 0;
		var data = cardElementInfo.data;
		//small preview
		var weatherNowTmoSmall = document.createElement('DIV');
		weatherNowTmoSmall.className = 'weatherNowSmall';
		//console.log(JSON.stringify(data));
		weatherNowTmoSmall.innerHTML = "<div class='weatherNowSmallImage'><img src='img/weather/" + data.icon + ".png' alt='icon'></div>"
									+ "<div class='weatherNowSmallIntro'><b>" + ((data.dateTag)? data.dateTag : data.date) + ":</b><p>" + data.desc + "</p></div>"
									+ "<div class='weatherNowSmallData'>" + makeWeatherNowTmoSmallData(data) + "</div>";
		//weatherNowTmoSmall.setAttribute('data-element', JSON.stringify(cardElementInfo));
		cardBody.appendChild(weatherNowTmoSmall);
		//details part
		var weatherNowTmoDetails = document.createElement('DIV');
		weatherNowTmoDetails.className = 'weatherNowDetails itemHidden cardBodyItem';
		weatherNowTmoDetails.innerHTML = makeWeatherNowTmoDetailsData(cardElementInfo.details, data.units);
		cardBody.appendChild(weatherNowTmoDetails);
		
		cardElement.appendChild(cardBody);

		//context menu - TODO: add?
		//var contextMenu = makeBodyElementContextMenu(cardBody, {});
		
		//footer
		var footerConfig = {
			"type" : "showHideButton",
			"cardBody" : cardBody,
			"visibleItems" : visibleItems
		};
		var cardFooter = makeFooter(footerConfig);
		//cardBody.style.paddingBottom = '0px';
		cardElement.appendChild(cardFooter);
		
		//extra buttons
		$(weatherNowTmoSmall).find('.weatherNowSmallImage').each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
				Cards.moveToMyViewOrDelete($(that).parent().parent().parent()[0]);
			});
		});
				
		return cardElement;
	}
	function makeWeatherNowTmoSmallData(data){
		var dataHTML = "" 
						+ "<div><h3>" + data.tempA + data.units + "</h3><p>" + data.tagA + "</p></div>"
						+ "<div><h3>" + data.tempB + data.units + "</h3><p>" + data.tagB + "</p></div>";
		if (data.tempC){
			dataHTML += "<div><h3>" + data.tempC + data.units + "</h3><p>" + data.tagC + "</p></div>";
		}
		return dataHTML;
	}
	function makeWeatherNowTmoDetailsData(details, unit){
		var data = details.daily || details.hourly;
		var isDaily = false;
		if (details.daily){
			isDaily = true;
		}
		var detailsHTML = "<ul>";
		for (i=0; i<data.length; i++){
			var precipProb = Math.round(data[i].precipProb * 100);
			var precipType = data[i].precipType;
			var precipSymbol = "";
			var temp = (isDaily)? (data[i].tempA  + unit + " - " + data[i].tempB + unit) : (data[i].tempA + unit);
			if (precipType && (precipProb>2)){
				if (precipType === "snow"){
					precipSymbol = "<img src='img/weather/snowflakes.png' alt='snow' class='precipSymbol'>";
				}else{
					precipSymbol = "<img src='img/weather/rain-drops.png' alt='rain' class='precipSymbol'>";
				}
			}else{
				precipSymbol = "<img src='img/weather/clear-day.png' alt='clear' class='precipSymbol'>";
			}
			detailsHTML += "<li>"
							+ "<div>" + data[i].tag + "</div>"
							+ "<div>" + temp + "</div>"
							+ "<div>" + ((precipProb > 2)? (precipSymbol + "<span>" + precipProb + "%</span>") : (precipSymbol)) + "</div>"
						+"</li>";
		}
		detailsHTML += "</ul>";
		return detailsHTML;
	}
	
	//LINK

	var currentLinkItemId = 0;
	
	function buildLinkElement(cardElementInfo){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container oneElement addSpacer";
		cardElement.id = newId;
		
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-link";
		
		var data = cardElementInfo.data;
		var linkUrl = cardElementInfo.url;
		var linkLogo = cardElementInfo.image;
		var linkLogoBack = cardElementInfo.imageBackground || '';
		var linkCardEle = document.createElement('DIV');
		linkCardEle.className = 'linkCard cardBodyItem';
		linkCardEle.id = 'link-' + currentLinkItemId++;		//links have no database event ID (compare: time-events) so we just create one here to connect item and context-menu
		var leftElement = "<div class='linkCardLogo' " + ((linkLogoBack)? ("style='background:" + linkLogoBack + ";'") : ("")) + "><img src='" + linkLogo + "' alt='logo'></div>";
		if (data.type){
			linkCardEle.className += (" " + data.type);
			if (data.type == "websearch"){
				//overwrite with websearch icon
				leftElement = "<div class='linkCardLogo'>" + "<i class='material-icons md-mnu'>search</i>" + "</div>";
			}else if (data.type == "locationDefault"){
				//overwrite with default map icon
				leftElement = "<div class='linkCardLogo'>" + "<i class='material-icons md-mnu'>room</i>" + "</div>";
			}else if (data.type == "default"){
				//overwrite with default link icon
				leftElement = "<div class='linkCardLogo'>" + "<i class='material-icons md-mnu'>link</i>" + "</div>";	//language
			}else if (data.type == "musicSearch" || data.type == "videoSearch"){
				//we could check the brand here: data.brand, e.g. Spotify, YouTube, ...
				linkCardEle.className += (" " + data.brand);
			}
		}else if (!linkLogo){
			//overwrite with default link icon
			leftElement = "<div class='linkCardLogo'>" + "<i class='material-icons md-mnu'>link</i>" + "</div>";	//language
		}
		var description = data.desc;
		if (description && description.length > 120) description = description.substring(0, 119) + "...";

		linkCardEle.innerHTML = leftElement
								+ "<div class='linkCardCenter'>" + (data.title? ("<h3>" + data.title + "</h3>") : ("")) + "<p>" + description + "</p></div>"
								+ "<div class='linkCardRight'><a href='" + linkUrl + "' target='_blank' rel='noopener'>" + "<i class='material-icons md-mnu'>&#xE895;</i>" + "</a></div>";
		//linkCardEle.setAttribute('data-element', JSON.stringify(cardElementInfo));
		cardBody.appendChild(linkCardEle);

		//Experimenting with web players - note: use data.embedded ?
		if (Cards.canEmbedWebPlayer(data.brand) && linkUrl && data.type && (data.type == "musicSearch" || data.type == "videoSearch")){
			//Spotify
			if (data.brand == "Spotify"){
				var webPlayerDiv = document.createElement('DIV');
				webPlayerDiv.className = "spotifyWebPlayer cardBodyItem fullWidthItem";
				var contentUrl = "https://" + linkUrl.replace("spotify:", "open.spotify.com/embed/").replace(":play", "").replace(/:/g, "/").trim();
				webPlayerDiv.innerHTML = '<iframe '
					+ 'src="' + contentUrl + '" width="100%" height="80" frameborder="0" allowtransparency="true" '
					+ 'allow="encrypted-media" '
					+ 'sandbox="allow-forms allow-popups allow-same-origin allow-scripts" ' + '>'
				+ '</iframe>';
				cardBody.appendChild(webPlayerDiv);
			//Apple Music
			}else if (data.brand == "Apple Music"){
				var webPlayerDiv = document.createElement('DIV');
				webPlayerDiv.className = "appleMusicWebPlayer cardBodyItem fullWidthItem";
				var contentUrl;
				if (linkUrl.indexOf("/artist/") > 0){
					contentUrl = linkUrl.replace(/^https:\/\/.*?\//, "https://geo.itunes.apple.com/");		//TODO: basically not working
				}else{
					contentUrl = linkUrl.replace(/^https:\/\/.*?\//, "https://embed.music.apple.com/");
				}
				webPlayerDiv.innerHTML = '<iframe '
					+ 'allow="autoplay *; encrypted-media *;" frameborder="0" height="150" '
					+ 'style="width:100%;max-width:660px;overflow:hidden;background:transparent;" '
					+ 'sandbox="allow-forms allow-popups allow-same-origin allow-scripts ' 
						+ ((SepiaFW.ui.isSafari)? 'allow-storage-access-by-user-activation' : '')
						+ ' allow-top-navigation-by-user-activation" '
					+ 'src="' + contentUrl + '">'
				+ '</iframe>';
				cardBody.appendChild(webPlayerDiv);
			//YouTube
			}else if (data.brand == "YouTube"){
				var webPlayerDiv = document.createElement('DIV');
				var playerId = currentLinkItemId++;
				webPlayerDiv.className = "youTubeWebPlayer cardBodyItem fullWidthItem"
				var f = document.createElement('iframe');
				f.id = 'youTubeWebPlayer-' + playerId;
				f.allow = "autoplay; encrypted-media;";
				f.sandbox = "allow-same-origin allow-scripts allow-presentation"; 
				f.frameBorder = 0;
				f.style.width = "100%";		f.style.height = "280px";		f.style.overflow = "hidden";
				f.style.border = "4px solid";	f.style.borderColor = "#212121";
				if (data.autoplay){
					//stop all previous audio first
					if (SepiaFW.client.controls){
						SepiaFW.client.controls.media({
							action: "stop",
							skipFollowUp: true
						});
					}else{
						SepiaFW.audio.stop();
					}
					addYouTubeControls(f);
				}
				if (linkUrl.indexOf("/embed") < 0){
					//convert e.g.: https://www.youtube.com/results?search_query=purple+haze%2C+jimi+hendrix
					f.src = "https://www.youtube.com/embed?autoplay=1&enablejsapi=1&playsinline=1&iv_load_policy=3&fs=1&listType=search&list=" 
						+ linkUrl.replace(/.*?search_query=/, "").trim();
				}else{
					f.src = linkUrl;
				}
				cardBody.appendChild(webPlayerDiv);
				webPlayerDiv.appendChild(f);
			}
		}
		
		//link button(s)
		(function(linkUrl){
			SepiaFW.ui.onclick($(linkCardEle).find('.linkCardCenter')[0], function(){
			//$(linkCardEle).find('.linkCardCenter').on('click', function(){
				SepiaFW.ui.actions.openUrlAutoTarget(linkUrl);
			});
			SepiaFW.ui.onclick($(linkCardEle).find('.linkCardRight')[0], function(event){
			//$(linkCardEle).find('.linkCardRight').on('click', function(){
				event.preventDefault();
				SepiaFW.ui.actions.openUrlAutoTarget(linkUrl, true);
			});
		})(linkUrl);
		
		//extra buttons
		/*
		$(linkCardEle).find('.linkCardLogo').each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
			//$(this).on('click', function(){
				Cards.moveToMyViewOrDelete($(that).closest('.sepiaFW-cards-flexSize-container')[0]);
			});
		});
		*/
		makeLinkCardContextMenu(cardElement.id, cardBody, linkCardEle, cardElementInfo, data.type);
		
		cardElement.appendChild(cardBody);
		return cardElement;
	}
	function makeLinkCardContextMenu(flexCardId, cardBody, cardBodyItem, linkElementInfo, linkElementType){
		//some additional data
		var newBodyClass = "sepiaFW-cards-list-body sepiaFW-cards-list-link";			//class in case we need to create new body
		var shareButton = {
			type: SepiaFW.client.SHARE_TYPE_LINK,
			data: linkElementInfo,
			buttonName: SepiaFW.local.g('exportToUrl'),
			buttonTitle: "Copy SEPIA share link to clipboard."	//TODO: add local translation
		}
		var copyUrlButton = {
			buttonName: SepiaFW.local.g('copyUrl'),
			url: linkElementInfo.url
		}
		//context menu
		var contextMenu = makeBodyElementContextMenu(flexCardId, cardBody, cardBodyItem, cardBodyItem.id, {
			toggleButtonSelector: ".linkCardLogo",
			newBodyClass: newBodyClass,
			shareButton: shareButton,
			copyUrlButton: copyUrlButton
		});
	}
	
	//----------------------------- common elements ---------------------------------
				
	//Card header
	function makeHeader(headerConfig, cardElement){
		var titleName = headerConfig.name;
		var titleBackground = headerConfig.background || '';
		var titleTextColor = headerConfig.textColor || '';
		var titleCssClass = headerConfig.cssClass || '';
		var titleIsEditable = headerConfig.isEditable || false;
		var addDeleteListButton = headerConfig.addDeleteListButton || false;
		var addSaveListButton = headerConfig.addSaveListButton || false;
		var addAddDefaultListItemButton = headerConfig.addAddDefaultListItemButton || false;
		
		//-Title with context menu
		var title = document.createElement('DIV');
		title.className = "sepiaFW-cards-list-title";
		if (titleCssClass){
			title.className += (" " + titleCssClass);
		}else{
			if (titleBackground) title.style.background = titleBackground;
			if (titleTextColor) title.style.color = titleTextColor;
		}
		if (!titleIsEditable){
			title.innerHTML = "<span>" + titleName + "</span>";
		}else{
			//default title with editable stuff
			title.innerHTML = "<span class='sepiaFW-title-span' contentEditable='true'>" + titleName + "</span>";
			SepiaFW.ui.onclick($(title).find('.sepiaFW-title-span')[0], function(){
				$(title).find('.sepiaFW-title-span').focus();
			});
			var titleSpan = $(title).find("span");
			titleSpan.on('focusout', function(){
				//update data
				var listEle = $(this).parent().parent();
				var eleData = JSON.parse(listEle.attr('data-list'));
				var newTitle = $(this).html();
				newTitle = newTitle.replace(/<br>|<div>|<\/div>/g, "").trim(); 			//happens when the user presses enter(?)
				newTitle = newTitle.replace(/-|_|!|\?|,|\.|'/g, " ").trim();			//remove some special chars
				newTitle = (newTitle.length > 25)? newTitle.substring(0,24) : newTitle; //brutally shorten title - TODO: improve
				eleData.title = newTitle;
				$(this).html(newTitle);
				listEle.attr('data-list', JSON.stringify(eleData));
				//activate save button
				var saveButton = $(this).closest('.sepiaFW-cards-flexSize-container').find('.sepiaFW-cards-list-saveBtn');
				saveButton.addClass('active');		//saveBtn.css({"opacity": 0.92, "color": saveBtn.parent().css("color")});
			});
			titleSpan.keypress(function(event){
				var keycode = event.keyCode || event.which;
				if(keycode == '13'){
					$('#sepiaFW-chat-input').focus().blur(); 	//workaround since SPAN can't be blurred
				}
				event.preventDefault;
			});
		}
		//-context menu
		var contextMenu = document.createElement('DIV');
		contextMenu.className = "sepiaFW-cards-list-contextMenu sepiaFW-menu";
		contextMenu.id = ("sepiaFW-contextMenu-id-" + Cards.currentCardId);
		var cmList = document.createElement('UL');
		
		//move to my view
		var moveToMyViewBtn = document.createElement('LI');
		moveToMyViewBtn.className = "sepiaFW-cards-list-moveBtn";
		moveToMyViewBtn.innerHTML = '<i class="material-icons md-24">add_to_home_screen</i>'; //SepiaFW.local.g('moveToMyView');
		moveToMyViewBtn.title = SepiaFW.local.g('moveToMyView');
		SepiaFW.ui.onclick(moveToMyViewBtn, function(){
			var flexBox = $(moveToMyViewBtn).closest('.sepiaFW-cards-flexSize-container');
			Cards.moveToMyViewOrDelete(flexBox[0]);
			$(contextMenu).hide();
			$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + contextMenu.id));
			$(moveToMyViewBtn).remove();
		}, true);
		cmList.appendChild(moveToMyViewBtn);

		//add default list item
		if (addAddDefaultListItemButton){
			var addItemBtn = document.createElement('LI');
			addItemBtn.className = "sepiaFW-cards-list-addBtn";
			addItemBtn.innerHTML = '<i class="material-icons md-24">add_circle_outline</i>'; //SepiaFW.local.g('addItem');
			addItemBtn.title = SepiaFW.local.g('addItem');
			SepiaFW.ui.onclick(addItemBtn, function(){
				var listContainer = $(addItemBtn).closest('.sepiaFW-cards-flexSize-container').get(0);
				var listInfoObj = getUserDataList(listContainer);
				var emptyItemData = makeProductivityListObject('', listInfoObj.indexType);
				var emptyEle = makeUserDataListElement(emptyItemData, listInfoObj);
				var cardBody = $(addItemBtn).closest('.sepiaFW-cards-flexSize-container').find('.sepiaFW-cards-list-body');
				if (cardBody.length == 0){
					cardBody = document.createElement('DIV');
					cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-unknownType";
					$(addItemBtn).closest('.sepiaFW-cards-flexSize-container').append(cardBody);
				}
				cardBody.prepend(emptyEle);
				setupUserDataListElementButtons(emptyEle);
				//emptyEle.scrollIntoView({block: 'center'});
				/*$(contextMenu).fadeOut(200);
				$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + contextMenu.id));*/
			}, true);
			cmList.appendChild(addItemBtn);
		}
		
		//hide
		var cmHideBtn = document.createElement('LI');
		cmHideBtn.className = "sepiaFW-cards-list-contextMenu-hideBtn";
		cmHideBtn.innerHTML = '<i class="material-icons md-24">visibility_off</i>'; //SepiaFW.local.g('hideItem');
		cmHideBtn.title = SepiaFW.local.g('hideItem');
		SepiaFW.ui.onclick(cmHideBtn, function(){
			$(cmHideBtn).closest('.sepiaFW-cards-flexSize-container').fadeOut(300, function(){
				$(this).remove();
			});
		}, true);
		cmList.appendChild(cmHideBtn);

		//delete list
		if (addDeleteListButton){
			var cmDelBtn = document.createElement('LI');
			cmDelBtn.className = "sepiaFW-cards-list-contextMenu-delBtn";
			cmDelBtn.innerHTML = '<i class="material-icons md-24">delete</i>'; //SepiaFW.local.g('deleteItem');
			cmDelBtn.title = SepiaFW.local.g('deleteItem');
			SepiaFW.ui.onclick(cmDelBtn, function(){
				var listInfo = JSON.parse(cmDelBtn.parentElement.parentElement.parentElement.parentElement.getAttribute('data-list')); 		//TODO: replace with $().closest('...')
				var parentCard = $(cmDelBtn).parent().parent().parent().parent();															//TODO: replace with $().closest('...')
				SepiaFW.ui.build.askConfirm(SepiaFW.local.g('deleteItemConfirm'), function(){
					//ok
					SepiaFW.account.deleteList(listInfo, function(data){
						parentCard.fadeOut(300);
					}, function(msg){
						SepiaFW.ui.showPopup(msg);
					});

				}, function(){
					//abort
				});
			}, true);
			cmList.appendChild(cmDelBtn);	
		}
		contextMenu.appendChild(cmList);
		title.appendChild(contextMenu);
		
		//-extra buttons
		//--save
		if (addSaveListButton){
			var saveBtn = document.createElement('BUTTON');
			saveBtn.className = "sepiaFW-cards-list-saveBtn";
			saveBtn.innerHTML = "<i class='material-icons md-mnu'>&#xE864;</i>";
			var storeFun = function(listInfoObj){
				var writeData = {};
				writeData.lists = listInfoObj;
				SepiaFW.account.saveList(listInfoObj, function(data){
					SepiaFW.debug.log('Account - successfully stored list: ' + listInfoObj.indexType + ", " + listInfoObj.title);
					//deactivate save button
					$(saveBtn).removeClass('active');
				}, function(msg){
					SepiaFW.ui.showPopup(msg);
				});
			}
			SepiaFW.ui.onclick(saveBtn, function(){
				var listContainer = $(saveBtn).closest('.sepiaFW-cards-flexSize-container').get(0);
				var listInfoObj = getUserDataList(listContainer);
				//check user
				if (SepiaFW.account && (SepiaFW.account.getUserId() !== listInfoObj.user)){
					//different user
					SepiaFW.ui.build.askConfirm(SepiaFW.local.g('copyList'), function(){
						//ok
						delete listInfoObj.user;
						delete listInfoObj._id;
						storeFun(listInfoObj);
					}, function(){
						//abort
					});
				}else{
					//same user
					storeFun(listInfoObj);
				}
			});
			title.appendChild(saveBtn);
		//--dummy space holder
		}else{
			var dummyBtn = document.createElement('DIV');
			dummyBtn.className = "sepiaFW-cards-list-dummyBtn";
			title.appendChild(dummyBtn);
		}
		//--context menu button
		var contextMenuBtn = document.createElement('BUTTON');
		contextMenuBtn.className = "sepiaFW-cards-list-menuBtn";
		contextMenuBtn.innerHTML = "<i class='material-icons md-mnu'>&#xE5D3;</i>";
		SepiaFW.ui.onclick(contextMenuBtn, function(){
			var title = $(contextMenuBtn).parent();
			var flexBox = title.closest('.sepiaFW-cards-flexSize-container');
			var menu = flexBox.find(".sepiaFW-cards-list-contextMenu:not(.sepiaFW-cards-contextMenu-single)").first();
			/*
			//flexBox.css({"z-index" : topIndexZ++});			//old overlay style
			var menuHeight = menu.innerHeight();
			//menu.css({"top" : ((title.height() + 2) + "px")});
			if (menu.css('display') === 'none'){
				flexBox.css({'min-height' : (menuHeight + 50)});
				SepiaFW.ui.closeAllMenusThatCollide(menu);
			}else{
				flexBox.css({'min-height' : 50});
			}
			*/
			//menu.fadeToggle(300);
			menu.slideToggle(300);
		});
		//catch menue close event
		$('#sepiaFW-main-window').on("sepiaFwClose-" + contextMenu.id, function(){
			//close
			$(contextMenu).closest('.sepiaFW-cards-flexSize-container').css({'min-height' : 50});
		});
		title.appendChild(contextMenuBtn);
		
		return title;
	}

	//Card body element context menu
	function makeBodyElementContextMenu(flexCardId, cardBody, cardBodyItem, cardBodyItemId, menuConfig, skipAdd){
		//-context menu
		var contextMenu = document.createElement('DIV');
		contextMenu.className = "sepiaFW-cards-list-contextMenu sepiaFW-cards-contextMenu-single sepiaFW-menu"; 	//we simply keep the cards-list style here
		contextMenu.id = (flexCardId + "-contextMenu-id-" + cardBodyItemId);
		var cmList = document.createElement('UL');

		$(cardBodyItem).find(menuConfig.toggleButtonSelector).each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
				var $contextMenu = $(contextMenu);
				var animTime = 300;
				if ($contextMenu.css("display") == "none"){
					$contextMenu.slideToggle(animTime);
					//avoid that the menu is hidden behind control when at bottom of results view
					if ($contextMenu.is(":last-child")){
						var $container = $contextMenu.closest('.sepiaFW-cards-flexSize-container');
						var $lastVisibleChildInScrollParent = $container.closest('.sepiaFW-results-container').children().filter(":visible").last();
						var $lastVisibleParentChild = $container.parent().children().filter(":visible").last();
						if (($container.is($lastVisibleParentChild) && $container.parent().is($lastVisibleChildInScrollParent)) || $container.is($lastVisibleChildInScrollParent)){
							//scroll down another 60px
							setTimeout(function(){
								var $scrollContainer = $container.closest('.sepiaFW-results-container');
								var y = $scrollContainer.scrollTop(); 
								$scrollContainer.animate({ scrollTop: y + 60 }, animTime);
							}, animTime + 50);
						}
					}
				}else{
					$contextMenu.slideToggle(animTime);
				}
			});
		});
		
		//move to my view
		if (menuConfig.myViewButton == undefined || menuConfig.myViewButton == true){
			var moveToMyViewBtn = document.createElement('LI');
			moveToMyViewBtn.className = "sepiaFW-cards-button sepiaFW-cards-list-moveBtn"; 		//will be surpressed inside '#sepiaFW-my-view' via CSS (here we have no destination yet)
			moveToMyViewBtn.innerHTML = SepiaFW.local.g('moveToMyView'); //'<i class="material-icons md-24">add_to_home_screen</i>';
			moveToMyViewBtn.title = SepiaFW.local.g('moveToMyView');
			SepiaFW.ui.onclick(moveToMyViewBtn, function(){
				var flexCard = $(moveToMyViewBtn).closest(".sepiaFW-cards-flexSize-container");
				var title = flexCard.find('.sepiaFW-cards-list-title');
				if (title.length > 0){
					//single element?
					/*
					var isOnlyElement = false;
					if (flexCard.find('.sepiaFW-cards-list-body').children().length == 1){
						isOnlyElement = true;
					}
					*/
					//hide save button (just to be sure the user does not save an incomplete list)
					title.find(".sepiaFW-cards-list-saveBtn").animate({ opacity: 0.0 }, 500, function(){
						$(this).css({opacity: 0.5, visibility: "hidden"});
					});
					//create new body for element
					var cardBody = document.createElement('DIV');
					cardBody.className = menuConfig.newBodyClass;
					//fade out the element, add it to new body and then move it over
					$(cardBodyItem).fadeOut(500, function(){
						var parentN = cardBodyItem.parentNode;
						parentN.removeChild(cardBodyItem);
						parentN.removeChild(contextMenu);
						$(cardBodyItem).fadeIn(0);
						cardBody.style.display = "none";
						cardBody.appendChild(cardBodyItem);
						cardBody.appendChild(contextMenu);
						//update id
						//contextMenu.id = (flexCardId + "-contextMenu-id-" + cardBodyItemId);
						Cards.moveToMyViewOrDelete(cardBody);
					});
				}else{
					Cards.moveToMyViewOrDelete(flexCard[0]);
				}
				$(contextMenu).hide();
				$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + contextMenu.id));
				$(moveToMyViewBtn).remove(); 		//we will try to surpress this via CSS inside '#sepiaFW-my-view' as well
			}, true);
			cmList.appendChild(moveToMyViewBtn);
		}

		//Android intents
		if (SepiaFW.ui.isAndroid && menuConfig.androidIntentButtons && menuConfig.androidIntentButtons.length > 0){
			menuConfig.androidIntentButtons.forEach(function(intent){
				/*intent = {
					action: "...",
					extras: {"query": "...", ...},
					url: "content://...",
					buttonName: "...",
					buttonTitle: "..."
				}*/
				//create button
				var androidIntentBtn = document.createElement('LI');
				androidIntentBtn.className = "sepiaFW-cards-button sepiaFW-cards-list-contextMenu-androidIntentBtn";
				androidIntentBtn.innerHTML = intent.buttonName || 'Android';
				if (intent.buttonTitle) androidIntentBtn.title = intent.buttonTitle;
				SepiaFW.ui.onclick(androidIntentBtn, function(){
					//call intent
					//$(contextMenu).fadeOut(500);	
					SepiaFW.android.intentActivity(intent, function(intent){
						//Success
					}, function(info){
						//Error
					});
				}, true);
				cmList.appendChild(androidIntentBtn);
			});
		}

		//share link
		if (menuConfig.shareButton){
			//create button
			var shareBtn = document.createElement('LI');
			shareBtn.className = "sepiaFW-cards-button sepiaFW-cards-list-contextMenu-shareBtn";
			shareBtn.innerHTML = menuConfig.shareButton.buttonName;
			SepiaFW.ui.onclick(shareBtn, function(){
				//copy link
				//$(contextMenu).fadeOut(500);
				var shareData = {
					type: menuConfig.shareButton.type,
					data: menuConfig.shareButton.data
				}
				SepiaFW.ui.showPopup("Click OK to copy link to clipboard", {
					inputLabelOne: "Link",
					inputOneValue: (SepiaFW.client.deeplinkHostUrl + "?share=" + encodeURIComponent(JSON.stringify(shareData))),
					buttonOneName: "OK",
					buttonOneAction: function(btn, linkValue, iv2, inputEle1, ie2){
						if (linkValue && inputEle1){
							//select text and copy
							inputEle1.select();
							document.execCommand("copy");
						}
					},
					buttonTwoName: "ABORT",
					buttonTwoAction: function(){}
				});
			}, true);
			cmList.appendChild(shareBtn);
		}
		//Copy link
		if (menuConfig.copyUrlButton){
			//create button
			var copyUrlBtn = document.createElement('LI');
			copyUrlBtn.className = "sepiaFW-cards-button sepiaFW-cards-list-contextMenu-copyUrlBtn";
			copyUrlBtn.innerHTML = menuConfig.copyUrlButton.buttonName;
			SepiaFW.ui.onclick(copyUrlBtn, function(){
				//copy link
				SepiaFW.ui.showPopup("Click OK to copy link to clipboard", {
					inputLabelOne: "Link",
					inputOneValue: menuConfig.copyUrlButton.url,
					buttonOneName: "OK",
					buttonOneAction: function(btn, linkValue, iv2, inputEle1, ie2){
						if (linkValue && inputEle1){
							//select text and copy
							inputEle1.select();
							document.execCommand("copy");
						}
					},
					buttonTwoName: "ABORT",
					buttonTwoAction: function(){}
				});
			}, true);
			cmList.appendChild(copyUrlBtn);
		}

		//hide
		if (menuConfig.hideButton == undefined || menuConfig.hideButton == true){
			var cmHideBtn = document.createElement('LI');
			cmHideBtn.className = "sepiaFW-cards-button sepiaFW-cards-list-contextMenu-hideBtn";
			cmHideBtn.innerHTML = SepiaFW.local.g('hideItem'); //'<i class="material-icons md-24">visibility_off</i>';
			cmHideBtn.title = SepiaFW.local.g('hideItem');
			SepiaFW.ui.onclick(cmHideBtn, function(){
				var flexCard = $(cmHideBtn).closest(".sepiaFW-cards-flexSize-container");
				var title = flexCard.find('.sepiaFW-cards-list-title');
				if (title.length > 0){
					//hide save button (just to be sure the user does not save an incomplete list)
					title.find(".sepiaFW-cards-list-saveBtn").animate({ opacity: 0.0 }, 500, function(){
						$(this).css({opacity: 0.5, visibility: "hidden"});
					});
					$(contextMenu).fadeOut(480);
					$(cardBodyItem).fadeOut(500, function(){
						if (flexCard.find('.cardBodyItem').filter(":visible").length == 0){
							flexCard.remove();
						}
					});
				}else{
					flexCard.fadeOut(500, function(){
						flexCard.remove();
					});
				}
			}, true);
			cmList.appendChild(cmHideBtn);
		}

		contextMenu.appendChild(cmList);
		if (!skipAdd){
			cardBody.appendChild(contextMenu);
		}

		return contextMenu;
	}
	
	//Card footer
	function makeFooter(footerConfig){
		var type = footerConfig.type || '';
		var footerCssClass = footerConfig.cssClass || '';
		var visibleItems = (footerConfig.visibleItems == undefined)? -1 : footerConfig.visibleItems;
		var footer = document.createElement('DIV');
		footer.className = "sepiaFW-cards-list-footer";
		if (footerCssClass){
			footer.className += (" " + footerCssClass);
		}
		//extend toggle button
		if (type === 'showHideButton'){
			footer.innerHTML = "<i class='material-icons md-txt'>&#xE5CF;</i>";
			SepiaFW.ui.onclick(footer, function(){
				var $footer = $(footer);
				if (!$footer.attr('data-extended') || $footer.attr('data-extended') == 'off'){
					$footer.attr('data-extended', 'on');
					$footer.html("<i class='material-icons md-txt'>&#xE5CE;</i>");
					//$(footerConfig.cardBody).find('.itemHidden').removeClass('itemHidden').addClass('itemVisible');
					$(footerConfig.cardBody).find('.itemHidden').each(function(index){
						var self = $(this);
						setTimeout(function() {
							self.removeClass('itemHidden').addClass('itemVisible');
						}, 25*index);
					});
				}else{
					$footer.attr('data-extended','off');
					$footer.html("<i class='material-icons md-txt'>&#xE5CF;</i>");
					//Refresh first N items visibility (in case list was re-ordered)
					var $items = $(footerConfig.cardBody).find('.cardBodyItem').removeClass('itemVisible itemHidden');
					if (visibleItems >= 0){
						$items.slice(visibleItems).addClass('itemHidden');
					}
					//$(footerConfig.cardBody).find('.itemVisible').removeClass('itemVisible').addClass('itemHidden');
					//footer.scrollIntoView({block: 'center', inline: 'nearest'}); 
					var $scrollBody = $footer.closest(SepiaFW.ui.JQ_RES_VIEW_IDS);
					var $card = $footer.closest('.sepiaFW-cards-flexSize-container');
					var $msg = $footer.closest('.chatMsg');
					//var $title = $card.find('.sepiaFW-cards-list-title');
					var offset = 0;
					if ($msg.length > 0){
						offset = $msg[0].offsetTop;
					}
					if (!SepiaFW.ui.isTopOfChildVisibleInsideScrollable($card[0], $scrollBody[0], offset)){
						SepiaFW.ui.scrollToElement($card[0], $scrollBody[0], 50);
					}
					SepiaFW.animate.flashObj(footer);
				}
			});
		}else{
			var content = footerConfig.content || '';
			if (content){
				footer.innerHTML = content;
			}else{
				footer.innerHTML = 'footer';
			}
		}
		return footer;
	}

	//------ YouTube Card Controls ------

	var youTubeMessageListenerExists = false;
	var youTubePlayersTriedToStart = {};
	var youTubeLastActivePlayerId = undefined;
	var youTubeLastActivePlayerState = undefined;
	var youTubePlayConfirmTimer = undefined;

	function addYouTubeControls(frameEle){
		frameEle.onload = function(){
			//API
			if (!youTubeMessageListenerExists){
				youTubeMessageListenerExists = true;
				window.addEventListener('message', function(e){
					if (e.origin == "https://www.youtube.com" && e.data && typeof e.data == "string" && e.data.indexOf("{") == 0){
						var data = JSON.parse(e.data);
						if (data && data.id){
							var $player = $('#' + data.id);
							//console.log("YouTube iframe event: " + data.event);
							if ($player.length == 0){
								return;
							}
							if (data.event == 'onReady'){
                                setTimeout(function(){
                                    $player[0].contentWindow.postMessage(JSON.stringify({event:'command', func:'playVideo'}), "*");
                                }, 1000);
							}else if (data.event == 'infoDelivery' && data.info){
								//console.log(JSON.stringify(data));
								if (data.info.playerState != undefined){
									youTubeLastActivePlayerState = data.info.playerState;
								}
								youTubeLastActivePlayerId = data.id;
								if (data.info.playerState == -1){
									//Skip if faulty
									youTubeSkipIfNotPlayed(data, $player);
								}else if (data.info.playerState == 1){
									clearTimeout(youtubeSkipTimer);
									clearTimeout(youTubePlayConfirmTimer);
								}
							}
						}
					}
				});
			}
			frameEle.contentWindow.postMessage(JSON.stringify({event:'listening', id: frameEle.id}), "*");
		};
	}
	var youtubeSkipTimer = undefined;
	function youTubeSkipIfNotPlayed(data, $player, skipFirstTest){
		if (skipFirstTest || data.info.availableQualityLevels.length == 0){
			//console.log(data.info.playlist.length - 1);
			//console.log(data.info.playlistIndex);
			if (!youTubePlayersTriedToStart[data.id] && data.info.playlistIndex == 0){
				youTubePlayersTriedToStart[data.id] = true;
				//console.log('--- next A ---');
				clearTimeout(youtubeSkipTimer);
				youtubeSkipTimer = setTimeout(function(){
                    $player[0].contentWindow.postMessage(JSON.stringify({event:'command', func:'nextVideo'}), "*");
                }, 1000);
			}else if (data.info.playlist && data.info.playlist.length > 0){
				if (data.info.playlistIndex != undefined && data.info.playlistIndex < (data.info.playlist.length - 1)){
					//console.log('--- next B ---');
					clearTimeout(youtubeSkipTimer);
					youtubeSkipTimer = setTimeout(function(){
					    $player[0].contentWindow.postMessage(JSON.stringify({event:'command', func:'nextVideo'}), "*");
                    }, 1000);
					delete youTubePlayersTriedToStart[data.id];
				}
			}
		}else{
			//confirm play
			clearTimeout(youtubeSkipTimer);
			youTubeSetConfirmTimer(data, $player);
		}
	}
	function youTubeSetConfirmTimer(data, $player){
		clearTimeout(youTubePlayConfirmTimer);
		youTubePlayConfirmTimer = setTimeout(function(){
			//console.log('--- confirm check ---');
			if (Cards.youTubePlayerGetState() != 1){
				data.info.playlistIndex++;
				youTubeSkipIfNotPlayed(data, $player, true);
			}
		}, 3000);
	}
	Cards.youTubePlayerGetState = function(){
		if (youTubeLastActivePlayerId){
			var $player = $('#' + youTubeLastActivePlayerId);
			if ($player.length == 0){
				return 0;
			}else{
				return youTubeLastActivePlayerState;
			}
		}else{
			return 0;
		}
	}
	Cards.youTubePlayerControls = function(cmd){
		clearTimeout(youTubePlayConfirmTimer);
		if (youTubeLastActivePlayerId && youTubeLastActivePlayerState > 0){
			var $player = $('#' + youTubeLastActivePlayerId);
			if ($player.length == 0){
				return 0;
			}else{
				if (cmd == "stop" || cmd == "pause"){
					$player[0].contentWindow.postMessage(JSON.stringify({event:'command', func:'pauseVideo'}), "*"); 	//NOTE: we use pause for now because stop triggers next video
					return 1;	
				}else if (cmd == "next"){
					$player[0].contentWindow.postMessage(JSON.stringify({event:'command', func:'nextVideo'}), "*");
					return 1;	
				}else{
					return 0;
				}
				//frameEle.contentWindow.postMessage(JSON.stringify({event:'command', func:'stopVideo'}), "*"); //playVideo, paus.., stop.., next..,
			}
		}
	}
	
	return Cards;
}
