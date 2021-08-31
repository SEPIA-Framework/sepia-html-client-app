//CARDS
function sepiaFW_build_ui_cards(){
	var Cards = {};

	//load child libs
	Cards.embed = sepiaFW_build_ui_cards_embed();
	
	//card collection types
	var UNI_LIST = "uni_list";
	var SINGLE = "single";
	var GROUPED_LIST = "grouped_list";
	
	//card element types
	var USER_DATA_LIST = "userDataList";
	var RADIO_CARD_ELE = "radio";
	var NEWS_CARD_ELE = "news";
	var WEATHER_NOW = "weatherNow";
	var WEATHER_DAY = "weatherDay";
	var WEATHER_TOMORROW = "weatherTmo";
	var WEATHER_WEEK = "weatherWeek";	//NOTE: actually we treat all weather cards with same method
	var LINK = "link";
	
	//states
	Cards.currentCardId = 0;	//increasing id for every card element
	var topIndexZ = 1;			//to get an active element to the top (deprecated?)

	//some specials
	var storedEmbedSettings = SepiaFW.data.get("embeddedPlayerSettings") || {};
	Cards.canEmbedCustomPlayer = true;
	Cards.canEmbedYouTube = (storedEmbedSettings.canEmbedYouTube != undefined)?
		storedEmbedSettings.canEmbedYouTube : true;
	Cards.canEmbedSpotify = (storedEmbedSettings.canEmbedSpotify != undefined)?
		storedEmbedSettings.canEmbedSpotify : false;	//deactivated by default because it only works in desktop and gives no control over start/stop/volume
	Cards.canEmbedAppleMusic = (storedEmbedSettings.canEmbedAppleMusic != undefined)?
		storedEmbedSettings.canEmbedAppleMusic : false;		// "" ""
	Cards.canEmbedSoundCloud = (storedEmbedSettings.canEmbedSoundCloud != undefined)?
		storedEmbedSettings.canEmbedSoundCloud : false;		//TODO: not selectable yet
	Cards.getSupportedWebPlayers = function(){
		var players = [];
		if (Cards.canEmbedCustomPlayer) players.push("embedded");
		if (Cards.canEmbedYouTube) players.push("youtube");
		if (Cards.canEmbedSpotify) players.push("spotify");
		if (Cards.canEmbedAppleMusic) players.push("apple_music");
		if (Cards.canEmbedSoundCloud) players.push("soundcloud");
		return players;
	}
	Cards.canEmbedWebPlayer = function(service){
		if (!service) return false;
		service = service.toLowerCase().replace(/\s+/, "_"); 		//support brands too
		if (service.indexOf("embedded") == 0){
			return Cards.canEmbedCustomPlayer;
		}else if (service.indexOf("spotify") == 0){
			return Cards.canEmbedSpotify;
		}else if (service.indexOf("apple_music") == 0){
			return Cards.canEmbedAppleMusic;
		}else if (service.indexOf("youtube") == 0){
			return Cards.canEmbedYouTube;
		}else if (service.indexOf("soundcloud") == 0){
			return Cards.canEmbedSoundCloud;
		}else{
			return false;
		}
	}
	Cards.canEmbedUrl = function(url){
		if (!url) return false;
		var testUrl = url.toLowerCase().trim();
		//YouTube
		if (Cards.canEmbedYouTube && !!testUrl.match(/https:\/\/(www\.|m\.|)(youtube|youtube-nocookie|youtu)\.(com|be)/)){
			var testUrl = testUrl	//easier for testing
				.replace("www.", "")
				.replace("youtube-nocookie", "youtube")
				.replace("m.youtube", "youtube")
				.replace("youtu.be/", "youtube.com/embed/");
			if (testUrl.indexOf("https://youtube.com") == 0 && (
				testUrl.indexOf("/embed") == 19
				|| testUrl.indexOf("/playlist") == 19
				|| testUrl.indexOf("listType=playlist") > 0
				|| !!testUrl.match(/(&|\?)v=.+/)
			)){
				return {
					type: "videoSearch",
					typeData: {service: "youtube", uri: url}
				}
			}
		}
		return false;
	}
	
	//get a full card result as DOM element
	Cards.get = function(assistAnswer, sender, isSafeSource){
		//Note: 'isSafeSource' is a message sent by an assistant to the user specifically or in a private channel
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
						else if (elementType === WEATHER_NOW || elementType === WEATHER_DAY ||
								elementType === WEATHER_TOMORROW || elementType === WEATHER_WEEK){
							var cardElement = buildWeatherElementA(cardInfoI.info[j]);
							card.dataInline.push(cardElement);
						}
						//Link
						else if (elementType === LINK){
							var cardElement = buildLinkElement(cardInfoI.info[j], isSafeSource);
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
	Cards.moveToMyViewOrDelete = function(eleOrCard, forceDelete){
		var ele = $(eleOrCard);
		var myViewParent = ele.closest('#sepiaFW-my-view');
		var isAlreadyHidden = false;
		var duration = 500;
		if (ele.css("display") === "none"){
			duration = 0;
			isAlreadyHidden = true;
		}
		//synchronous before-move events:
		var $cardBodyItems = ele.find(".cardBodyItem");
		if ($cardBodyItems.length) $cardBodyItems.each(function(i, cbi){
			//inform card body items of move event - NOTE: this is not reliable, DOM might be edited before etc.
			if (typeof cbi.sepiaCardOnBeforeMove == "function"){
				cbi.sepiaCardOnBeforeMove();
			}
		});
		//move:
		ele.fadeOut(duration, function(){
			//remove
			if (!isAlreadyHidden){
				//ele.remove();		//removes all event handlers too
				var parentN = eleOrCard.parentNode;
				var parentFlexCard = ele.closest(".sepiaFW-cards-flexSize-container");
				parentN.removeChild(eleOrCard);
				//parent empty now?
				if (!parentN.hasChildNodes() && parentN.className.indexOf('sepiaFW-results-container') < 0){
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
			var elementToAdd;
			if (!ele.hasClass('sepiaFW-cards-flexSize-container')){
				var newCard = buildGenericCard(eleOrCard);
				$(newCard).addClass('oneElement').hide();
				ele.show();
				elementToAdd = newCard;
			}else{
				elementToAdd = eleOrCard;
			}
			SepiaFW.ui.myView.addCard(elementToAdd);
		});
	}
	
	//-----------------------------------------------------------------------------------
	
	//build flex-card container
	Cards.buildCardContainer = function(hasSingleElement, addSpacer){
		var newId = ("sepiaFW-card-id-" + Cards.currentCardId++);
		var cardElement = document.createElement('DIV');
		cardElement.className = "sepiaFW-cards-flexSize-container";
		if (hasSingleElement){
			cardElement.classList.add("oneElement");
		}
		if (addSpacer){
			cardElement.classList.add("addSpacer");
		}
		cardElement.id = newId;
		return cardElement;
	}
	//build generic flex-card with body
	function buildGenericCard(bodyContentElement){
		var cardElement = Cards.buildCardContainer(false, false);
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

	//CUSTOM HTML CARD - NOTE: Currently these are only accessible via ACTIONS (and thus skipped in user chat)
	
	//build flex container with custom HTML RESULTS from actionInfo
	Cards.buildCustomHtmlCardFromAction = function(actionInfoI){
		var cardElement = Cards.buildCardContainer(true);
		var htmlData = actionInfoI.data;
		//console.log('DATA: ' + JSON.stringify(htmlData));
		cardElement.innerHTML = SepiaFW.tools.sanitizeHtml(htmlData); 		//NOTE: this can only have basic HTML (no script, no iframe etc.)
		return cardElement;
	}
	//build flex container with sandboxed custom HTML from actionInfo
	//TODO
	
	//USER DATA LIST

	var INDEX_TYPE_TODO = "todo";
	var INDEX_TYPE_SHOPPING = "shopping";
	var INDEX_TYPE_REMINDERS = "reminders";
	var INDEX_TYPE_APPOINTMENTS = "appointments";
	var INDEX_TYPE_ALARMS = "alarms";			//includes timers
	var INDEX_TYPE_NEWS_FAVORITES = "newsFavorites";
	var INDEX_TYPE_UNKNOWN = "unknown";

	var SECTION_TIME_EVENTS = "timeEvents";
	var SECTION_PRODUCTIVITY = "productivity";

	//Default sort-drag-options
	var udListCheckablesDragOptions = {
		allowCrossContainerDrag: true,
		activateDragAfterLongPress: true,
		autoDisableAfterDrop: true,
	};

	//Make an empty list object for a certain list type
	function makeProductivityListObject(name, indexType, priority){
		var emptyItemData = {
			"eleType": "checkable",
			"itemId": getWeakRandomItemId("item"),
			"name": name,
			"checked": false,
			"priority": ((priority == undefined)? 0 : priority),
			"dateAdded": (new Date().getTime()),
			"lastChange": (new Date().getTime())
		};
		if (indexType === INDEX_TYPE_TODO){
			//To-Do
			emptyItemData.checked = false;
			emptyItemData.state = "open";	//3-step-state
		}else{
			//Shopping
			emptyItemData.checked = false;
		}
		return emptyItemData;
	}
	function getWeakRandomItemId(prefix){
		var itemIdSuffix = new Date().getTime() + "-" + (Math.round(Math.random()*899) + 100);	//100-999
		return (prefix + "-" + itemIdSuffix);
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

	//find userData list
	Cards.findAllUserDataLists = function(filterId){
		var result = [];
		//var $allCards = $(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[class^="sepiaFW-cards-"]');		//more general (untested)
		var $allCards = $(SepiaFW.ui.JQ_RES_VIEW_IDS).find('.sepiaFW-cards-flexSize-container');
		$allCards.filter(function(index){
			var ele = this;
			//var listInfoObj = getUserDataList(listContainer);		//full data
			var dataString = $(ele).attr('data-list'); 				//just basic list info
			if (dataString){
				var eleData = JSON.parse(dataString);
				if (filterId && (!eleData || filterId != eleData._id)){
					return false;
				}
				result.push({
					ele: ele,
					data: getUserDataList(ele),		//full data
					remove: function(){
						$(ele).remove();
					}
				});
			}
			return true;
		});
		return result;
	}
	//build card of this type
	function buildUserDataList(cardElementInfo){
		var cardElement = Cards.buildCardContainer();		//NOTE: the EXACT class ('sepiaFW-cards-flexSize-container') is used to find/edit the lists as well!
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
			name: titleName,
			isEditable: !isTimerAndAlarmsList,
			addDeleteListButton: !isTimerAndAlarmsList,
			addSaveListButton: true,
			addReloadListButton: true
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

		//mark all same lists as out-of-sync - TODO: should we remove or update them instead?
		if (cardElementInfo._id){
			Cards.findAllUserDataLists(cardElementInfo._id).forEach(function(l){
				if (l.data && l.data.lastEdit != cardElementInfo.lastEdit){
					markUserDataListAsOutOfSync(l);
				}
			});
		}
		
		return cardElement;
	}
	//replace userDataList with refreshed one
	function reloadAndReplaceUserDataList(listContainer){
		var listInfoObj = getUserDataList(listContainer);
		//console.error("list INFO", listInfoObj);		//DEBUG
		if (listInfoObj.section && listInfoObj.indexType && listInfoObj._id){
			//load list again
			var listToLoad = {
				"section": listInfoObj.section,
				"indexType": listInfoObj.indexType, 		//see e.g.: INDEX_TYPE_ALARMS
				"_id": listInfoObj._id
			};
			SepiaFW.account.loadList(listToLoad, function(data){
				//check if result is valid
				if (data && data.lists && data.lists.length == 1 && data.lists[0]._id == listInfoObj._id){
					var newCard = buildUserDataList(data.lists[0]);
					listContainer.parentNode.replaceChild(newCard, listContainer);
					SepiaFW.animate.flashObj(newCard);
					SepiaFW.debug.log('Account - successfully refreshed list: ' + listInfoObj.indexType + ", " + listInfoObj._id);
				}else{
					SepiaFW.debug.error("List reload failed because result was NOT valid! If you see this error please post the BUG in the support section.");
					SepiaFW.debug.error("Result:", data);
					SepiaFW.ui.showPopup(SepiaFW.local.g("cant_execute"));
				}
			}, function(msg){
				//error
				SepiaFW.ui.showPopup(msg);
			});
		}
	}
	//mark userDataList as oos
	function markUserDataListAsOutOfSync(l){
		$(l.ele).addClass("sepiaFW-card-out-of-sync").find('.sepiaFW-cards-list-saveBtn')
				.addClass('active').find('i').html('sync_problem'); 	//cloud_off
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
			//TO-DO LIST
			if (elementData.checked){
				listEle.innerHTML = "<div class='itemLeft listLeft checked' oncontextmenu='return false;'></div>";
			}else if (elementData.state && elementData.state == "inProgress"){
				listEle.innerHTML = "<div class='itemLeft listLeft inProgress' oncontextmenu='return false;'></div>";
			}else{
				listEle.innerHTML = "<div class='itemLeft listLeft unchecked' oncontextmenu='return false;'></div>";
			}
		}else if (cardElementInfo.indexType === INDEX_TYPE_SHOPPING){
			//SHOPPING LIST
			if (elementData.checked){
				listEle.innerHTML = "<div class='itemLeft listLeft checked' oncontextmenu='return false;'></div>";
			}else{
				listEle.innerHTML = "<div class='itemLeft listLeft unchecked' oncontextmenu='return false;'></div>";
			}
		}
		listEle.innerHTML += "<div class='itemCenter listCenter' contentEditable='true'>" + SepiaFW.tools.escapeHtml(elementData.name) + "</div>"
		listEle.innerHTML += "<div class='itemRight listRight'><i class='material-icons md-24'>&#xE15B;</i></div>";
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
					//TO-DO
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
				var newName = $(this).text().trim();
				var eleData = JSON.parse($listEle.attr('data-element'));
				if (newName){
					newName = (newName.length > 320)? (newName.substring(0,319) + "...") : newName; 	//brutally shorten name - TODO: improve
					eleData.name = newName;
					$(this).text(eleData.name);
					$listEle.attr('data-element', JSON.stringify(eleData));
					//activate save button
					var $saveBtn = $listBody.parent().find('.sepiaFW-cards-list-saveBtn'); 	//note: we need to load the button here
					$saveBtn.addClass('active');		//saveBtn.css({"opacity": 0.92, "color": saveBtn.parent().css("color")});
				}else{
					$(this).text(eleData.name);
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
		var cardElement = Cards.buildCardContainer(true);
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-radioStations";
		
		var radioStation = document.createElement('DIV');
		radioStation.className = 'radioStation cardBodyItem';
		radioStation.innerHTML = "<div class='itemLeft radioLeft'><i class='material-icons md-24'>&#xE03E;</i></div><div class='itemCenter radioCenter'>" 
								+ SepiaFW.tools.sanitizeHtml(cardElementInfo.name) + "</div><div class='itemRight radioRight'><i class='material-icons md-24'>&#xE037;</i></div>";
		radioStation.setAttribute('data-element', JSON.stringify(cardElementInfo));
		cardBody.appendChild(radioStation);
		
		$(radioStation).find('.radioRight').each(function(){
			var assistColor = SepiaFW.ui.assistantColor || SepiaFW.ui.primaryColor;
			$(this).css({"color" : assistColor });
			var that = this;
			SepiaFW.ui.onclick(that, function(){
			//$(this).on('click', function(){
				SepiaFW.animate.flashObj(radioStation, 500);
				var station = JSON.parse($(that).parent().attr('data-element'));
				var action = {};
				action.audio_url = station.streamURL;
				action.audio_title = station.name;
				SepiaFW.ui.actions.playAudioURL(action, true); 	//true: action from button
			});
		});
		
		makeRadioCardContextMenu(cardElement.id, cardBody, radioStation, cardElementInfo);
		
		cardElement.appendChild(cardBody);
		return cardElement;
	}
	function makeRadioCardContextMenu(flexCardId, cardBody, cardBodyItem, radioElementInfo){
		//some additional data
		var newBodyClass = "sepiaFW-cards-list-body sepiaFW-cards-list-radioStations";			//class in case we need to create new body
		var shareButton = false;
		var copyUrlButton = false;
		var customButtons = [];
		if (radioElementInfo.playlistURL){
			var plu = radioElementInfo.playlistURL;
			customButtons.push({
				buttonName: '<i class="material-icons md-inherit">queue_music</i>&nbsp;Playlist</i>',
				fun: function(){
					SepiaFW.ui.actions.openUrlAutoTarget(plu);
				}
			});
		}
		if (radioElementInfo.streamURL){
			customButtons.push({
				buttonName: SepiaFW.local.g('playOn'),
				fun: function(){
					//play stream on different device
					SepiaFW.client.showConnectedUserClientsAsMenu(SepiaFW.local.g('choose_device_for_music'), 
						function(deviceInfo){
							SepiaFW.client.sendRemoteActionToOwnDevice("media", {
								type: "audio_stream",
								name: radioElementInfo.name,
								streamURL: radioElementInfo.streamURL,
								playlistURL: radioElementInfo.playlistURL
							}, deviceInfo.deviceId);
						}, true
					);
				}
			});
		}
		//context menu
		var contextMenu = makeBodyElementContextMenu(flexCardId, cardBody, cardBodyItem, cardBodyItem.id, {
			toggleButtonSelector: ".radioLeft",
			newBodyClass: newBodyClass,
			shareButton: shareButton,
			copyUrlButton: copyUrlButton,
			customButtons: customButtons
		});
	}
	
	//TIMER AND ALARM
	
	//build time event aka timer or alarm (for now) - this is the single element version from 'action' (see buildUserDataList for array)
	Cards.buildTimeEventElementFromAction = function(actionInfoI, eventType){
		var cardElement = Cards.buildCardContainer(true, true);
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
	Cards.findAllTimeEventCards = function(skipFuture, skipPast){
		var result = [];
		var now = new Date().getTime();
		var $allCards = $(SepiaFW.ui.JQ_RES_VIEW_IDS).find('.timeEvent.cardBodyItem');
		$allCards.filter(function(index){
			var ele = this;
			var dataString = $(ele).attr('data-element');
			if (dataString){
				var eleData = JSON.parse(dataString);
				if (skipFuture && (now - eleData.targetTimeUnix) <= 0){
					return false;
				}
				if (skipPast && (now - eleData.targetTimeUnix) > 0){
					return false;
				}
				result.push({
					ele: ele,
					data: eleData,
					remove: function(){
						removeTimeEventElement(ele, eleData.eventId);
						//linked messages:
						$(SepiaFW.ui.JQ_RES_VIEW_IDS).find('[data-msg-custom-tag="' + eleData.eventId + '"]').each(function(){
							this.remove();
						});
					}
				});
			}
			return true;
		});
		return result;
	}
	//timeEvent elements
	function makeTimerElement(actionInfoI, flexCardId, cardBody, skipAdd){ 	//actionInfoI can also be the data of an list element, should be compatible (in the most important fields)!
		var timeEvent = document.createElement('DIV');
		timeEvent.className = 'timeEvent cardBodyItem';
		timeEvent.innerHTML = "<div class='itemLeft timeEventLeft'><i class='material-icons md-24'>&#xE425;</i></div>"
							+ "<div class='itemCenter timeEventCenter'>"
								+ "<div class='sepiaFW-timer-name' contentEditable='true'>" + SepiaFW.tools.escapeHtml(actionInfoI.name) + "</div>"
								+ "<div class='sepiaFW-timer-indicator'>" + SepiaFW.local.g('loading') + " ..." + "</div>"
							+ "</div>"
							+ "<div class='itemRight timeEventRight'><i class='material-icons md-24'>&#xE15B;</i></div>";
		timeEvent.setAttribute('data-element', JSON.stringify(actionInfoI));
		timeEvent.setAttribute('data-id', actionInfoI.eventId);
		//buttons
		makeTimeEventNameEditable(timeEvent);
		makeTimeEventRemoveButton(timeEvent, cardBody);
		if (!skipAdd){
			cardBody.appendChild(timeEvent);
		}
		makeTimeEventContextMenu(flexCardId, cardBody, timeEvent, actionInfoI, SepiaFW.events.TIMER);
		return timeEvent;
	}
	function makeAlarmElement(actionInfoI, flexCardId, cardBody, skipAdd){		//actionInfoI can also be the data of an list element, should be compatible (in the most important fields)!
		var timeEvent = document.createElement('DIV');
		timeEvent.className = 'timeEvent cardBodyItem';
		timeEvent.innerHTML = "<div class='itemLeft timeEventLeft'><i class='material-icons md-24'>&#xE855;</i></div>"
							+ "<div class='itemCenter timeEventCenter'>"
								+ "<div class='sepiaFW-timer-name' contentEditable='true'>" + SepiaFW.tools.escapeHtml(actionInfoI.name) + "</div>"
								+ "<div class='sepiaFW-timer-indicator'>" + SepiaFW.tools.escapeHtml(actionInfoI.date + " " + actionInfoI.time.replace(/:\d\d$/, " " + SepiaFW.local.g('oclock'))) + "</div>"
							+ "</div>"
							+ "<div class='itemRight timeEventRight'><i class='material-icons md-24'>&#xE15B;</i></div>";
		timeEvent.setAttribute('data-element', JSON.stringify(actionInfoI));
		timeEvent.setAttribute('data-id', actionInfoI.eventId);
		//buttons
		makeTimeEventNameEditable(timeEvent);
		makeTimeEventRemoveButton(timeEvent, cardBody);
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
				var newName = $(this).text().trim();
				if (newName){
					//newName = newName.replace(/-|_|!|\?|,|\.|'/g, " ").trim();			//remove some special chars (?)
					newName = (newName.length > 100)? (newName.substring(0,99) + "..."): newName; 	//brutally shorten name - TODO: improve
					eleData.name = newName.trim();
					$(this).text(eleData.name);
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
				}else{
					$(this).text(eleData.name);
				}
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
				SepiaFW.audio.stopAlarmSound("cardRemove");
				
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
				$(timeEventEle.nextSibling).hide(150, function(){ this.remove(); });
			}
		}
		$(timeEventEle).hide(150, function(){
			this.remove();
			if ($flexCardBody.children().length == 0 && $flexCard.children().length == 1){
				//only empty body left (no title / header)
				$flexCard.remove();
			}else{
				//assume list update so activate save button
				var saveBtn = $flexCard.find('.sepiaFW-cards-list-saveBtn');
				saveBtn.addClass('active');	
				//note: deleted time events are resynchronized automatically after 5s (which should make the button inactive again)
			}
		});
	}
	
	//NEWS
	
	function buildNewsElement(cardElementInfo){
		var cardElement = Cards.buildCardContainer();
		
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
			if (newsHeadline){
				newsHeadline = SepiaFW.tools.sanitizeHtml(newsHeadline)
					.replace(/(<p>|<\/p>|<strong>|<\/strong>|<b>|<\/b>|<em>|<\/em>|<i>|<\/i>|<br>)/gi," ")
					.replace(/<a .*?>|<\/a>/gi, " ")
					.replace(/\s+/g, " ")
					.trim();
				newsHeadline = SepiaFW.tools.sanitizeHtml(newsHeadline);	//we do this again just to make sure the mods did not reintroduce code
			}
			//var newsLink = elementsData[i].link;
			var newsBody = elementsData[i].description;
			if (newsBody){
				newsBody = SepiaFW.tools.sanitizeHtml(newsBody)
					.replace(/(<p>|<\/p>|<strong>|<\/strong>|<b>|<\/b>|<em>|<\/em>|<i>|<\/i>|<br>)/gi," ")
					.replace(/<a .*?>|<\/a>/gi, " ")
					.replace(/<img .*?>/gi, " ")
					.replace(/\s+/g, " ")
					.trim();
				newsBody = SepiaFW.tools.sanitizeHtml(newsBody);
				newsBody = (newsBody.length > 360)? (newsBody.substring(0, 360) + "...") : newsBody;
			}
			//var newsPublished = elementsData[i].pubDate;
			var newsArticle = document.createElement('DIV');
			if (i >= maxShow){
				newsArticle.className = 'newsArticle cardBodyItem itemHidden';
			}else{
				newsArticle.className = 'newsArticle cardBodyItem';
			}
			//newsArticle.setAttribute('data-element', JSON.stringify(elementsData[i]));
			newsArticle.innerHTML = "<div class='newsCenter'><h3 class='newsArticleHeadline'>" + newsHeadline + "</h3><div class='newsArticleBody'>" + newsBody + "</div></div>";
			cardBody.appendChild(newsArticle);

			//article "button"
			/*(function(newsLink, newsArticle){
				SepiaFW.ui.longPressShortPressDoubleTab(newsArticle, function(){
					//long-press - move
					Cards.moveToMyViewOrDelete(newsArticle);
				},'',function(){
					//short-press - open
					SepiaFW.ui.actions.openUrlAutoTarget(newsLink);
				},'', true);
			})(newsLink, newsArticle);*/
			makeNewsCardContextMenu(cardElement.id, cardBody, newsArticle, elementsData[i]);
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
	function makeNewsCardContextMenu(flexCardId, cardBody, cardBodyItem, newsElementInfo){
		//some additional data
		var newBodyClass = "sepiaFW-cards-list-body sepiaFW-cards-list-newsOutlet";
		var newsLink = newsElementInfo.link;
		var shareButton = false;
		var copyUrlButton = {
			buttonName: SepiaFW.local.g('copyUrl'),
			url: newsLink
		}
		var customButtons = [{
			buttonName: SepiaFW.local.g('readNewsArticle'),
			fun: function(){
				SepiaFW.ui.actions.openUrlAutoTarget(newsLink);
			}
		}];
		//context menu
		var contextMenu = makeBodyElementContextMenu(flexCardId, cardBody, cardBodyItem, cardBodyItem.id, {
			toggleButtonSelector: ".newsCenter",
			newBodyClass: newBodyClass,
			shareButton: shareButton,
			copyUrlButton: copyUrlButton,
			customButtons: customButtons
		});
	}
	
	//WEATHER
	
	//-NOW, DAY, TOMORROW and WEEK (actually all types simply use the NOW cards)
	function buildWeatherElementA(cardElementInfo){
		var cardElement = Cards.buildCardContainer(true, true);
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-weatherA";
		var visibleItems = 0;
		var data = cardElementInfo.data;
		//small preview
		var weatherNowTmoSmall = document.createElement('DIV');
		weatherNowTmoSmall.className = 'weatherNowSmall';
		//console.log(JSON.stringify(data));
		weatherNowTmoSmall.innerHTML = SepiaFW.tools.sanitizeHtml("<div class='itemLeft weatherNowSmallImage'><img src='img/weather/" + data.icon + ".png' alt='icon'></div>"
									+ "<div class='itemCenter weatherNowSmallIntro'><b>" + ((data.dateTag)? data.dateTag : data.date) + ":</b><p>" + data.desc + "</p></div>"
									+ "<div class='itemRight weatherNowSmallData'>" + makeWeatherNowTmoSmallData(data) + "</div>"); 		//NOTE: this is inside one big SANITIZER
		//weatherNowTmoSmall.setAttribute('data-element', JSON.stringify(cardElementInfo));
		cardBody.appendChild(weatherNowTmoSmall);

		cardElement.appendChild(cardBody);

		//context menu
		makeWeatherCardContextMenu(cardElement.id, cardBody, cardElement, cardElementInfo);

		//details part
		var weatherNowTmoDetails = document.createElement('DIV');
		weatherNowTmoDetails.className = 'weatherNowDetails itemHidden cardBodyItem';
		weatherNowTmoDetails.innerHTML = makeWeatherNowTmoDetailsData(cardElementInfo.details, data.units);
		cardBody.appendChild(weatherNowTmoDetails);
		
		//footer
		var footerConfig = {
			"type" : "showHideButton",
			"cardBody" : cardBody,
			"visibleItems" : visibleItems
		};
		var cardFooter = makeFooter(footerConfig);
		//cardBody.style.paddingBottom = '0px';
		cardElement.appendChild(cardFooter);
				
		return cardElement;
	}
	function makeWeatherCardContextMenu(flexCardId, cardBody, cardBodyItem, weatherElementInfo){
		//some additional data
		var newBodyClass = "sepiaFW-cards-list-body sepiaFW-cards-list-weatherA";			//class in case we need to create new body
		var shareButton = false;
		var copyUrlButton = false;
		//context menu
		var contextMenu = makeBodyElementContextMenu(flexCardId, cardBody, cardBodyItem, cardBodyItem.id, {
			toggleButtonSelector: ".weatherNowSmallImage",
			newBodyClass: newBodyClass,
			shareButton: shareButton,
			copyUrlButton: copyUrlButton
		});
	}
	function makeWeatherNowTmoSmallData(data){
		var unitReduced = data.units.replace(/C|celsius|F|fahrenheit/, "");
		var dataHTML = "";
		if (data.tempB == undefined && data.tempC == undefined){
			if (data.tempA) dataHTML += "<div style='width:100%'><h3>" + data.tempA + data.units + "</h3><p>" + data.tagA + "</p></div>";
		}else{
			if (data.tempA) dataHTML += "<div><h3>" + data.tempA + unitReduced + "</h3><p>" + data.tagA + "</p></div>";
			if (data.tempB) dataHTML += "<div><h3>" + data.tempB + unitReduced + "</h3><p>" + data.tagB + "</p></div>";
			if (data.tempC) dataHTML += "<div><h3>" + data.tempC + unitReduced + "</h3><p>" + data.tagC + "</p></div>";
		}
		return dataHTML;
	}
	function makeWeatherNowTmoDetailsData(details, unit){
		unit = unit.replace(/C|celsius|F|fahrenheit/, "");
		var data = details.daily || details.hourly || details.partsOfDay;
		var isHourly = false;
		if (details.hourly){
			isHourly = true;
		}
		var detailsHTML = "<ul>";
		for (i=0; i<data.length; i++){
			//console.error(JSON.stringify(data[i]));
			var isPrecipAmmount = (data[i].precipRelative != undefined)? true : false;
			var precipValue = Math.round((data[i].precipRelative || data[i].precipProb || 0.0) * 100);	//NOTE: -100 means NO DATA
			var precipType = data[i].precipType;
			var precipSymbol = "";
			var precipIcon = data[i].icon;
			if (!precipType && precipIcon){
				if (precipIcon.indexOf("rain") >= 0) precipType = "rain";
				else if (precipIcon.indexOf("snow") >= 0) precipType = "snow";
				else if (precipIcon.indexOf("sleet") >= 0) precipType = "sleet";
			}
			var temp = (isHourly)? (data[i].tempA + unit) : (data[i].tempA  + unit + " - " + data[i].tempB + unit);
			var warning = data[i].warning;
			if (precipType && (isPrecipAmmount || precipValue > 2)){
				if (precipType === "snow"){
					precipSymbol = "<img src='img/weather/snowflakes.svg' onload='SVGInject(this)' alt='snow' class='precipSymbol'>";
				}else{
					precipSymbol = "<img src='img/weather/rain-drops.svg' onload='SVGInject(this)' alt='rain' class='precipSymbol'>";
				}
			}else{
				if (precipIcon){
					if (precipIcon.indexOf("fair") >= 0 || precipIcon.indexOf("clear") >= 0){
						if (precipIcon.indexOf("night") >= 0){
							precipSymbol = "<img src='img/weather/clear-night.svg' onload='SVGInject(this)' alt='clear' class='precipSymbol'>";
						}else{
							precipSymbol = "<img src='img/weather/clear-day.svg' onload='SVGInject(this)' alt='clear' class='precipSymbol'>";
						}
					}else if (precipIcon.indexOf("partly-cloudy") >= 0){
						if (precipIcon.indexOf("night") >= 0){
							precipSymbol = "<img src='img/weather/partly-cloudy-night.svg' onload='SVGInject(this)' alt='cloudy' class='precipSymbol'>";
						}else{
							precipSymbol = "<img src='img/weather/partly-cloudy-day.svg' onload='SVGInject(this)' alt='cloudy' class='precipSymbol'>";
						}
					}else{
						precipSymbol = "<img src='img/weather/default.svg' onload='SVGInject(this)' alt='default' class='precipSymbol'>";	
					}
				}else{
					precipSymbol = "<img src='img/weather/default.svg' onload='SVGInject(this)' alt='default' class='precipSymbol'>";
				}
			}
			if (warning){
				if (warning.indexOf("wind") >= 0){
					precipSymbol += "<img src='img/weather/wind.svg' onload='SVGInject(this)' alt='wind' class='precipSymbol'>";
				}
				if (warning.indexOf("fog") >= 0){
					precipSymbol += "<img src='img/weather/fog.svg' onload='SVGInject(this)' alt='fog' class='precipSymbol'>";
				}
			}
			var precipInfo;
			if ((isPrecipAmmount && precipValue > 0) || precipValue > 2){
				precipInfo = precipSymbol + "<span title='relative amount of precipitation compared to very heavy rain/snow (similar to QPF)'>" 
					+ SepiaFW.tools.sanitizeHtml(precipValue) + (isPrecipAmmount? " rp" : "%") + "</span>";
			}else{
				precipInfo = precipSymbol;
			}
			detailsHTML += "<li>"
							+ "<div>" + SepiaFW.tools.sanitizeHtml(data[i].tag) + "</div>"
							+ "<div>" + SepiaFW.tools.sanitizeHtml(temp) + "</div>"
							+ "<div>" + precipInfo + "</div>"
						+ "</li>";
		}
		detailsHTML += "</ul>";
		return detailsHTML;
	}
	
	//LINK

	var currentLinkItemId = 0;
	
	function buildLinkElement(cardElementInfo, isSafeSource){
		var cardElement = Cards.buildCardContainer(true, true);
		var cardBody = document.createElement('DIV');
		cardBody.className = "sepiaFW-cards-list-body sepiaFW-cards-list-link";
		
		var data = cardElementInfo.data;
		var linkUrl = cardElementInfo.url || "";
		var linkLogo = cardElementInfo.image;
		var linkLogoBack = cardElementInfo.imageBackground || '';
		var linkCardEle = document.createElement('DIV');
		var typeInfo = {};
		linkCardEle.className = 'linkCard cardBodyItem';
		linkCardEle.id = 'link-' + currentLinkItemId++;		//links have no database event ID (compare: time-events) so we just create one here to connect item and context-menu

		//check link sanity
		if (linkUrl){
			var hasValidUrlProtocol = SepiaFW.tools.urlHasValidProtocol(linkUrl);
			var isValidLocalHtmlPage = SepiaFW.tools.isRelativeFileUrl(linkUrl, "html");
			var isUrlOk = hasValidUrlProtocol || isValidLocalHtmlPage;
			if (!isUrlOk){
				//is this enough? - For now its ok ^^
				SepiaFW.ui.showInfo("URL has been removed from link card because it looked suspicious", true);
				SepiaFW.debug.error("Link-Card - Tried to create card with suspicious URL: " + linkUrl);
				linkUrl = "";
			}
		}
		//check for popular links, e.g. YouTube ...
		if (linkUrl && (!data.type || !data.typeData)){
			var embedData = Cards.canEmbedUrl(linkUrl);
			if (!!embedData){
				//set or overwrite data:
				data.type = embedData.type;
				data.typeData = embedData.typeData;
			}
		}

		var leftElement;
		if (data.type){
			linkCardEle.className += (" " + data.type);
			if (data.type == "websearch"){
				//websearch icon
				leftElement = "<div class='itemLeft linkCardLogo'>" + "<i class='material-icons md-mnu'>search</i>" + "</div>";
			}else if (data.type == "locationDefault"){
				//default map icon
				leftElement = "<div class='itemLeft linkCardLogo'>" + "<i class='material-icons md-mnu'>room</i>" + "</div>";
			}else if (data.type == "default"){
				//default link icon
				leftElement = "<div class='itemLeft linkCardLogo'>" + "<i class='material-icons md-mnu'>link</i>" + "</div>";	//language
			}else if (data.type == "musicSearch" || data.type == "videoSearch"){
				//default music icon
				if (!linkLogo){
					leftElement = "<div class='itemLeft linkCardLogo'>" + "<i class='material-icons md-mnu'>music_video</i>" + "</div>";
				}else if (data.brand && data.brand != "default"){
					//we could check the brand here: data.brand, e.g. Spotify, YouTube, ...
					linkCardEle.className += (" " + data.brand);
				}
			}
		}else if (!linkLogo){
			//default link icon
			leftElement = "<div class='itemLeft linkCardLogo'>" + "<i class='material-icons md-mnu'>link</i>" + "</div>";	//language
		}
		if (!leftElement){
			//default if nothing was set before
			leftElement = SepiaFW.tools.sanitizeHtml("<div class='itemLeft linkCardLogo' " 
				+ ((linkLogoBack)? ("style='background:" + linkLogoBack + ";'") : ("")) + "><img src='" + linkLogo + "' alt='logo'></div>");
		}
		var description = data.desc;
		if (description && description.length > 120) description = description.substring(0, 119) + "...";
		var cardTitle = data.title;
		if (cardTitle && cardTitle.length > 120) cardTitle = cardTitle.substring(0, 119) + "...";
				
		//build actual card element
		var rightElement = "<div class='itemRight linkCardRight'><a href='' target='_blank' rel='noopener'><i class='material-icons md-mnu'>&#xE895;</i></a></div>";
		linkCardEle.innerHTML = leftElement
				+ SepiaFW.tools.sanitizeHtml("<div class='itemCenter linkCardCenter'>" 
					+ (cardTitle? ("<h3>" + cardTitle + "</h3>") : ("")) + (description? ("<p>" + description + "</p></div>") : ""))
				+ rightElement;
		linkCardEle.title = linkUrl || data.title || "";
		//linkCardEle.setAttribute('data-element', JSON.stringify(cardElementInfo));
		if (linkUrl){
			$(linkCardEle).find(".linkCardRight").find("a").attr("href", linkUrl);
		}else{
			//TODO: replace linkUrl with something useful
		}
		cardBody.appendChild(linkCardEle);

		//Experimenting with web players - note: use data.embedded ?
		var embedWebPlayer = data.type && (data.type == "musicSearch" || data.type == "videoSearch") 
			&& data.typeData && Cards.canEmbedWebPlayer(data.typeData.service);
		if (embedWebPlayer){
			//Embedded player
			if (data.autoplay){
				//stop all previous audio ... we will try it later anyway
				SepiaFW.client.controls.media({
					action: "stop",
					skipFollowUp: true
				});
			}
			var mediaType = (data.type == "videoSearch")? "video" : "music";		//add more later?
			typeInfo.mediaPlayer = addEmbeddedPlayerToCard(cardBody, mediaType, data.typeData, isSafeSource, {
				brand: data.brand,
				autoplay: data.autoplay,
				onTitleChange: function(newTitle){
					data.title = newTitle;
					if (newTitle && newTitle.length > 120) newTitle = newTitle.substring(0, 119) + "...";
					$(cardBody).find(".linkCardCenter h3").first().text(newTitle);
				},
				onUrlChange: function(newUrl){
					linkCardEle.title = newUrl;
					cardElementInfo.url = newUrl;	//keep up-to-date for URL share
				}
			});
		}
		
		//link button(s)
		(function(linkUrl){
			SepiaFW.ui.onclick($(linkCardEle).find('.linkCardCenter')[0], function(){
				if (linkUrl){
					SepiaFW.ui.actions.openUrlAutoTarget(linkUrl);
				}
			});
			SepiaFW.ui.onclick($(linkCardEle).find('.linkCardRight')[0], function(event){
				event.preventDefault();
				if (embedWebPlayer && typeInfo.mediaPlayer){
					typeInfo.mediaPlayer.openInExternalPage(linkUrl);
				}else if (linkUrl){
					SepiaFW.ui.actions.openUrlAutoTarget(linkUrl, true);
				}else{
					SepiaFW.ui.showPopup(SepiaFW.local.g("cant_execute") + " (Missing URL)");
					//TODO: do something useful ... maybe "play-on" function? or share link?
				}
			});
		})(linkUrl);

		//make sure cardElementInfo is up-to-date
		cardElementInfo.url = linkUrl;
		
		//context menu with extra buttons
		makeLinkCardContextMenu(cardElement.id, cardBody, linkCardEle, cardElementInfo, data.type, typeInfo);
		
		cardElement.appendChild(cardBody);
		return cardElement;
	}
	function makeLinkCardContextMenu(flexCardId, cardBody, cardBodyItem, linkElementInfo, linkElementType, typeInfo){
		//some additional data
		var newBodyClass = "sepiaFW-cards-list-body sepiaFW-cards-list-link";			//class in case we need to create new body
		var shareButton = {
			type: SepiaFW.client.SHARE_TYPE_LINK,
			//data: linkElementInfo,	//we use 'getData' instead to account for data changes
			getData: function(){
				//we limit the amount of data shared ...
				var d = linkElementInfo.data || {};
				return {	//use 'exportEmbeddedPlayerDataForRemoteAction' instead?
					url: linkElementInfo.url,
					image: linkElementInfo.image,
					imageBackground: linkElementInfo.imageBackground,
					data: {
						title: d.title,
						desc: d.desc
						//TODO: this might break some link cards that require entire data (e.g.: data.typeData)
					}
				}
			},
			buttonName: SepiaFW.local.g('exportToUrl'),
			buttonTitle: "Copy SEPIA share link to clipboard."	//TODO: add local translation
		}
		var copyUrlButton;
		if (linkElementInfo.url){
			copyUrlButton = {
				buttonName: SepiaFW.local.g('copyUrl'),
				getUrl: function(){ return linkElementInfo.url; }
				//url: linkElementInfo.url		//we use 'getUrl' instead to account for URL changes
			}
		}
		//custom buttons
		var customButtons;
		var customButtonSections;
		if (linkElementType == "musicSearch" || linkElementType == "videoSearch"){
			//play-on feature and player-close
			customButtons = [{
				buttonName: SepiaFW.local.g('playOn'),
				fun: function(){
					//play stream on different device
					SepiaFW.client.showConnectedUserClientsAsMenu(SepiaFW.local.g('choose_device_for_music'), 
						function(deviceInfo){
							SepiaFW.client.sendRemoteActionToOwnDevice("media", {
								type: "embedded_player",
								playerData: exportEmbeddedPlayerDataForRemoteAction(linkElementInfo)
							}, deviceInfo.deviceId);
						}, true
					);
				}
			},{
				buttonName: SepiaFW.local.g('closeCard'),
				fun: function(thisBtn, parentEle){
					$(cardBody).find(".embeddedWebPlayer").each(function(i, ele){
						if (typeof ele.sepiaCardClose == "function") ele.sepiaCardClose();
					});
					$(parentEle).find(".cards-ctx-mp-controls").fadeOut(300);
					$(thisBtn).fadeOut(300);
				}
			}];
			//custom button section for media-control buttons
			if (typeInfo.mediaPlayer){
				customButtonSections = [{className: "cards-ctx-mp-controls", buttons: []}];
				customButtonSections[0].buttons.push({
					buttonName: '<i class="material-icons md-inherit">skip_previous</i>',
					fun: function(){ typeInfo.mediaPlayer.previous(); }
				});
				customButtonSections[0].buttons.push({
					buttonName: '<i class="material-icons md-inherit">play_arrow</i>',
					fun: function(){
						SepiaFW.client.controls.media({
							action: "stop",
							skipFollowUp: true
						});
						setTimeout(function(){
							typeInfo.mediaPlayer.play();
						}, 500);
					}
				});
				customButtonSections[0].buttons.push({
					buttonName: '<i class="material-icons md-inherit">skip_next</i>',
					fun: function(){ typeInfo.mediaPlayer.next(); }
				});
				customButtonSections[0].buttons.push({
					buttonName: '<i class="material-icons md-inherit">pause</i>',
					fun: function(){ typeInfo.mediaPlayer.pause(); }
				});
			}
		}
		//context menu
		var ctxConfig = {
			toggleButtonSelector: ".linkCardLogo",
			newBodyClass: newBodyClass,
			shareButton: shareButton,
			customButtons: customButtons
		}
		if (copyUrlButton) ctxConfig.copyUrlButton = copyUrlButton;
		if (customButtonSections) ctxConfig.customButtonSections = customButtonSections;
		var contextMenu = makeBodyElementContextMenu(flexCardId, cardBody, cardBodyItem, cardBodyItem.id, ctxConfig);
	}
	
	//----------------------------- common elements ---------------------------------
				
	//Card header
	function makeHeader(headerConfig, cardElement){
		var titleName = SepiaFW.tools.sanitizeHtml(headerConfig.name);
		var titleBackground = headerConfig.background || '';
		var titleTextColor = headerConfig.textColor || '';
		var titleCssClass = headerConfig.cssClass || '';
		var titleIsEditable = headerConfig.isEditable || false;
		var addDeleteListButton = headerConfig.addDeleteListButton || false;
		var addSaveListButton = headerConfig.addSaveListButton || false;
		var addReloadListButton = headerConfig.addReloadListButton || false;
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
				var newTitle = $(this).text();
				newTitle = newTitle.replace(/<br>|<div>|<\/div>/g, "").trim(); 		//happens when the user presses enter(?)
				newTitle = newTitle.replace(/!|\?|,|\.|'/g, " ").trim();			//remove some special chars
				newTitle = (newTitle.length > 25)? newTitle.substring(0,24) : newTitle; //brutally shorten title - TODO: improve
				eleData.title = newTitle;
				$(this).text(newTitle);
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
		moveToMyViewBtn.innerHTML = SepiaFW.local.g('moveToMyViewWithIcon');
		moveToMyViewBtn.title = SepiaFW.local.g('moveToMyView');
		SepiaFW.ui.onclick(moveToMyViewBtn, function(){
			var flexBox = $(moveToMyViewBtn).closest('.sepiaFW-cards-flexSize-container');
			Cards.moveToMyViewOrDelete(flexBox[0]);
			$(contextMenu).hide();
			$('#sepiaFW-main-window').trigger(('sepiaFwClose-' + contextMenu.id));
			$(moveToMyViewBtn).remove();
			//TODO: add before-move events for cardBodyItems?
		}, true);
		cmList.appendChild(moveToMyViewBtn);

		//reload list
		if (addReloadListButton){
			var addItemBtn = document.createElement('LI');
			addItemBtn.className = "sepiaFW-cards-list-reloadBtn";
			addItemBtn.innerHTML = '<i class="material-icons md-inherit">refresh</i>';
			addItemBtn.title = SepiaFW.local.g('reload');
			SepiaFW.ui.onclick(addItemBtn, function(){
				var listContainer = $(addItemBtn).closest('.sepiaFW-cards-flexSize-container').get(0);
				reloadAndReplaceUserDataList(listContainer);
			}, true);
			cmList.appendChild(addItemBtn);
		}

		//add default list item
		if (addAddDefaultListItemButton){
			var addItemBtn = document.createElement('LI');
			addItemBtn.className = "sepiaFW-cards-list-addBtn";
			addItemBtn.innerHTML = '<i class="material-icons md-inherit">add_circle_outline</i>'; //SepiaFW.local.g('addItem');
			addItemBtn.title = SepiaFW.local.g('addItem');
			SepiaFW.ui.onclick(addItemBtn, function(){
				var listContainer = $(addItemBtn).closest('.sepiaFW-cards-flexSize-container').get(0);
				var listInfoObj = getUserDataList(listContainer);
				var emptyItemData = makeProductivityListObject('', listInfoObj.indexType); 		//TODO: add priority?
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
		cmHideBtn.innerHTML = SepiaFW.local.g('hideItemWithIcon');
		cmHideBtn.title = SepiaFW.local.g('hideItem');
		SepiaFW.ui.onclick(cmHideBtn, function(){
			var $cardsContainer = $(cmHideBtn).closest('.sepiaFW-cards-flexSize-container');
			//TODO: add before-remove events for cardBodyItems?
			//fade and remove
			$cardsContainer.fadeOut(300, function(){
				$(this).remove();
			});
		}, true);
		cmList.appendChild(cmHideBtn);

		//delete list
		if (addDeleteListButton){
			var cmDelBtn = document.createElement('LI');
			cmDelBtn.className = "sepiaFW-cards-list-contextMenu-delBtn";
			cmDelBtn.innerHTML = '<i class="material-icons md-inherit">delete</i>'; //SepiaFW.local.g('deleteItem');
			cmDelBtn.title = SepiaFW.local.g('deleteItem');
			SepiaFW.ui.onclick(cmDelBtn, function(){
				var parentCard = $(cmDelBtn).closest('.sepiaFW-cards-flexSize-container');														
				var listInfo = JSON.parse(parentCard.attr('data-list'));
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
			saveBtn.innerHTML = "<i class='material-icons md-mnu'>cloud_upload</i>";
			var storeFun = function(listInfoObj){
				//TODO: check list timestamp?
				SepiaFW.account.saveList(listInfoObj, function(data){
					SepiaFW.debug.log('Account - successfully stored list: ' + listInfoObj.indexType + ", " + listInfoObj.title);
					//deactivate save button
					$(saveBtn).removeClass('active').find('i').html('cloud_upload');
					$(cardElement).removeClass("sepiaFW-card-out-of-sync");
					//mark all same lists as out-of-sync - TODO: should we remove or update them instead?
					if (listInfoObj._id){
						Cards.findAllUserDataLists(listInfoObj._id).forEach(function(l){
							if (l.ele != cardElement){
								markUserDataListAsOutOfSync(l);
							}
						});
					}
				}, function(msg){
					//error
					SepiaFW.ui.showPopup(msg);
				});
			}
			SepiaFW.ui.onclick(saveBtn, function(){
				var listContainer = $(saveBtn).closest('.sepiaFW-cards-flexSize-container').get(0);
				var listInfoObj = getUserDataList(listContainer);
				//different user
				if (SepiaFW.account && (SepiaFW.account.getUserId() !== listInfoObj.user)){
					//check type of list
					if (listInfoObj.section == "productivity"){
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
						//e.g. "timeEvents"
						SepiaFW.ui.showPopup(SepiaFW.local.g('cantCopyList'));
					}
				//same user
				}else{
					if (listContainer.className.indexOf("out-of-sync") >= 0){
						//ask because list may be out of sync
						SepiaFW.ui.build.askConfirm(SepiaFW.local.g('listOutOfSync'), function(){
							//overwrite
							storeFun(listInfoObj);
						}, function(){
							//abort
						});
						SepiaFW.ui.askForConfirmation(SepiaFW.local.g('listOutOfSync'), function(){
							//overwrite
							storeFun(listInfoObj);
						}, function(){
							//abort
						}, function(){
							//alternative: reload
							setTimeout(function(){
								reloadAndReplaceUserDataList(listContainer);
							}, 1000);
						}, SepiaFW.local.g('reload'));
					}else{
						//all good
						storeFun(listInfoObj);
					}
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
			moveToMyViewBtn.innerHTML = SepiaFW.local.g('moveToMyViewWithIcon');
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
						Cards.moveToMyViewOrDelete(cardBody);	//NOTE: before-move event might need to be called before this!
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

		//custom button sections (rows) - NOTE: CAREFUL! this should not be generated dynamically by user content because it can call any JS code
		if (menuConfig.customButtonSections){
			//create custom section
			menuConfig.customButtonSections.forEach(function(customSectionData){
				var customSection = document.createElement('div');
				customSection.className = "sepiaFW-cards-contextMenu-section";
				if (customSectionData.className) customSection.className += " " + customSectionData.className;
				if (customSectionData.buttons) makeContextMenuCustomButtons(customSectionData.buttons, customSection);
				cmList.appendChild(customSection);
			});
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
				androidIntentBtn.innerHTML = SepiaFW.tools.sanitizeHtml(intent.buttonName) || 'Android';
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
			shareBtn.innerHTML = SepiaFW.tools.sanitizeHtml(menuConfig.shareButton.buttonName);
			SepiaFW.ui.onclick(shareBtn, function(){
				//copy link
				//$(contextMenu).fadeOut(500);
				var shareData = {
					type: menuConfig.shareButton.type,
					data: (typeof menuConfig.shareButton.getData == "function")? menuConfig.shareButton.getData() : menuConfig.shareButton.data
				}
				//console.error("SHARE DATA", shareData);		//DEBUG
				SepiaFW.ui.showPopup("Click OK to copy link to clipboard", {
					inputLabelOne: "Link",
					inputOneValue: SepiaFW.client.buildDeepLinkForSharePath(shareData),
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
			copyUrlBtn.innerHTML = SepiaFW.tools.sanitizeHtml(menuConfig.copyUrlButton.buttonName);
			SepiaFW.ui.onclick(copyUrlBtn, function(){
				//copy link
				SepiaFW.ui.showPopup("Click OK to copy link to clipboard", {
					inputLabelOne: "Link",
					//inputOneValue: menuConfig.copyUrlButton.url,
					inputOneValue: ((typeof menuConfig.copyUrlButton.getUrl == "function")? menuConfig.copyUrlButton.getUrl() : menuConfig.copyUrlButton.url),
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

		//Single custom buttons (array) - NOTE: CAREFUL! this should not be generated dynamically by user content because it can call any JS code
		if (menuConfig.customButtons){
			makeContextMenuCustomButtons(menuConfig.customButtons, cmList);
		}

		//hide
		if (menuConfig.hideButton == undefined || menuConfig.hideButton == true){
			var cmHideBtn = document.createElement('LI');
			cmHideBtn.className = "sepiaFW-cards-button sepiaFW-cards-list-contextMenu-hideBtn";
			cmHideBtn.innerHTML = SepiaFW.local.g('hideItemWithIcon');
			cmHideBtn.title = SepiaFW.local.g('hideItem');
			SepiaFW.ui.onclick(cmHideBtn, function(){
				var flexCard = $(cmHideBtn).closest(".sepiaFW-cards-flexSize-container");
				var title = flexCard.find('.sepiaFW-cards-list-title');
				//synchronous before-move events:
				var $cardBodyItems = flexCard.find(".cardBodyItem");
				if ($cardBodyItems.length) $cardBodyItems.each(function(i, cbi){
					//inform card body items of remove event - NOTE: this is not reliable (DOM can change in many ways) but at least we catch some events
					if (typeof cbi.sepiaCardOnBeforeRemove == "function"){
						cbi.sepiaCardOnBeforeRemove();
					}
				});
				//remove:
				if (title.length > 0){
					//hide save button (just to be sure the user does not save an incomplete list)
					title.find(".sepiaFW-cards-list-saveBtn").animate({ opacity: 0.0 }, 500, function(){
						$(this).css({opacity: 0.5, visibility: "hidden"});
					});
					$(contextMenu).fadeOut(480);
					$(cardBodyItem).fadeOut(500, function(){
						if (flexCard.find('.cardBodyItem').filter(":visible").length == 0){
							flexCard.remove();
						}else{
							$(contextMenu).remove();
							$(cardBodyItem).remove();
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
	//custom buttons
	function makeContextMenuCustomButtons(customButtons, parentEle){
		customButtons.forEach(function(customButtonData){
			var btn = document.createElement('LI');
			btn.className = "sepiaFW-cards-button sepiaFW-cards-list-contextMenu-customBtn";
			btn.innerHTML = SepiaFW.tools.sanitizeHtml(customButtonData.buttonName || customButtonData.name);
			SepiaFW.ui.onclick(btn, function(){
				if (customButtonData.fun) customButtonData.fun(btn, parentEle);	//TODO: make sure this never falls into user hands!
			}, true);
			parentEle.appendChild(btn);
		});
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

	//------ TODO: Cards to be integrated into interface:

	//-- Embedded Media Player --

	//Default link-card based media-player widget
	Cards.addEmbeddedPlayer = function(targetView, playerData, isSafeSource){
		if (!playerData) playerData = {};
		var data = playerData.data || {};
		var typeData = data.typeData || {};
		//TODO: add player instance settings?
		var cardInfo = [
			SepiaFW.offline.getLinkCard(playerData.url, undefined, undefined,
				playerData.image, playerData.imageBackground, {})
		];
		cardInfo[0].info[0].url = playerData.url;
		cardInfo[0].info[0].data = {
			"title": data.title || "Media Player",
			"desc": data.desc,
			"type": data.type || "musicSearch",
			"autoplay": data.autoplay,
			"typeData": {
				"song": typeData.song || "",
				"playlist": typeData.playlist || "",
				"artist": typeData.artist || "",
				"album": typeData.album || "",
				"genre": typeData.genre || "",
				"uri": typeData.uri || playerData.url || "",
				"service": typeData.service || "embedded",
				"serviceResult": typeData.serviceResult || {}  //specific to service
			},
			"brand": data.brand || ""
		}
		var cardElement = buildLinkElement(cardInfo[0].info[0], isSafeSource);
		addCardElementToTargetView(targetView, cardElement);
	}
	function exportEmbeddedPlayerDataForRemoteAction(linkElementInfo){
		var d = linkElementInfo.data || {};
		//TODO: add player instance settings?
		return {
			url: linkElementInfo.url,
			image: linkElementInfo.image,
			imageBackground: linkElementInfo.imageBackground,
			data: d
		}
	}
	//Basic media-player card (for testing)
	Cards.addCustomEmbeddedPlayer = function(targetView, widgetUrl){
		var cardBody = addContainerToTargetView(targetView, "sepiaFW-embedded-player-container", "sepia-embedded-player-card");
		var player = new SepiaFW.ui.cards.embed.MediaPlayer({
			parentElement: cardBody,
			widgetUrl: widgetUrl
		});
		var cardEle = document.createElement('div');
		cardEle.className = 'cardBodyItem fullWidthItem';
		var buttons = [
			{ icon: "skip_previous", fun: player.previous },
			{ icon: "play_arrow", fun: player.play },
			{ icon: "pause", fun: player.pause },
			{ icon: "skip_next", fun: player.next }
		];
		buttons.forEach(function(b){
			var btn = document.createElement('div');
			btn.className = "cardItemBlock";
			btn.innerHTML = "<i class='material-icons md-mnu'>" + b.icon + "</i>";
			$(btn).on("click", b.fun);
			cardEle.appendChild(btn);
		});
		cardBody.appendChild(cardEle);
	}
	//Add full media-player features to card
	function addEmbeddedPlayerToCard(cardBody, type, data, isSafeSource, options){
		if (!options) options = {};
		//type: music, video
		var widget = data.service? data.service.replace(/_(link|embedded)$/, "") : "default";
		var player = new SepiaFW.ui.cards.embed.MediaPlayer({
			parentElement: cardBody,
			widget: widget,
			brand: options.brand,
			onready: function(){
				function request(){
					if (data && typeof data == "object" && Object.keys(data).length){
						var mediaRequest = data;
						var mediaType = type;
						var autoplay = (options.autoplay && isSafeSource);
						var safeRequest = isSafeSource; 	//came from assistant or private channel?)
						player.mediaRequest(mediaType, mediaRequest, autoplay, safeRequest);
					}
				};
				if (SepiaFW.animate.assistant.getState() != "idle"){
					SepiaFW.ui.actions.delayFunctionUntilIdle(function(){
						request();
					}, "any", 	//idleState req.
					8000, "Failed to start media player (timeout).");
				}else{
					request();
				}
			},
			onTitleChange: options.onTitleChange,
			onUrlChange: options.onUrlChange
		});
		return player;
	}

	//-- Plot cards --

	Cards.addLinePlotToView = function(x, data, plotOptions, targetView){
		if (!targetView) targetView = "chat";
		SepiaFW.ui.plot.lines(x, data, targetView, plotOptions);
	}

	//-- Audio file cards --
	
	Cards.addWaveCardToView = function(wavAudio, targetView){
		var cardBody = addContainerToTargetView(targetView, "sepiaFW-audio-container", "sepia-audio-card");
		var audioEle = document.createElement("audio");
		audioEle.src = window.URL.createObjectURL((wavAudio.constructor.name == "Blob")? wavAudio : (new Blob([wavAudio], { type: "audio/wav" })));
		audioEle.setAttribute("controls", "controls");
		var audioBox = document.createElement("div");
		audioBox.appendChild(audioEle);
		cardBody.appendChild(audioBox);
	}
	
	//create container directly inside "chat", "myView" or "bigResults":

	function addContainerToTargetView(targetView, containerClass, cardClass){
		if (!targetView) targetView = "chat";
		//inner container
		var container = document.createElement("div");
		container.className = "sepiaFW-cards-list-body " + containerClass;
		//outer card
		var cardElement = Cards.buildCardContainer(true, true);
		cardElement.classList.add(cardClass);
		cardElement.appendChild(container);
		//add
		addCardElementToTargetView(targetView, cardElement);
		return container;
	}
	function addCardElementToTargetView(targetView, cardElement){
		var resultView = SepiaFW.ui.getResultViewByName(targetView);
		SepiaFW.ui.addDataToResultView(resultView, cardElement);
		return resultView;
	}
	
	return Cards;
}
