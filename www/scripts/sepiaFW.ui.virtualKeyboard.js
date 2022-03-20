//AUDIO PLAYER
function sepiaFW_build_ui_virtual_keyboard(){
	var VirtualKeyboard = {};

	var vkContainer = document.getElementById("sepiaFW-virtual-keyboard-box");
	var vkAnimTime = 500;

	var isEnabled = false;
	var isOpen = false;

	var keyboardInterface;

	VirtualKeyboard.isEnabled = function(){
		return isEnabled;
	}
	VirtualKeyboard.isOpen = function(){
		return isOpen;
	}

	//setup
	VirtualKeyboard.setup = function(doneCallback){
		//Implementation: custom
		//isEnabled = true; doneCallback(); return;
		//Implementation: simple-keyboard
		if (!window.SimpleKeyboard && !triedToLoad){
			triedToLoad = true;
			//load css
			var l = document.createElement("link");
			l.rel = "stylesheet";
			l.href = "css/simple-keyboard.css";
			document.body.appendChild(l);
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
				console.error("'simple-keyboard' setup done");	//DEBUG
				doneCallback();
			});
		}else{
			console.error("VirtualKeyboard - ERROR: No virtual keyboard found!");
			doneCallback();
		}
	}
	var triedToLoad = false;

	//open / close
	VirtualKeyboard.open = function(openCallback){
		if (isEnabled){
			clearTimeout(showHideTimer);
			vkContainer.style.display = "block";
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
		VirtualKeyboard.close();
	}

	//Simple-Keyboard interface
	var SimpleKeyboard = function(onInit){

		var activeInputElement = undefined;

		this.setInputElement = function(ele){
			activeInputElement = ele;
			if (!ele) return;
			//keyboard.setOptions({inputName: ele.id});
			if (ele.value != undefined){
				keyboard.setInput(ele.value);
				if (ele.selectionStart) keyboard.setCaretPosition(ele.selectionStart);
			}else{
				keyboard.setInput(ele.textContent);
				//TODO: fix caret position
				if (window.getSelection() && window.getSelection().anchorOffset){
					keyboard.setCaretPosition(window.getSelection().anchorOffset);
				}
			}
		}
		this.setInputValue = function(value){
			keyboard.setInput(value);
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
				if (activeInputElement.value != undefined){
					activeInputElement.value = inputVal;
					activeInputElement.setSelectionRange(keyboard.getCaretPosition(), keyboard.getCaretPositionEnd());
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
			//console.log("Button pressed", button);		//DEBUG
			if (button === "{shift}" || button === "{lock}") handleShift();
  			if (button === "{numbers}" || button === "{abc}") handleNumbers();
		}
		function handleShift() {
			var currentLayout = keyboard.options.layoutName;
			var shiftToggle = currentLayout === "default" ? "shift" : "default";
			keyboard.setOptions({
				layoutName: shiftToggle
			});
		}
		function handleNumbers() {
			var currentLayout = keyboard.options.layoutName;
			var numbersToggle = currentLayout !== "numbers" ? "numbers" : "default";
			keyboard.setOptions({
				layoutName: numbersToggle
			});
		}
		
		var keyboard = new window.SimpleKeyboard.default({
			onChange: onChange,
			onKeyPress: onKeyPress,
			preventMouseDownDefault: true,	//prevent loss of input focus
			mergeDisplay: true,
			layoutName: "default",
			layout: {
				default: [
					"q w e r t y u i o p",
					"a s d f g h j k l",
					"{shift} z x c v b n m {backspace}",
					"{numbers} {space} {ent}"
				],
				shift: [
					"Q W E R T Y U I O P",
					"A S D F G H J K L",
					"{shift} Z X C V B N M {backspace}",
					"{numbers} {space} {ent}"
				],
				numbers: [
					"1 2 3", 
					"4 5 6", 
					"7 8 9", 
					"{abc} 0 {backspace}"
				]
			},
			display: {
				"{numbers}": "123",
				"{ent}": "return",
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
				"{metaright}": "cmd ⌘",
				"{abc}": "ABC"
			},
			onInit: onInit
		});
	}

	return VirtualKeyboard;
}