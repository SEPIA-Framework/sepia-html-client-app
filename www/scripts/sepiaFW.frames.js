//Frames
function sepiaFW_build_frames(){
	var Frames = {};
	
	//some states
	var isActive = "";
	Frames.isOpen = false;
	
	//some statics
	var nextStartingFrom = 0;
	var services;
	
	Frames.open = function(info){
		if (isActive != info.pageUrl){
			Frames.setup(info.pageUrl, function(){
				Frames.open(info);
			});
			isActive = info.pageUrl;
			return;
		
		}else{
			$('#sepiaFW-frames-view').slideDown(300, function(){
				Frames.uic.refresh();
			});
			Frames.isOpen = true;
			SepiaFW.ui.switchSwipeBars('frames');
		}
	}
	Frames.close = function(){
		$('#sepiaFW-frames-view').slideUp(300);
		Frames.isOpen = false;
		SepiaFW.ui.switchSwipeBars('chat');
	}
		
	Frames.setup = function(framePage, finishCallback){
		//get HTML
		//$.get(framePage, function(frameHtml){
        SepiaFW.files.fetch(framePage, function(frameHtml){
            $('#sepiaFW-frames-view').html(frameHtml);
			
			//nav-bar
			$('#sepiaFW-frames-close').off().on('click', function(){
				Frames.close();
			});

			$('#sepiaFW-frames-show-next-page').off().on('click', function(){
				Frames.uic.next();
			});
			$('#sepiaFW-frames-show-prev-page').off().on('click', function(){
				Frames.uic.prev();
			});
			
			//frame carousel
			Frames.uic = new SepiaFW.ui.Carousel('#sepiaFW-frame-carousel', '', '#sepiaFW-swipeBar-frames-left', '#sepiaFW-swipeBar-frames-right', '',
				function(currentPane){
					$("#sepiaFW-frames-nav-bar-page-indicator").find('div').removeClass("active");
					$("#sepiaFW-frames-nav-bar-page-indicator > div:nth-child(" + (currentPane+1) + ")").addClass('active').fadeTo(350, 1.0).fadeTo(350, 0.0);
					if (currentPane == 1){
						//page 1 active
					}else if (currentPane == 0){
						//page 2 active
					}
				});
			Frames.uic.init();
			Frames.uic.showPane(0);
			
			if (Frames.uic.getNumberOfPanes() <= 1){
				$('#sepiaFW-frames-show-next-page').hide();
				$('#sepiaFW-frames-show-prev-page').hide();
			}
		
			if (finishCallback) finishCallback();
        
		//Error
		}, function(){
			$('#sepiaFW-frames-view').html("Error - could not load page");
		});
	}
	
	return Frames;
}