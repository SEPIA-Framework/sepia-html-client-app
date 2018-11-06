//Frames
function sepiaFW_build_frames(){
	var Frames = {};
	
	//some states
	var isActive = "";
	Frames.isOpen = false;

	//callbacks
	var onFinishSetup = undefined;
	var onOpen = undefined;
	var onClose = undefined;
	
	Frames.open = function(info){
		//callbacks?
		onOpen = info.onOpen;
		onClose = info.onClose;
		onFinishSetup = info.onFinishSetup;
		
		//theme
		if (info.theme && info.theme == "dark"){
			$('html').addClass('dark');
			$('#sepiaFW-frames-view').addClass('dark');
			$('.sepiaFW-frames-page').addClass('dark');
		}else{
			$('html').removeClass('dark');
			$('#sepiaFW-frames-view').removeClass('dark');
			$('.sepiaFW-frames-page').removeClass('dark');
		}

		if (isActive != info.pageUrl){
			Frames.setup(info, function(){
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
		//on open
		if(onOpen) onOpen();
	}
	Frames.close = function(){
		//design resets (global changes)
		$('html').removeClass('dark');
		//close
		$('#sepiaFW-frames-view').slideUp(300);
		Frames.isOpen = false;
		SepiaFW.ui.switchSwipeBars();
		//on close
		if(onClose) onClose();
		//callbacks reset
		onFinishSetup = undefined;
		onOpen = undefined;
		onClose = undefined;
	}
		
	Frames.setup = function(info, finishCallback){
		//get HTML
		var framePage = info.pageUrl;
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

			//on finish setup
			if(onFinishSetup) onFinishSetup();

			if (finishCallback) finishCallback();
        
		//Error
		}, function(){
			$('#sepiaFW-frames-view').html("Error - could not load page");
		});
	}
	
	return Frames;
}