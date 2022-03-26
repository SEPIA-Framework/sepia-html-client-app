//AUDIO PLAYER
function sepiaFW_build_ui_virtual_keyboard(){
	var VirtualKeyboard = {};

	var vkContainer = document.getElementById("sepiaFW-virtual-keyboard-box");
	var vkToolbar = document.getElementById("sepiaFW-virtual-keyboard-toolbar");
	var inputPreview;

	var vkAnimTime = 500;
	var autoHide = false;

	var isEnabled = false;
	var isOpen = false;

	var keyboardInterface;

	//states
	VirtualKeyboard.isEnabled = function(){
		return isEnabled;
	}
	VirtualKeyboard.isOpen = function(){
		return isOpen;
	}
	//disable
	VirtualKeyboard.disable = function(){
		isEnabled = false;
	}

	//setup
	VirtualKeyboard.setup = function(doneCallback){
		//Implementation: custom
		//isEnabled = true; doneCallback(isEnabled); return;
		//Implementation: simple-keyboard
		if (!window.SimpleKeyboard && !triedToLoad){
			triedToLoad = true;
			//make sure events listener is enabled
			SepiaFW.ui.listenGloballyToFocusEvents();
			//load css
			var l = document.createElement("link");
			l.rel = "stylesheet";
			l.href = "css/simple-keyboard.css";
			var l2 = document.createElement("link");
			l2.rel = "stylesheet";
			l2.href = "css/sepiaFW-style-virtual-keyboard.css";
			document.body.appendChild(l);
			document.body.appendChild(l2);
			//load script
			var s = document.createElement("script");
			s.src ="scripts/simple-keyboard.modern.min.js";
			s.onload = function(){
				finishSetup(doneCallback);
			}
			s.onerror = function(){
				console.error("VirtualKeyboard - ERROR: failed to load script!");
				finishSetup(doneCallback);
			};
			document.body.appendChild(s);
		}else{
			finishSetup(doneCallback);
		}
	}
	function finishSetup(doneCallback){
		if (window.SimpleKeyboard && vkContainer){
			//check element
			var activeEle = $(vkContainer).find(".simple-keyboard").get(0);
			if (!activeEle){
				activeEle = document.createElement("div");
				activeEle.className = "simple-keyboard";
				vkContainer.appendChild(activeEle);
			}
			//create instance
			keyboardInterface = new SimpleKeyboard(function(){
				//ready
				isEnabled = true;
				doneCallback(isEnabled);
			});
			//build toolbar
			if (vkToolbar){
				var inputPreviewDiv = document.createElement("div");
				inputPreviewDiv.className = "vk-toolbar-input-box";
				inputPreview = buildInputPreview(inputPreviewDiv);
				var closeBtnDiv = document.createElement("div");
				closeBtnDiv.className = "vk-toolbar-btn-box";
				var closeBtn = document.createElement("button");
				closeBtn.innerHTML = "<i class='material-icons'>cancel</i>";
				closeBtnDiv.appendChild(closeBtn);
				var dummyDiv = document.createElement("div");
				dummyDiv.className = "vk-toolbar-btn-box";
				vkToolbar.appendChild(dummyDiv);
				vkToolbar.appendChild(inputPreviewDiv);
				vkToolbar.appendChild(closeBtnDiv);
				//close
				$(closeBtn).on("click", function(){
					VirtualKeyboard.close();
				});
			}
		}else{
			console.error("VirtualKeyboard - ERROR: No virtual keyboard found!");
			doneCallback(isEnabled);
		}
	}
	var triedToLoad = false;

	//open / close
	VirtualKeyboard.open = function(openCallback){
		if (isEnabled){
			clearTimeout(showHideTimer);
			vkContainer.style.display = "flex";
			setTimeout(function(){
				vkContainer.style.bottom = "0px";
				isOpen = true;
				if (openCallback) openCallback();
			}, 0);
		}
	}
	VirtualKeyboard.close = function(){
		if (isEnabled){
			clearTimeout(showHideTimer);
			vkContainer.style.bottom = -1 * Math.ceil(vkContainer.getBoundingClientRect().height) + "px";
			isOpen = false;		//set before or after timeout?
			showHideTimer = setTimeout(function(){
				vkContainer.style.display = "none";
			}, vkAnimTime);
			//set empty input element
			keyboardInterface.setInputElement(undefined);
		}
	}
	var showHideTimer = undefined;

	//focus events
	VirtualKeyboard.onInputFocus = function(target){
		//console.error("vk onInputFocus:", target);	//DEBUG
		VirtualKeyboard.open(function(){
			//set current input element
			keyboardInterface.setInputElement(target);
		});
	}
	VirtualKeyboard.onInputBlur = function(){
		//console.error("vk onInputBlur");				//DEBUG
		if (autoHide){
			VirtualKeyboard.close();
		}else{
			keyboardInterface.setInputElement(undefined);
		}
	}

	//Simple-Keyboard interface
	var SimpleKeyboard = function(onInit){

		var that = this;
		var activeInputElement = undefined;

		this.setInputElement = function(ele){
			activeInputElement = ele;
			//console.error("activeInputElement", activeInputElement);		//DEBUG
			if (!ele){
				that.setInputValue("");
				return;
			}
			//keyboard.setOptions({inputName: ele.id});
			if (ele.value != undefined){
				that.setInputValue(ele.value);
				if (ele.selectionStart) keyboard.setCaretPosition(ele.selectionStart);
			}else{
				that.setInputValue(ele.textContent);
				//TODO: fix caret position
				if (window.getSelection() && window.getSelection().anchorOffset){
					keyboard.setCaretPosition(window.getSelection().anchorOffset);
				}
			}
		}
		this.setInputValue = function(value){
			keyboard.setInput(value);
			if (inputPreview) inputPreview.setInput(value);
		}
		this.setCaretPosition = function(posStart, posEnd){
			if (posEnd){
				keyboard.setCaretPosition(posStart, posEnd);
			}else{
				keyboard.setCaretPosition(posStart);
			}
		}

		function onChange(inputVal){
			//console.log("Input changed", inputVal);		//DEBUG
			if (activeInputElement){
				if (inputPreview) inputPreview.setInput(inputVal);
				if (activeInputElement.value != undefined){
					activeInputElement.value = inputVal;
					if (!activeInputElement.type || activeInputElement.type == "text"){
						activeInputElement.setSelectionRange(keyboard.getCaretPosition(), keyboard.getCaretPositionEnd());
					}
				}else{
					//if (activeInputElement.contentEditable && activeInputElement.contentEditable == "true") ...
					activeInputElement.textContent = inputVal;
					var sel = window.getSelection();
					//TODO: fix caret position
					if (sel){
						sel.collapse(activeInputElement, keyboard.getCaretPosition());
					}
				}
			}
		}

		function onKeyPress(button){
			//console.error("Button pressed", button);		//DEBUG
			switch (button) {
				case "{shift}":
				case "{lock}":
					handleShift();
					break;
				case "{special1}":
				case "{abc}":
					handleSpecials();
					break;
				case "{enter}":
					pressKey(activeInputElement, "Enter", 13, true);
					break;
					//TODO: add more buttons
				default:
					break;
			}
		}
		function handleShift(){
			var shiftLayout = getShiftLayout();
			keyboard.setOptions({
				layoutName: (keyboard.options.layoutName != shiftLayout)? shiftLayout : getDefaultLayout()
			});
		}
		function handleSpecials(){
			keyboard.setOptions({
				layoutName: (keyboard.options.layoutName != "special1")? "special1" : getDefaultLayout()
			});
		}

		function getDefaultLayout(){
			if (vkContainer.getBoundingClientRect().width < 1280){
				return "mobile";
			}else{
				return "mobile";		//TODO: add big layout
			}
		}
		function getShiftLayout(){
			if (vkContainer.getBoundingClientRect().width < 1280){
				return "mobileshift";
			}else{
				return "mobileshift";		//TODO: add big layout
			}
		}
		
		var keyboard = new window.SimpleKeyboard.default({
			onChange: onChange,
			onKeyPress: onKeyPress,
			preventMouseDownDefault: true,	//prevent loss of input focus
			physicalKeyboardHighlight: true,
			physicalKeyboardHighlightPress: true,
			mergeDisplay: true,
			layoutName: getDefaultLayout(),
			layout: {
				mobile: [
					"q w e r t y u i o p",
					"a s d f g h j k l",
					"{shift} z x c v b n m {backspace}",
					"{special1} , {arrowleft} {space} {arrowright} . {enter}"
				],
				mobileshift: [
					"Q W E R T Y U I O P",
					"A S D F G H J K L",
					"{shift} Z X C V B N M {backspace}",
					"{special1} , {arrowleft} {space} {arrowright} . {enter}"
				],
				special1: [
					"1 2 3 4 5 6 7 8 9 0 = +", 
					"! @ # $ % ^ & * ( ) < >", 
					"_ - ' \" : ; , ? / [ ] {backspace}", 
					"{abc} , {space} . {enter}"
				]
			},
			buttonTheme: [{
				class: "hg-greedy",
				buttons: "{space}"
			}],
			display: {
				"{abc}": "ABC",
				"{special1}": "!#1",
				"{enter}": "↵",
				"{escape}": "esc ⎋",
				"{tab}": "tab ⇥",
				"{backspace}": "⌫",
				"{capslock}": "caps lock ⇪",
				"{shift}": "⇧",
				"{controlleft}": "ctrl ⌃",
				"{controlright}": "ctrl ⌃",
				"{altleft}": "alt ⌥",
				"{altright}": "alt ⌥",
				"{metaleft}": "cmd ⌘",
				"{metaright}": "cmd ⌘"
			},
			onInit: onInit
		});
	}

	//special input preview
	function buildInputPreview(parentEle){
		var InputPrev = {};

		var lettersBox = document.createElement("div");
		lettersBox.className = "vk-input-preview";
		parentEle.appendChild(lettersBox);

		lettersBox.addEventListener('pointerdown', function(e){
			//some action ...
			e.preventDefault();		//prevent input focus loss
			return false;
		});

		InputPrev.setInput = function(val, caretPos){
			lettersBox.textContent = val;
			if (caretPos == undefined){
				parentEle.scrollLeft = parentEle.scrollWidth;
			}			
		}
		InputPrev.getElement = function(){
			return lettersBox;
		}

		return InputPrev;
	}

	//key dispatcher
	function pressKey(ele, keyName, keyCode, release){
		if (!ele) return;
		var keyboardEvent = new KeyboardEvent('keydown', {
			code: keyName,	//e.g. 'Enter'
			key: keyName,	//e.g. 'Enter'
			charKode: keyCode,	//e.g. 13
			keyCode: keyCode	//e.g. 13
		});
		ele.dispatchEvent(keyboardEvent);
		if (release) releaseKey(ele, keyName, keyCode);
	}
	function releaseKey(ele, keyName, keyCode){
		if (!ele) return;
		var keyboardEvent = new KeyboardEvent('keyup', {
			code: keyName,
			key: keyName,
			charKode: keyCode,
			keyCode: keyCode
		});
		ele.dispatchEvent(keyboardEvent);
	}

	return VirtualKeyboard;
}