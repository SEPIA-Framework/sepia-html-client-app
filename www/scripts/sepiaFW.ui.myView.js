//ACTIONS
function sepiaFW_build_ui_my_view(){
	var MyView = {};
	
	var useSections = true;

	var latestAddedElement;
	var isFirstCardAdd = true;

	//TODO: move 'UI.updateMyView' here ... but it has a number of dependencies in UI

	//scroll to the latest added element or to the top
	MyView.scrollToLatest = function(){
		if (latestAddedElement){
			SepiaFW.ui.scrollToElement(latestAddedElement, "#sepiaFW-my-view");
		}else{
			SepiaFW.ui.scrollToTop("sepiaFW-my-view");
		}
	}

	function findOrCreateMyViewSection(sectionClass){
		var $res = $('#sepiaFW-my-view').find(".sepiaFW-my-view-section." + sectionClass);
		if ($res.length > 0){
			return $res[0];
		}else{
			var sectionBox = document.createElement("div");
			sectionBox.className = "sepiaFW-my-view-section " + sectionClass;
			return sectionBox;
		}
	}

	//select proper container then add element and optionally animate and scroll
	MyView.addElement = function(elementToAdd, animateAppear, showPane, scrollToElement){
		if (animateAppear){
			elementToAdd.style.display = "none";
		}
		//put it in a box?
		if (useSections && elementToAdd.className.indexOf("sepiaFW-cards-flexSize-container") >= 0){
			console.error("elementToAdd", elementToAdd.firstChild.className);		//DEBUG
			//improvised sections - TODO: add sections data (server-client-card)
			var sectionIndicator = elementToAdd.firstChild.className;
			var sectionBox;
			if (elementToAdd.children.length > 1){
				if (sectionIndicator.indexOf("news") >= 0){
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-news-outlets");
				}else{
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-lists");
				}
			}else{
				if (sectionIndicator.indexOf("news") >= 0){
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-news-articles");
				}else if (sectionIndicator.indexOf("timer") >= 0 || sectionIndicator.indexOf("alarm") >= 0){
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-time-events");
				}else if (sectionIndicator.indexOf("radio") >= 0){
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-music");
				}else if (sectionIndicator.indexOf("link") >= 0){
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-links");
				}else if (sectionIndicator.indexOf("weather") >= 0){
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-weather");
				}else{
					sectionBox = findOrCreateMyViewSection("sepiaFW-section-others");
				}
			}
			$(sectionBox).prepend(elementToAdd);
			$('#sepiaFW-my-view').prepend(sectionBox);
		}else{
			$('#sepiaFW-my-view').prepend(elementToAdd);
		}
		latestAddedElement = elementToAdd;
		//animate
		if (showPane){
			SepiaFW.ui.moc.showPane(0);
		}
		if (animateAppear){
			$(elementToAdd).fadeIn(500, function(){
				//add callback?
			});
		}
		if (scrollToElement){
			MyView.scrollToLatest();
		}
	}
	//add a card that was removed before somewhere
	MyView.addCard = function(cardElement, cardInfo){
		//remove intro on first move
		if (isFirstCardAdd){
			$('#sepiaFW-my-view-intro').remove();
			isFirstCardAdd = false;
			//SepiaFW.ui.moc.showPane(0);	//after user gets the concept this is more annoying than helpful ;-)
		}
		MyView.addElement(cardElement, true, false, true);
	}
		
	return MyView;
}
