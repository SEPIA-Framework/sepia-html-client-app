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
	Cards.currentCardId = 0;		//increasing id for every card element
	var topIndexZ = 1;			//to get an active element to the top
	
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
	Cards.moveToMyViewOrDelete = function(eleOrCard){
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
			if (myViewParent.length > 0){
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
		
		var indexType = cardElementInfo.indexType;
		var titleName = cardElementInfo.title;
		var isTimerAndAlarmsList = (indexType === INDEX_TYPE_ALARMS); 	//Note: section === "timeEvents" might even be better here
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
			"addDeleteListButton" : true,
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
				var listEle = makeTimerElement(elementsData[i]);
				cardBody.appendChild(listEle);
				if (hasTimer === 0) { hasTimer = 1;	cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-timers"; }
				//refresh interval actions
				SepiaFW.events.addOrRefreshTimeEvent(elementsData[i].targetTimeUnix, elementsData[i].eleType, elementsData[i]);
			
			//alarm element
			}else if (elementsData[i].eleType === "alarm"){
				var listEle = makeAlarmElement(elementsData[i]);
				cardBody.appendChild(listEle);
				if (hasAlarm === 0) { hasAlarm = 1; cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-alarms"; }
				//refresh interval actions
				SepiaFW.events.addOrRefreshTimeEvent(elementsData[i].targetTimeUnix, elementsData[i].eleType, elementsData[i]);
			
			//default: checkable element (default list element)
			}else{
				var listEle = makeUserDataListElement(elementsData[i], cardElementInfo);
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
			var dragOptions = Object.assign({
				"tapCallback": shortPress,
				"dropCallback": dropCallback
			}, udListCheckablesDragOptions);
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
			timeEvent = makeTimerElement(actionInfoI);
		}else{
			//ALARM
			cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-alarms";
			timeEvent = makeAlarmElement(actionInfoI);
		}
		cardBody.appendChild(timeEvent);
		
		cardElement.appendChild(cardBody);
		return cardElement;
	}
	//timeEvent elements
	function makeTimerElement(actionInfoI){ 	//actionInfoI can also be the data of an list element, should be compatible (in the most important fields)!
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
		makeTimeEventRemoveButton(timeEvent);
		makeTimeEventToMyViewButton(timeEvent, SepiaFW.events.TIMER);
		return timeEvent;
	}
	function makeAlarmElement(actionInfoI){		//actionInfoI can also be the data of an list element, should be compatible (in the most important fields)!
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
		makeTimeEventRemoveButton(timeEvent);
		makeTimeEventToMyViewButton(timeEvent, SepiaFW.events.ALARM);
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
	function makeTimeEventToMyViewButton(timeEvent, eventType){
		$(timeEvent).find('.timeEventLeft').each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
			//$(this).on('click', function(){
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
	function makeTimeEventRemoveButton(timeEvent){
		$(timeEvent).find('.timeEventRight').each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
			//$(this).on('click', function(){
				var timeEventEle = $(that).parent(); 		//TODO: potential to fail if DOM structure changed (use closest(...))
				//delete event
				var Timer = '';
				if (timeEventEle[0].hasAttribute('data-element')){
					//var event = JSON.parse(timeEventEle.attr('data-element'));
					var eventId = timeEventEle.attr('data-id');
					Timer = SepiaFW.events.getRunningOrActivatedTimeEventById(eventId);
					if (Timer){
						var resyncList = true;
						SepiaFW.events.removeTimeEvent(Timer.name, resyncList);		//timeEventEle[0].id
					}
				}
				//stop alarm and remove 
				if (SepiaFW.audio){
					SepiaFW.audio.stopAlarmSound();
				}				
				//remove DOM element and parent if emtpy
				if (Timer){
					$(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-id="' + Timer.data.eventId + '"]').each(function(){
						removeTimeEventElement(this);
					});
					//linked messages:
					$(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-msg-custom-tag="' + Timer.data.eventId + '"]').each(function(){
						this.remove();
					});
				}else{
					removeTimeEventElement(timeEventEle[0]);
				}
			});
		});
	}	
	//remove element and parent if possible
	function removeTimeEventElement(timeEventEle){
		var flexCardBody = $(timeEventEle).parent();
		var flexCard = flexCardBody.parent();
		$(timeEventEle).remove();
		if (flexCardBody.children().length == 0 && flexCard.children().length == 1){
			//only empty body left (no title / header)
			flexCard.remove();
		}else{
			//assume list update so activate save button
			var saveBtn = flexCard.find('.sepiaFW-cards-list-saveBtn');
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
			//$(this).on('click', function(){
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
		linkCardEle.innerHTML = "<div class='linkCardLogo' " + ((linkLogoBack)? ("style='background:" + linkLogoBack + ";'") : ("")) + "><img src='" + cardElementInfo.image + "' alt='logo'></div>"
								+ "<div class='linkCardCenter'>" + (data.title? ("<h3>" + data.title + "</h3>") : ("")) + "<p>" + data.desc + "</p></div>"
								+ "<div class='linkCardRight'><a href='" + linkUrl + "' target='_blank'>" + "<i class='material-icons md-mnu'>&#xE895;</i>" + "</a></div>";
		//linkCardEle.setAttribute('data-element', JSON.stringify(cardElementInfo));
		cardBody.appendChild(linkCardEle);
		
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
		$(linkCardEle).find('.linkCardLogo').each(function(){
			var that = this;
			SepiaFW.ui.onclick(that, function(){
			//$(this).on('click', function(){
				Cards.moveToMyViewOrDelete($(that).closest('.sepiaFW-cards-flexSize-container')[0]);
			});
		});
		
		cardElement.appendChild(cardBody);
		return cardElement;
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
		moveToMyViewBtn.className = "sepiaFW-cards-list-addBtn";
		moveToMyViewBtn.innerHTML = SepiaFW.local.g('moveToMyView');
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
		cmHideBtn.innerHTML = SepiaFW.local.g('hideItem');
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
			var menu = flexBox.find(".sepiaFW-cards-list-contextMenu");
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
			//$(footer).on('click', function(){
				if (!$(footer).attr('data-extended') || $(footer).attr('data-extended') == 'off'){
					$(footer).attr('data-extended', 'on');
					$(footer).html("<i class='material-icons md-txt'>&#xE5CE;</i>");
					//$(footerConfig.cardBody).find('.itemHidden').removeClass('itemHidden').addClass('itemVisible');
					$(footerConfig.cardBody).find('.itemHidden').each(function(index){
						var self = $(this);
						setTimeout(function() {
							self.removeClass('itemHidden').addClass('itemVisible');
						}, 25*index);
					});
				}else{
					$(footer).attr('data-extended','off');
					$(footer).html("<i class='material-icons md-txt'>&#xE5CF;</i>");
					//Refresh first N items visibility (in case list was re-ordered)
					var $items = $(footerConfig.cardBody).find('.cardBodyItem').removeClass('itemVisible itemHidden');
					if (visibleItems >= 0){
						$items.slice(visibleItems).addClass('itemHidden');
					}
					//$(footerConfig.cardBody).find('.itemVisible').removeClass('itemVisible').addClass('itemHidden');
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
	
	return Cards;
}