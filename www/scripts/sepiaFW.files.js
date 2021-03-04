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
	Files.fetch = function(fileUrl, successCallback, errorCallback, responseType){
		if(fileUrl.indexOf("http:") == 0 || fileUrl.indexOf("https:") == 0 || fileUrl.indexOf("ftp:") == 0){
			Files.fetchRemote(fileUrl, successCallback, errorCallback, responseType);
		}else{
			Files.fetchLocal(fileUrl, successCallback, errorCallback, responseType);
		}
	}
	
	//Read file from remote source as text or a binary type
	Files.fetchRemote = function(fileUrl, successCallback, errorCallback, responseType){
		if (responseType && responseType == "arraybuffer"){
			//ArrayBuffer
			xmlHttpCallForArrayBuffer(fileUrl, successCallback, errorCallback);
		}else{
			//Default response type: string
			ajaxCallForText(fileUrl, successCallback, errorCallback);
		}
	}
	
	//Read file from local drive as text or a binary type
	Files.fetchLocal = function(fileUrl, successCallback, errorCallback, responseType){
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
            window.resolveLocalFileSystemURL(path, function (entry){
				entry.file(
					function(file){
						if (responseType && responseType == "arraybuffer"){
							//ArrayBuffer
							readFileAsArrayBuffer(file, successCallback, errorCallback); 		//NOTE: untested
						}else{
							//Default response type: string
							readFileAsText(file, successCallback, errorCallback);
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
				xmlHttpCallForArrayBuffer(fileUrl, successCallback, errorCallback);
			}else{
				//Default response type: string
				ajaxCallForText(fileUrl, successCallback, errorCallback);
			}
		}
	}

	//HTTP GET based requests
	function ajaxCallForText(fileUrl, successCallback, errorCallback){
		$.ajax({
			url: fileUrl,
			timeout: 8000,
			method: "GET",
			success: function(data) {
				successCallback(data);
			},
			error: function(data) {
				errorCallback(data);
			}
		});
	}
	function xmlHttpCallForArrayBuffer(fileUrl, successCallback, errorCallback){
		var request = new XMLHttpRequest();
		request.open('GET', fileUrl);
		request.responseType = 'arraybuffer';
		request.timeout = 8000;
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
		request.send();
	}
	
	//Convert file-object to text
	function readFileAsText(file, successCallback, errorCallback){
		var reader = new FileReader();
		reader.onload = function(e){
			successCallback(e.target.result);
		};
		reader.onerror = errorCallback;
		reader.readAsText(file);
	}
	//Convert file-object to arraybuffer
	function readFileAsArrayBuffer(file, successCallback, errorCallback){
		var reader = new FileReader();
		reader.onload = function(e){
			successCallback(e.target.result);
		};
		reader.onerror = errorCallback;
		reader.readAsArrayBuffer(file);
	}
		
	return Files;
}
