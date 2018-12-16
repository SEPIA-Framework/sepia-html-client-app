//Files
function sepiaFW_build_files(){
	var Files = {};
	
	//Read file and decide for yourself if it's remote or local
	Files.fetch = function(fileUrl, successCallback, errorCallback, responseType){
		if(fileUrl.indexOf("http") == 0){
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
		
		//via Cordova local filesystem
		if (SepiaFW.ui.isCordova && cordova.file){
			//var path = cordova.file.applicationDirectory + "www/" + fileUrl;
            var path = fileUrl;
            if (fileUrl.indexOf(cordova.file.applicationDirectory) < 0){
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
		request.onload = function(e) {
			successCallback(request.response); 	//the arraybuffer is in request.response
		};
		request.onerror = function(e) {
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
