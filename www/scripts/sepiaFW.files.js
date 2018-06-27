//Files
function sepiaFW_build_files(){
	var Files = {};
	
	//Read file and decide for yourself if it's remote or local
	Files.fetch = function(fileUrl, successCallback, errorCallback){
		if(fileUrl.indexOf("http") == 0){
			Files.fetchRemote(fileUrl, successCallback, errorCallback);
		}else{
			Files.fetchLocal(fileUrl, successCallback, errorCallback);
		}
	}
	
	//Read file from remote source as text
	Files.fetchRemote = function(fileUrl, successCallback, errorCallback){
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
	
	//Read file from local drive as text
	Files.fetchLocal = function(fileUrl, successCallback, errorCallback){
		if (!errorCallback) errorCallback = function(){};
		
		//via Cordova
		if (SepiaFW.ui.isCordova && cordova.file){
			var path = cordova.file.applicationDirectory + "www/" + fileUrl;
            window.resolveLocalFileSystemURL(path, function (entry){
				entry.file(
					function(file){
						readFileAsText(file, successCallback, errorCallback);
					}, 
					errorCallback
				);
            }, errorCallback);
		
		//via jQuery GET
		}else{
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
		
	return Files;
}
