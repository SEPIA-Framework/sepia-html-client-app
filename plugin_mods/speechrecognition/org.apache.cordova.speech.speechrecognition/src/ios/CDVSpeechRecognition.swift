/**
 # Cordova Plugin Speech Recognition for iOS.
 Add the voice recognition function to the application using the Siri API.
 
 Target OS Version : iOS(ver 10.0 or Higher)
 
 copyright (C) 2016 SOHKAKUDO Ltd. All Rights Reserved.
 */
@objc(CDVSpeechRecognition) class SpeechRecognition : CDVPlugin, SpeechRecognitionDelegate {
    
    private var srvc : CDVSpeechRecognitionViewController = CDVSpeechRecognitionViewController()
    private var enabled: Bool = false
    private var thisCommand: CDVInvokedUrlCommand = CDVInvokedUrlCommand()
    
    func initialize(_ command: CDVInvokedUrlCommand) {
        super.pluginInitialize()
        srvc = CDVSpeechRecognitionViewController()
        srvc.delegate = self
    }
    
    func start(_ command: CDVInvokedUrlCommand) {
        thisCommand = command
        if(srvc.isEnabled()) {
            let lang = command.argument(at: 0) as! String
            if(lang is String == false) {
                returnResult(statusIsOK: false, returnString: "langIsNotString", messageType: "error")
                return
            }
            let micOpenDest = command.argument(at: 1)
            if(micOpenDest is String == false) {
                returnResult(statusIsOK: false, returnString: "micOpenDestIsNotString", messageType: "error")
                return
            }
            let micCloseDest = command.argument(at: 2)
            if(micCloseDest is String == false) {
                returnResult(statusIsOK: false, returnString: "micCloseDestIsNotString", messageType: "error")
                return
            }
            
            srvc.setRequiredVariables(micO: micOpenDest as! String, micC: micCloseDest as! String)
            srvc.recordButtonTapped(language: lang)
        } else {
            returnResult(statusIsOK: false, returnString: "pluginIsDisabled", messageType: "error")
        }
    }
    
    func stop(_ command: CDVInvokedUrlCommand) {
        srvc.InterruptEvent()
    }
    
    /** SpeechRecognizer time up Handler. */
    func timeOut() {
        returnResult(statusIsOK: false, returnString: "timeOut", messageType: "error")
    }
    
    /** returns the result to the calling app. */
    func returnResult(statusIsOK: Bool, returnString: String, messageType: String) -> Void {
        let sendStatus = statusIsOK ? CDVCommandStatus_OK : CDVCommandStatus_ERROR
        let event = ["type": messageType, "message": returnString]
        let result = CDVPluginResult(status: sendStatus, messageAs: event)
        result!.setKeepCallbackAs(true);
        self.commandDelegate!.send(result, callbackId:thisCommand.callbackId)
    }
}