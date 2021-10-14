//ACTIONS
function sepiaFW_build_ui_my_view(){
	var MyView = {};
	
	var useSections = true;
	var addSectionTitles = true;

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

	function findOrCreateMyViewSection(sectionName){
		var sectionClass = "sepiaFW-section-mv-" + sectionName.replace(/^section_/, "").replace(/_/g, "-");
		var $res = $('#sepiaFW-my-view').find(".sepiaFW-my-view-section." + sectionClass);
		if ($res.length > 0){
			return $res[0];
		}else{
			var sectionBox = document.createElement("div");
			sectionBox.className = "sepiaFW-my-view-section " + sectionClass;
			if (addSectionTitles){
				var title = document.createElement("p");
				title.className = "sepiaFW-mySections-titleNote";
				title.textContent = SepiaFW.local.g(sectionName) + ": ";
				sectionBox.appendChild(title);
			}
			$('#sepiaFW-my-view').prepend(sectionBox);
			//observe
			var observer = new MutationObserver(function(mutationList, obsrvr){
				mutationList.forEach(function(mutation){
					if (mutation.type == 'childList'){
						MyView.handleEmptySection(mutation.target);
					}
				});
			});
			observer.observe(sectionBox, {childList: true});

			return sectionBox;
		}
	}
	function findSectionNameFromElement(elementToAdd){
		var $elementFirstCardBodyItem = $(elementToAdd).find(".cardBodyItem").first();
		var sectionIndicator = elementToAdd.firstChild.className;
		var subSectionIndicator = $elementFirstCardBodyItem? $elementFirstCardBodyItem[0].className : "";
		var sectionName;
		//console.error("elementToAdd", elementToAdd.firstChild.className);		//DEBUG
		if (sectionIndicator.indexOf("cards-list-title") >= 0){
			if (sectionIndicator.indexOf("news") >= 0){
				if (addSectionTitles) 
				sectionName = "section_news_outlets";
			}else{
				sectionName = "section_lists";
			}
		}else{
			if (sectionIndicator.indexOf("news") >= 0){
				sectionName = "section_news_articles";
			}else if (sectionIndicator.indexOf("timer") >= 0 || sectionIndicator.indexOf("alarm") >= 0){
				sectionName = "section_time_events";
			}else if (sectionIndicator.indexOf("radio") >= 0 || subSectionIndicator.indexOf("musicSearch") >= 0){
				sectionName = "section_music";
			}else if (sectionIndicator.indexOf("link") >= 0){
				sectionName = "section_links";
			}else if (sectionIndicator.indexOf("weather") >= 0){
				sectionName = "section_weather";
			}else{
				sectionName = "section_others";
			}
		}
		return sectionName;
	}
	//check if section is empty and handle
	MyView.handleEmptySection = function(sectionElement){
		var $sectionElement = $(sectionElement);
		if ($sectionElement.children().not("p").length == 0){
			//animated remove
			$sectionElement.hide(150, function(){ 
				$sectionElement.remove(); 
			});
		}
	}

	//select proper container then add element and optionally animate and scroll
	MyView.addElement = function(elementToAdd, animateAppear, showPane, scrollToElement){
		if (animateAppear){
			elementToAdd.style.display = "none";
		}
		//put it in a box?
		if (useSections && elementToAdd.className.indexOf("sepiaFW-cards-flexSize-container") >= 0){
			//improvised sections - TODO: add sections data (server-client-card)
			var sectionIndicator = findSectionNameFromElement(elementToAdd);
			var sectionBox = findOrCreateMyViewSection(sectionIndicator);
			$(sectionBox).append(elementToAdd);
			//$('#sepiaFW-my-view').prepend(sectionBox);	//this would move it to top again
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
