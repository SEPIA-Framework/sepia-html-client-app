function sepiaFW_build_ui_drag_and_drop(){
	/* example:

	<div class="sepiaFW-cards-flexSize-container">
		<div class="sepiaFW-cards-list-title">List 1</div>
		<div class="sepiaFW-cards-list-body">
			<div class="listElement">
				<div class="listLeft"></div>
				<div class="listCenter">Entry 1-1</div>
				<div class="listRight">-</div>
			</div>
			<div class="listElement">
				<div class="listLeft"></div>
				<div class="listCenter">Entry 2-1</div>
				<div class="listRight">-</div>
			</div>
		</div>
		<div class="sepiaFW-cards-list-footer">Footer 1</div>
	</div>
	
	var options = {
		allowCrossContainerDrag: true,
		activateDragAfterLongPress: true,
		autoDisableAfterDrop: true,
		tapCallback: function(){ console.log('tap'); },
		longPressCallback: function(){ console.log('long-press'); }
	};
	var dragAnchors = document.getElementsByClassName("listLeft");
	for (var i=0; i<dragAnchors.length; i++){
		var draggable = new SepiaFW.ui.dragDrop.Draggable(dragAnchors[i], ".listElement", ".sepiaFW-cards-list-body", options);
	}
	*/
	
	var DragDrop = {};
		
	DragDrop.Draggable = function(dragAnchorElement, dragObjectSelector, dragObjectContainerSelector, options){
		//--- options ---
		//allowCrossContainerDrag 		- allow dragObjects to move between dragObjectContainers
		//activateDragAfterLongPress	- disable drag first and activate via long-press on dragAnchorElement
		//autoDisableAfterDrop			- disable drag after drop (combine with e.g. activateDragAfterLongPress)
		//dropCallback					- driggered after drop release
		//tapCallback
		//longPressCallback
		if (!options) options = {};

		//Elements
		var self = this;
		var $dragObject = $(dragAnchorElement).closest(dragObjectSelector);
		var $dragObjectContainer;		//depending on settings can be multiple
		var $dragObjectContainerOwner;	//will be the direct parent of dargObject - needs to be refreshed on move
		function refreshDragContainers(){
			if (options.allowCrossContainerDrag){
				$dragObjectContainer = $(dragObjectContainerSelector);
				$dragObjectContainerOwner = $(dragAnchorElement).closest(dragObjectContainerSelector);
			}else{
				$dragObjectContainer = $(dragAnchorElement).closest(dragObjectContainerSelector);
				$dragObjectContainerOwner = $dragObjectContainer;
			}
		}
		refreshDragContainers();
		var activeDummy;
		var lastDummyPosition; //top, left relative to viewport
		var lastHoverElement;
		var $newNeighbourElement;
		var $dropZone; 				//currently we only need this if the drop-zone has no children

		//Helpers
		var autoDisableDragTimer;
		var autoDisableDragTimerDelay = 3000;
		function autoDisableDrag(){
			if (autoDisableDragTimer) clearTimeout(autoDisableDragTimer);
			$dragObject.addClass('draggable-toggle');
			activateDrag();
			autoDisableDragTimer = setTimeout(function(){
				self.disableDrag();
				//self.flash();
				$dragObject.removeClass('draggable-toggle');
				deActivateDrag();
			}, autoDisableDragTimerDelay);
		}
		function activateDrag(){
			if (SepiaFW.ui && SepiaFW.ui.hideActiveSwipeBars){
				SepiaFW.ui.hideActiveSwipeBars();
			}
		}
		function deActivateDrag(){
			if (SepiaFW.ui && SepiaFW.ui.showActiveSwipeBars){
				SepiaFW.ui.showActiveSwipeBars();
			}
		}
		
		//HammerJS
		var mcOptions = {
			//preventDefault: true,
			//domEvents: true,
			//touchAction: "pan-x pan-y"
		}
		var mc = new Hammer.Manager(dragAnchorElement, mcOptions);
		mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 10 }));
		if (options.activateDragAfterLongPress){
			mc.get('pan').set({ enable: false }); 		//disabled by default
		}
		//for tap and press see below exposed methods ...
		
		//Exposed methods:

		//drag states
		this.isDraggable = function(){
			return mc.get('pan').options.enable;
		}
		this.disableDrag = function(doAnimate){
			mc.get('pan').set({ enable: false });
		}
		this.enableDrag = function(doAnimate){
			if (doAnimate){
				self.flash();
			}
			mc.get('pan').set({ enable: true });
		}
		this.flash = function(){
			//TODO: replace
			$dragObject.addClass('new-position');
			setTimeout(function(){
				$dragObject.removeClass('new-position');
			}, 500);
		}
		//move element
		this.moveTo = function($neighbour, $dropzone, doAnimate, referencePosition){
			var targetAndObjectSame = ($neighbour && $neighbour[0].isSameNode($dragObject[0]));
			var moved = false;
			if (($dropzone || $neighbour) && !targetAndObjectSame){
				//detach
				$dragObject.detach();
				//insert after neighbour
				if ($neighbour){
					//TODO: this only works for vertical list logic ... what if we want icons like drag and drop (e.g homescreen)?
					//choose between insert-after and insert-before:
					var isAbove = (referencePosition.top - $neighbour.get(0).getBoundingClientRect().top) < 0;
					if (isAbove){
						$dragObject.insertBefore($neighbour);
					}else{
						$dragObject.insertAfter($neighbour);
					}
				}else{
					$dragObject.appendTo($dropzone);
				}
				refreshDragContainers();
				moved = true;
			}
			if (doAnimate){
				$dragObject.addClass('new-position');
				setTimeout(function(){
					$dragObject.removeClass('new-position');
				}, 500);
			}
			return moved;
		}

		//Tap and long-press?

		//Long-press
		var useLongPress = options.longPressCallback || options.activateDragAfterLongPress;
		if (useLongPress){
			var delay = 625;
			mc.add(new Hammer.Press({ event: 'longpress', time: delay })); 	//Note: event:'longpress' just renames the 'press' event
			mc.on("longpress", function(e){
				longpress();
			});
			mc.on("longpressup", function(e){
				longpressup();
			});
		}
		function longpress(){
			//console.log('longpress');
			self.flash(); 		//always trigger?
		}
		function longpressup(){
			//console.log('longpressup');
			if (options.activateDragAfterLongPress){
				self.enableDrag();
				//auto-disable drag afterwards? (window gets extenden at 'panstart' event)
				if (options.autoDisableAfterDrop){
					autoDisableDrag();
				}
			}
			if (options.longPressCallback) options.longPressCallback();
		}
		//Short-press (tap)
		if (options.tapCallback){
			mc.add(new Hammer.Tap());
			mc.on("tap", function(e){
				shortpress();
			});
		}
		function shortpress(){
			//console.log('tap');
			if (options.tapCallback) options.tapCallback();
		}
		//SepiaFW special events listener - used to reliably trigger certain callbacks via $(..).trigger(...)
		$(dragAnchorElement).on('sepiaFW-events', function(e, data){
			if (data.name === "shortpress"){
				//console.log('shortpress-trigger');
				shortpress();
			}else if (data.name === "longpress"){
				//console.log('longpress-trigger');
				if (useLongPress){
					longpress();
					longpressup();
				}
			}
		});

		//Drag handlers:

		mc.on("panstart", function(e){
			//console.log(e.type);

			//keep drag alive on auto-disable?
			if (autoDisableDragTimer) clearTimeout(autoDisableDragTimer);

			//update containers
			refreshDragContainers();

			//create a dummy to drag around (but only one!)
			$dragObject.addClass('dragging');
			activeDummy = createDragDummy($dragObject, $('body'));
		});
		mc.on("panmove", function(e){
			//console.log(e);

			//get and set coordinates for dummy - note: relative to element start position
			var y = $dragObject.get(0).getBoundingClientRect().top + e.deltaY;
			var x = $dragObject.get(0).getBoundingClientRect().left + e.deltaX;
			activeDummy.style.top = y + 'px';
			activeDummy.style.left = x + 'px';

			//get the element under the mouse-pointer/touch-position - note: absolute position
			var px = e.center.x;
			var py = e.center.y;	//TODO: is center safe for multi-touch?
			var hoverElement = document.elementFromPoint(px, py); 		//alternative: elementsFromPoint
			if (hoverElement){
				//check if its a new element
				var updateElement = false;
				if (lastHoverElement && !lastHoverElement.isSameNode(hoverElement)){
					//hovering over new element
					if ($newNeighbourElement) $newNeighbourElement.removeClass('sepiaFW-list-hover-over');
					if ($dropZone) $dropZone.removeClass('sepiaFW-list-hover-over');
					lastHoverElement = hoverElement;
					updateElement = true;
				}else if (!lastHoverElement){
					//first hover event
					lastHoverElement = hoverElement;
					updateElement = true;
				}
				if (updateElement){
					//iterate over multiple drop-zones (if any)
					$dragObjectContainer.each(function(i){
						var dragObjectContainer = $dragObjectContainer[i];

						//is inside drop-zone?
						if ($.contains(dragObjectContainer, lastHoverElement)){
							//get new potential drop-zone close to other drag-object
							$newNeighbourElement = $(lastHoverElement).closest(dragObjectSelector);
							$newNeighbourElement.addClass('sepiaFW-list-hover-over');
							$dropZone = $dragObjectContainer.eq(i);
							return false; 	//stop each-loop
						
						//is drop-zone itself?
						}else if (lastHoverElement.isSameNode(dragObjectContainer)){
							//get closest drag-object as reference
							//try simple look around first before iterating all (range 20px)
							var rangePx = 20;
							var $lookAroundElement = findValidObjectAroundPointer(px, py, rangePx, dragObjectSelector);
							if ($lookAroundElement.length){
								//found a match around
								$newNeighbourElement = $lookAroundElement;
								$newNeighbourElement.addClass('sepiaFW-list-hover-over');
								$dropZone = $dragObjectContainer.eq(i);
								return false; 	//stop each-loop
							}else{
								//TODO: find closest - for now just take last
								$newNeighbourElement = $dragObjectContainer.eq(i).find(dragObjectSelector).last();
								if ($newNeighbourElement.length <= 0){
									$newNeighbourElement = undefined;
									$dropZone = $dragObjectContainer.eq(i);
									$dropZone.addClass('sepiaFW-list-hover-over');
								}else{
									$newNeighbourElement.addClass('sepiaFW-list-hover-over');
								}
								return false; 	//stop each-loop
							}

						//not a drop option
						}else{
							//clean reference to closest drag-object
							$newNeighbourElement = undefined;
							$dropZone = undefined;
							return true; 	//continue each-loop
						}
					});
				}
			}
		});
		mc.on("panend pancancel", function(e){
			//console.log(e.type);

			//clean-up some
			lastDummyPosition = activeDummy.getBoundingClientRect();
			$(activeDummy).remove();
			activeDummy = undefined;
			lastHoverElement = undefined;
			if ($newNeighbourElement) 	$newNeighbourElement.removeClass('sepiaFW-list-hover-over');
			if ($dropZone) 				$dropZone.removeClass('sepiaFW-list-hover-over');

			//move (if makes sense)
			var doAnimate = true;
			var dragOriginContainer = $dragObjectContainerOwner.get(0); 	//store this before it gets refreshed
			var positionChanged = self.moveTo($newNeighbourElement, $dropZone, doAnimate, lastDummyPosition);

			//auto-disable drag afterwards?
			if (options.autoDisableAfterDrop){
				autoDisableDrag();
			}

			//Callback with object, old and new container
			if (options.dropCallback){
				var dropZone = ($dropZone)? $dropZone.get(0) : undefined;
				options.dropCallback($dragObject.get(0), dragOriginContainer, dropZone, positionChanged);
			}
			
			//clean-up rest
			$dragObject.removeClass('dragging');
			$newNeighbourElement = undefined;
			$dropZone = undefined;
			lastDummyPosition = undefined;
		});
	}

	function createDragDummy($targetEle, $targetContainer){
		var dummy = document.createElement('div');
		dummy.className = 'sepiaFW-list-drag-dummy';
		dummy.style.width = ($targetEle.outerWidth() + 'px');
		dummy.style.height = ($targetEle.outerHeight() + 'px');
		$targetContainer.append(dummy);
		var rect = $targetEle.get(0).getBoundingClientRect();
		dummy.style.top = rect.top + 'px';
		dummy.style.left = rect.left + 'px';
		return dummy;
	}

	function findValidObjectAroundPointer(px, py, rangePx, validObjectSelector){
		var lookAroundAbove = document.elementFromPoint(px, py - rangePx);
		var $above = (lookAroundAbove)? $(lookAroundAbove).closest(validObjectSelector) : $();
		var lookAroundBelow = document.elementFromPoint(px, py + rangePx);
		var $below = (lookAroundBelow)? $(lookAroundBelow).closest(validObjectSelector) : $();
		//Note: we don't check the best, we just take the first match
		if ($above.length > 0){
			return $above;
		}else if ($below.length > 0){
			return $below;
		}else{
			return $();
		}
	}
	
	return DragDrop;
}