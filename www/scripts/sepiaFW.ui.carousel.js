function sepiaFW_build_ui_carousel(){
	/* example:
	<div class="sepiaFW-inner-container sepiaFW-carousel">
		<div class='sepiaFW-carousel-pane-container'>
			<div id="sepiaFW-my-view" class='sepiaFW-carousel-pane'><!-- dynamic content --></div>
			<div id="sepiaFW-chat-output" class='sepiaFW-carousel-pane'><!-- dynamic content --></div>
			<div id="sepiaFW-result-view" class='sepiaFW-carousel-pane'><!-- dynamic content --></div>
		</div>
	</div>
	
	var c = new SepiaFW.ui.Carousel('.sepiaFW-carousel');
	c.init();
	c.showPane(0);
	*/
	
	//add carousel ease function
	jQuery.easing['bytemind-carousel'] = function (x, t, b, c, d) {
		//easeOutQuad
		return -c *(t/=d)*(t-2) + b;
	}
	
	var transitionEnd = 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';
	
	//Taken from the nice Hammer.js carousel demo: https://jsfiddle.net/Richard_Liu/7cqqcrmm/
	var Carousel = function(carouselSelector, swipeArea1, swipeArea2, swipeArea3, swipeArea4, onPageSet) {
		var self = this;
		var $carousel = $(carouselSelector);
		var $container = $('.sepiaFW-carousel-pane-container', carouselSelector);
		var $panes = $('.sepiaFW-carousel-pane', carouselSelector);

		var paneWidth = 0;
		var paneHeight = 0;
		var paneCount = $panes.length;
		var panBoundary = .25; // if the pane is panned .25, switch to the next pane.

		var currentPane = 0;
		
		var lastDeltaX = 0;
		var errorResetTimer;

		function setPaneSize() {
			paneWidth = $carousel.outerWidth();
			paneHeight = $carousel.outerHeight();
			$panes.each(function(i) {
				$(this).outerWidth(paneWidth);
				$(this).outerHeight(paneHeight);
			});
			$container.outerWidth(paneWidth * paneCount);
			$container.outerHeight(paneHeight);
		}

		self.init = function() {
			setPaneSize();
			$(window).on('load resize orientationchange', function() {
				setPaneSize();
				//self.showPane(currentPane);
				setContainerOffsetX(-currentPane * paneWidth, false);
			});
		}
		self.refresh = function() {
			setPaneSize();
			self.showPane(currentPane);
		}
		self.unbind = function() {
			if (hammer1) hammer1.off();
			if (hammer2) hammer2.off();
			if (hammer3) hammer3.off();
			if (hammer4) hammer4.off();
		}

		self.showPane = function(index) {
			currentPane = Math.max(0, Math.min(index, paneCount - 1));
			setContainerOffsetX(-currentPane * paneWidth, true);
			//page set callback
			if (onPageSet) onPageSet(currentPane);
		}

		function setContainerOffsetX(offsetX, doTransition) {
			if (doTransition) {
				/*
				$container
					.addClass('transition')
					.one(transitionEnd, function() {
						$container.removeClass('transition');
						clearTimeout(errorResetTimer);
					})
				*/
				/*
				$container.stop().animate({left: offsetX + "px"}, 300, 'bytemind-carousel', function(){
					clearTimeout(errorResetTimer);
				});
				*/
				$container.stop().css({
					'transition': 'transform .3s',
					'transform': 'translate3d(' + offsetX + "px" + ', 0px, 0px)'
				}).on('transitionend', function() {
					clearTimeout(errorResetTimer);
					$container.css({'transition': 'transform .15s'});		//TODO: for firefox and IE this should be 0, 0.3 is great for swipe but not for drag ...
				});
			}else{
				/*
				$container.stop().css({
					left: offsetX
				});
				*/
				$container.stop().css({
					'transform': 'translate3d(' + offsetX + "px" + ', 0px, 0px)'
				});
			}
		}

		self.next = function() {
			self.showPane(++currentPane);
		}
		self.prev = function() {
			self.showPane(--currentPane);
		}

		self.getCurrentPane = function() {
			return currentPane;
		}
		self.getNumberOfPanes = function() {
			return paneCount;
		}
		
		function handleHammer(e) {
			clearTimeout(errorResetTimer);
			switch (e.type) {
				case 'swipeleft':
				case 'swiperight':
					handleSwipe(e);
					break;
				case 'panleft':
				case 'panright':
				case 'panend':
				case 'pancancel':
					handlePan(e);
					break;
			}
		}

		function handleSwipe(e) {
			switch (e.direction) {
				case Hammer.DIRECTION_LEFT:
					self.next();
					break;
				case Hammer.DIRECTION_RIGHT:
					self.prev();
					break;
				default:
					decideDirectionAndSlide(lastDeltaX);
			}
			if (hammer1) hammer1.stop(true);
			if (hammer2) hammer2.stop(true);
			if (hammer3) hammer3.stop(true);
			if (hammer4) hammer4.stop(true);
			errorResetTimer = setTimeout(function(){
				lastDeltaX = 0;
				self.showPane(currentPane);
			}, 450);
		}
	  
		function outOfBound() {
			var left = $container.position().left;
			return (currentPane == 0 && left >= 0) ||
				(currentPane == paneCount - 1 && left <= -paneWidth * (paneCount - 1));
		}

		function handlePan(e) {
			switch (e.type) {
				case 'panleft':
				case 'panright':
					lastDeltaX = e.deltaX;
					// Slow down at the first and last pane.
					if (outOfBound()) {
						e.deltaX *= .2;
					}
					setContainerOffsetX(-currentPane * paneWidth + e.deltaX);
					//console.log(-currentPane * paneWidth + e.deltaX);
					break;
				case 'panend':
				case 'pancancel':
					decideDirectionAndSlide(e.deltaX);
					break;
				default:
					decideDirectionAndSlide(lastDeltaX);
			}
		}
		
		function decideDirectionAndSlide(deltaX){
			lastDeltaX = 0;
			if (Math.abs(deltaX) > paneWidth * panBoundary) {
				if (deltaX > 0) {
					self.prev();
				}else{
					self.next();
				}
			}else{
				self.showPane(currentPane);
			}
		}
		
		var hammer1, hammer2, hammer3, hammer4;
		if (swipeArea1 || swipeArea2 || swipeArea3){
			if (swipeArea1)		hammer1 = new Hammer($(swipeArea1)[0]).on('swipeleft swiperight panleft panright panend pancancel', handleHammer);
			if (swipeArea2)		hammer2 = new Hammer($(swipeArea2)[0]).on('swipeleft swiperight panleft panright panend pancancel', handleHammer);
			if (swipeArea3)		hammer3 = new Hammer($(swipeArea3)[0]).on('swipeleft swiperight panleft panright panend pancancel', handleHammer);
			if (swipeArea4)		hammer4 = new Hammer($(swipeArea4)[0]).on('swipeleft swiperight panleft panright panend pancancel', handleHammer);
		}else{
			hammer1 = new Hammer($carousel[0]).on('swipeleft swiperight panleft panright panend pancancel', handleHammer);
		}
	}
	
	return Carousel;
}