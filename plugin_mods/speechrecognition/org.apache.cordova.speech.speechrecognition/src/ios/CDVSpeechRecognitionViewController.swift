/*
 Copyright (C) 2016 SOHKAKUDO Ltd. All Rights Reserved.
 See LICENSE.txt for this Plugin’s licensing information
 */
/*
 Copyright (C) 2016 Apple Inc. All Rights Reserved.
 See LICENSE.txt for this sample’s licensing information

 Abstract:
 The primary view controller. The speach-to-text engine is managed an configured here.
 */

import UIKit
import Speech
import AVFoundation
import AudioToolbox

protocol SpeechRecognitionDelegate {
    func timeOut()
    func returnResult(statusIsOK: Bool, returnString: String, messageType: String)
}

public class CDVSpeechRecognitionViewController: UIViewController, SFSpeechRecognizerDelegate, AVAudioPlayerDelegate {

    // MARK: Properties

    /** [API Reference] https://developer.apple.com/reference/speech/sfspeechrecognizer
     The Locale setting is based on setting of iOS.
     */
    private var speechRecognizer = SFSpeechRecognizer()!

    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?

    private var recognitionTask: SFSpeechRecognitionTask?

    private let audioEngine = AVAudioEngine()

    private var player: AVAudioPlayer?

    private var recognizedText = ""

    private var recognitionLimiter: Timer?

    private var initRecognitionLimitSec: Int = 5

    private var secRecognitionLimitSec: Int = 3

    private var initStart: Bool = true

    private var micOpenDest: String = ""

    private var micCloseDest: String = ""

    private var status: String = ""

    internal var delegate: SpeechRecognitionDelegate?

    required public init(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)!
        setup()
    }

    override init(nibName nibNameOrNil: String!, bundle nibBundleOrNil: Bundle!) {
        super.init(nibName: nil, bundle: nil)
        setup()
    }

    convenience init() {
        self.init(nibName: nil, bundle: nil)
    }

    func setup() {
        //NSLog("-----------> SWIFT HERE SETUP <-------------")
        speechRecognizer.delegate = self
        SFSpeechRecognizer.requestAuthorization { authStatus in
            OperationQueue.main.addOperation {
                switch authStatus {
                case .authorized:
                    self.status = "authorized"
                    NSLog("Swift ASR status: access is authorized")
                case .denied:
                    self.status = "denied"
                    //NSLog("-----------> status: ASR access is denied <-------------")
                case .restricted:
                    self.status = "restricted"
                    //NSLog("-----------> status: ASR access is restricted <-------------")
                case .notDetermined:
                    self.status = "notDetermined"
                    //NSLog("-----------> status: ASR access is notDeterminded <-------------")
                }
            }
        }
    }

    /**
     Set Recognition time limitation.
     - parameter v: Specifies the amount of time that the upper limit (in seconds)
     */
    public func setRequiredVariables(micO : String, micC : String) -> Void {
        self.micOpenDest = "www/" + micO

        self.micCloseDest = "www/" + micC
    }

    /**
     Plugin Status.
     - return This Plugin's Status: true -> Plugin is Enable, false -> Plugin is Disabled.
     */
    public func isEnabled() -> Bool {
        if (self.status == ""){
            NSLog("Swift ASR status is UNKNOWN (not set yet)")
        }
        return (self.status == "authorized")
    }

    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        /*
        let openURL = Bundle.main.url(forAuxiliaryExecutable: self.micOpenDest)!
        if player.url == openURL {
            try? startRecording()
        }
        */
    }

    private func playMicSoundOn() {
        let url = Bundle.main.url(forAuxiliaryExecutable: self.micOpenDest)!
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(AVAudioSessionCategoryPlayback)

			if #available(iOS 9, *) {
				try audioSession.setMode(AVAudioSessionModeSpokenAudio)
			}

            try audioSession.setActive(true, with: .notifyOthersOnDeactivation)

            player = try AVAudioPlayer(contentsOf: url)
            guard let player = player else { return }
            player.delegate = self

            player.prepareToPlay()
            player.play()
        } catch let error {
            print(error.localizedDescription)
        }
    }

    private func playMicSoundOff() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(AVAudioSessionCategoryPlayback)
			if #available(iOS 9, *) {
            	try audioSession.setMode(AVAudioSessionModeSpokenAudio)
			}
            try audioSession.setActive(true, with: .notifyOthersOnDeactivation)

            /*
            let url = Bundle.main.url(forAuxiliaryExecutable: self.micCloseDest)!
            player = try AVAudioPlayer(contentsOf: url)
            guard let player = player else { return }
            player.delegate = self

            player.prepareToPlay()
            player.play()
            */
        } catch let error {
            print(error.localizedDescription)
        }
    }

    private func startVibration(startV: Bool) {
        /*
        if(startV == true) {
            AudioServicesPlaySystemSound(1521) //triple
        } else {
            AudioServicesPlaySystemSound(1519) //single
        }
        */
    }

    private func startRecording() throws {
        //NSLog("-----------> SWIFT HERE1 <-------------")
        // Cancel the previous task if it's running.
        if let recognitionTask = recognitionTask {
            recognitionTask.cancel()
            self.recognitionTask = nil
        }
        startVibration(startV: true)

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(AVAudioSessionCategoryRecord)
        try audioSession.setMode(AVAudioSessionModeMeasurement)
        try audioSession.setActive(true, with: .notifyOthersOnDeactivation)

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()

        guard let inputNode = audioEngine.inputNode else { fatalError("Audio engine has no input node") }

        guard let recognitionRequest = recognitionRequest else { fatalError("Unable to created a SFSpeechAudioBufferRecognitionRequest object") }

        // Configure request so that results are returned before audio recording is finished
        recognitionRequest.shouldReportPartialResults = true

        // A recognition task represents a speech recognition session.
        // We keep a reference to the task so that it can be cancelled.
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest, resultHandler: { (result, error) in
            var isFinal = false

            if let result = result {
                self.recognizedText =  result.bestTranscription.formattedString
                self.delegate?.returnResult(statusIsOK: true, returnString: self.recognizedText, messageType: "partialResult")
                isFinal = result.isFinal
            }

            if error == nil && isFinal {
                self.delegate?.returnResult(statusIsOK: true, returnString: self.recognizedText, messageType: "result")
            }

            if error != nil || isFinal {
                self.delegate?.returnResult(statusIsOK: true, returnString: "", messageType: "speechend")
                self.delegate?.returnResult(statusIsOK: true, returnString: "", messageType: "end")
                self.audioEngine.stop()
                self.recognitionRequest?.endAudio()
                inputNode.removeTap(onBus: 0)
                self.recognitionRequest = nil
                self.recognitionTask = nil
                self.startVibration(startV: false)
                self.playMicSoundOff() // need it to set the audio session back to Playback
            } else {
                self.restartTimer()
            }
        })
        self.startTimer()

        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { (buffer: AVAudioPCMBuffer, when: AVAudioTime) in
            self.recognitionRequest?.append(buffer)
        }
        self.delegate?.returnResult(statusIsOK: true, returnString: "", messageType: "speechstart")
        audioEngine.prepare()
        try audioEngine.start()
    }

    // MARK: SFSpeechRecognizerDelegate
    public func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        if available {

        } else {
            InterruptEvent()
        }
    }

    // MARK: Interface Builder actions

    public func recordButtonTapped(language: String) -> String {
        speechRecognizer = SFSpeechRecognizer(locale: Locale.init(identifier: language))!  //1
        var ret = ""
        if audioEngine.isRunning {
            audioEngine.stop()
            recognitionRequest?.endAudio()
//            playMicSoundOff()
            ret = self.recognizedText
            self.stopTimer()
        } else {
            self.recognizedText = ""
            self.delegate?.returnResult(statusIsOK: true, returnString: "", messageType: "start")
            try! startRecording()
//            try! playMicSoundOn()
            ret = "recognizeNow"
        }
        return ret
    }

    func startTimer() {
        var timer = 0
        if initStart == true {
            initStart = false
            timer = self.initRecognitionLimitSec
        } else {
            timer = self.secRecognitionLimitSec
        }
        recognitionLimiter = nil
        recognitionLimiter = Timer.scheduledTimer(timeInterval: TimeInterval(timer),
                                                  target: self,
                                                  selector:#selector(InterruptEvent),
                                                  userInfo: nil,
                                                  repeats: false
        )
    }
    func restartTimer() {
        stopTimer()
        startTimer()
    }
    func stopTimer() {
        if recognitionLimiter != nil {
            recognitionLimiter?.invalidate(); recognitionLimiter = nil
        }
    }

    func InterruptEvent() {
        if audioEngine.isRunning {
            audioEngine.stop()
            recognitionRequest?.endAudio()
//            playMicSoundOff()
        }
        recognitionLimiter = nil
    }
}
