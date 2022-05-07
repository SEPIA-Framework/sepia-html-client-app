//Files
function sepiaFW_build_files(){
	var Files = {};

	//Replace an abstract path like "<custom_data>/" with its system path, e.g. "xtensions/custom-data/" (in browser).
	//available:
	//- <custom_data> 	- Browser: "xtensions/custom-data" 	- Android: (cordova.file.externalDataDirectory) 	- iOS: (cordova.file.documentsDirectory)
	//- <local_data> 	- Browser: "xtensions/local-data" 	- Android/iOS: (cordova.file.dataDirectory)
	//- <app_data> 		- Browser: [base folder] 			- Android/iOS: (cordova.file.applicationDirectory + "www")
	//
	//NOTE: for server paths (including this) see: SepiaFW.config.replacePathTagWithActualPath
	//
	Files.replaceSystemFilePath = function(path){
		if (SepiaFW.ui.isCordova && cordova.file && (SepiaFW.ui.isAndroid || SepiaFW.ui.isIOS)){
			if (path.indexOf("<custom_data>") == 0){
				if (SepiaFW.ui.isAndroid){
					return path.replace("<custom_data>", cordova.file.externalDataDirectory.replace(/\/$/, ""));
				}else if (SepiaFW.ui.isIOS){
					return path.replace("<custom_data>", cordova.file.documentsDirectory.replace(/\/$/, ""));
				}
			}else if (path.indexOf("<local_data>") == 0){
				return path.replace("<local_data>", cordova.file.dataDirectory.replace(/\/$/, ""));
			
			}else if (path.indexOf("<app_data>") == 0){
				return path.replace("<app_data>", cordova.file.applicationDirectory + "www");
			}
		}else{
			if (path.indexOf("<custom_data>") == 0){
				return path.replace("<custom_data>", "xtensions/custom-data");
			
			}else if (path.indexOf("<local_data>") == 0){
				return path.replace("<local_data>", "xtensions/local-data");
			
			}else if (path.indexOf("<app_data>") == 0){
				return path.replace("<app_data>/", "");
			}
		}
		return path;
	}
	
	//Read file and decide for yourself if it's remote or local
	Files.fetch = function(fileUrl, successCallback, errorCallback, responseType, timeout){
		if(fileUrl.indexOf("http:") == 0 || fileUrl.indexOf("https:") == 0 || fileUrl.indexOf("ftp:") == 0){
			Files.fetchRemote(fileUrl, successCallback, errorCallback, responseType, timeout);
		}else{
			Files.fetchLocal(fileUrl, successCallback, errorCallback, responseType, timeout);
		}
	}
	
	//Read file from remote source as text or a binary type
	Files.fetchRemote = function(fileUrl, successCallback, errorCallback, responseType, timeout){
		if (responseType && responseType == "arraybuffer"){
			//ArrayBuffer
			xmlHttpCallForArrayBuffer(fileUrl, successCallback, errorCallback, timeout);
		}else{
			//Default response type: string
			ajaxCallForText(fileUrl, successCallback, errorCallback, timeout);
		}
	}
	
	//Read file from local drive as text or a binary type
	Files.fetchLocal = function(fileUrl, successCallback, errorCallback, responseType, timeout){
		if (!errorCallback) errorCallback = function(){};
		
		fileUrl = Files.replaceSystemFilePath(fileUrl);

		//via Cordova local filesystem
		if (SepiaFW.ui.isCordova && cordova.file){

			//TODO: this will (most likely) fail if inside a Web Worker

            var path = fileUrl;
			if ((fileUrl.indexOf("file://") != 0)
					&& (!cordova.file.applicationDirectory || fileUrl.indexOf(cordova.file.applicationDirectory) != 0)
					&& (!cordova.file.dataDirectory || fileUrl.indexOf(cordova.file.dataDirectory) != 0)
					&& (!cordova.file.externalDataDirectory || fileUrl.indexOf(cordova.file.externalDataDirectory) != 0)
					&& (!cordova.file.documentsDirectory || fileUrl.indexOf(cordova.file.documentsDirectory) != 0)){
                path = cordova.file.applicationDirectory + "www/" + fileUrl; 		//Note: we assume that this path makes most sense
            }
            window.resolveLocalFileSystemURL(path, function(entry){
				entry.file(
					function(file){
						if (responseType && responseType == "arraybuffer"){
							//ArrayBuffer
							readFileAsArrayBuffer(file, successCallback, errorCallback, timeout); 		//NOTE: untested
						}else{
							//Default response type: string
							readFileAsText(file, successCallback, errorCallback, timeout);
						}
					}, 
					errorCallback
				);
            }, errorCallback);
		
		//via HTTP GET
		}else{
			//Note: currently it's the same as Files.fetchRemote ... but might change
			if (responseType && responseType == "arraybuffer"){
				//ArrayBuffer
				xmlHttpCallForArrayBuffer(fileUrl, successCallback, errorCallback, timeout);
			}else{
				//Default response type: string
				ajaxCallForText(fileUrl, successCallback, errorCallback, timeout);
			}
		}
	}

	//HTTP GET based requests
	function ajaxCallForText(fileUrl, successCallback, errorCallback, timeout){
		$.ajax({
			url: fileUrl,
			timeout: (timeout || 8000),
			method: "GET",
			success: function(data) {
				successCallback(data);
			},
			error: function(data) {
				errorCallback(data);
			}
		});
	}
	function xmlHttpCallForArrayBuffer(fileUrl, successCallback, errorCallback, timeout){
		var request = new XMLHttpRequest();
		request.open('GET', fileUrl);
		request.responseType = 'arraybuffer';
		request.timeout = (timeout || 8000);
		request.onload = function(e){
			if (request.status >= 200 && request.status < 300){
				successCallback(request.response); 	//the arraybuffer is in request.response
			}else{
				errorCallback({
					status: request.status,
					message: request.statusText
				});
			}
		};
		request.onerror = function(e){
			errorCallback(e);
		};
		request.ontimeout = function(e){
			errorCallback(e);
		};
		request.send();
	}
	
	//Convert file-object to text
	function readFileAsText(file, successCallback, errorCallback, timeout){
		//NOTE: only works without user interaction if inside Cordova
		var reader = new FileReader();
		reader.onload = function(e){
			successCallback(e.target.result);
		};
		reader.onerror = errorCallback;
		reader.readAsText(file);
		//TODO: what about timeout?
	}
	//Convert file-object to arraybuffer
	function readFileAsArrayBuffer(file, successCallback, errorCallback, timeout){
		//NOTE: only works without user interaction if inside Cordova
		var reader = new FileReader();
		reader.onload = function(e){
			successCallback(e.target.result);
		};
		reader.onerror = errorCallback;
		reader.readAsArrayBuffer(file);
		//TODO: what about timeout?
	}
		
	//Download button for blobs
	Files.saveBlobAs = function(filename, blob, parentViewEle){
		if (!filename || !blob) return;
		if (navigator.msSaveBlob) return navigator.msSaveBlob(blob, filename);
		var dummyEle = parentViewEle || document.body;
		var a = document.createElement('a');
		a.style.cssText = "max-width: 0px; max-height: 0px; margin: 0; padding: 0;";
		dummyEle.appendChild(a);
		var url = window.URL.createObjectURL(blob);
		a.href = url;
		a.download = filename;
		a.click();
		setTimeout(function(){
			window.URL.revokeObjectURL(url);
			dummyEle.removeChild(a);
		}, 0);
	}

	//Create file input element
	Files.createFileInputElement = function(accept, readSuccessCallback, readErrorCallback, readAsArrayBuffer){
		var container = document.createElement("label");
		container.className = "file-input-box"
		container.textContent = SepiaFW.local.g("chooseFile");
		var fileInputEle = document.createElement("input");
		fileInputEle.type = "file";
		if (accept){
			fileInputEle.accept = accept;
		}
		fileInputEle.addEventListener("change", function(){
			var fileList = this.files;
			//console.error("Files", fileList);	//DEBUG
			if (fileList && fileList.length){
				if (readAsArrayBuffer){
					readFileAsArrayBuffer(fileList[0], readSuccessCallback, readErrorCallback);
				}else{
					readFileAsText(fileList[0], readSuccessCallback, readErrorCallback);
				}
			}
		}, false);
		container.appendChild(fileInputEle);
		return container;
	}

	//Make element a file drop zone
	Files.makeDropZone = function(dropZoneEle, readSuccessCallback, readErrorCallback){
		if (dropZoneEle){
			dropZoneEle.classList.add("file-drop-zone");
			var $fdzOverlay = $(dropZoneEle).find(".file-drop-zone-overlay");
			var fdzOverlay;
			if ($fdzOverlay.length == 0){
				fdzOverlay = document.createElement("div");
				fdzOverlay.classList.add("file-drop-zone-overlay");
				fdzOverlay.innerHTML = "<span>DROP FILE HERE</span>";
				dropZoneEle.appendChild(fdzOverlay);
			}else{
				fdzOverlay = $fdzOverlay[0];
			}
			function dropHandler(ev){
				//console.log('File drop', ev);
				ev.preventDefault();
				dropZoneEle.classList.remove("drag-active");
				var file;
				if (ev.dataTransfer.items && ev.dataTransfer.items.length){
					//get first file via 'items'
					for (var i = 0; i < ev.dataTransfer.items.length; i++){
						if (ev.dataTransfer.items[i].kind === 'file') {
							file = ev.dataTransfer.items[i].getAsFile();
							break;
						}
					}
				}else if (ev.dataTransfer.files && ev.dataTransfer.files.length){
					//get first file via 'files'
					file = ev.dataTransfer.files[0];
				}
				if (file){
					readFileAsText(file, readSuccessCallback, readErrorCallback);
				}
			}
			function dragEnter(ev){
				ev.preventDefault();
				dropZoneEle.classList.add("drag-active");
			}
			function dragLeave(ev){
				ev.preventDefault();
				dropZoneEle.classList.remove("drag-active");
			}
			dropZoneEle.addEventListener('dragenter', dragEnter);
			dropZoneEle.addEventListener('dragover', function(ev){ ev.preventDefault(); });
			fdzOverlay.addEventListener('dragover', function(ev){ ev.preventDefault(); });
			fdzOverlay.addEventListener('dragleave', dragLeave);
			fdzOverlay.addEventListener('drop', dropHandler);
		}
	}

	return Files;
}
