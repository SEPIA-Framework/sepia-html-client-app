SepiaFW.local = sepiaFW_build_strings();

function sepiaFW_build_strings(){
	var StringsDE = {};
	var StringsEN = {};
	
	//TODO: this is a crappy way of doing localizations, but for now it does its job
	
	//GERMAN
	StringsDE.welcome = 'Willkommen';
	StringsDE.help = 'Hilfe';
	StringsDE.username = 'Username';
	StringsDE.nickname = 'Spitzname';
	StringsDE.password = 'Passwort';
	StringsDE.language = 'Sprache';
	StringsDE.general = 'Allgemein';
	StringsDE.sendLogin = 'Login';
	StringsDE.sign_out = 'Abmelden';
	StringsDE.sign_out_all = 'Alle Apps abmelden';
	StringsDE.apps_admin = 'Apps verwalten';
	StringsDE.account = 'Account';
	StringsDE.addresses = 'Adressen';
	StringsDE.logout = 'Logout';
	StringsDE.closeLogin = 'Weiter ohne Login';
	StringsDE.info_and_help = 'Infos und Support';
	//StringsDE.chatInputPlaceholder = 'Deine Nachricht ...';
	StringsDE.chatInputPlaceholder = '';
	StringsDE.loginFailedPlain = 'Login fehlgeschlagen!';
	StringsDE.loginFailedServer = 'Login fehlgeschlagen! - Das Problem könnte der Server sein.';
	StringsDE.loginFailedUser = 'Login fehlgeschlagen! - Username oder Password ist falsch.';
	StringsDE.logoutAndReload = 'Diese Aktion erfordert einen Log-out und App Neustart.';
	StringsDE.noConnectionToNetwork = 'Es tut mir leid, aber sieht so aus als wärest du offline :-(';
	StringsDE.connecting = 'Verbindung wird hergestellt ...';
	StringsDE.stillConnecting = 'Versuche immer noch die Verbindung herzustellen...';
	StringsDE.noConnectionToServer = 'Es tut mir leid, aber ich konnte keine Verbindung zum Server herstellen :-(';
	StringsDE.noConnectionToAssistant = 'Dein Assistent macht gerade Kaffeepause, ist sicher gleich zurück! (hoffentlich)';
	StringsDE.noConnectionOrNoCredentials = 'Verbindung ist verloren gegangen oder die Login Daten sind abgelaufen. Du kannst warten und es noch einmal versuchen, die App neu laden oder dich erneut einloggen.';
	StringsDE.noAsrSupport = 'Es tut mir leid, aber dieser Client unterstütz die Spracherkennung leider nicht :-(';
	StringsDE.asrMissingServer = 'Mir fehlen noch Server Informationen um diese Spracherkennungsengine nutzen zu können, check noch mal die Settings bitte (ASR server).';
	StringsDE.asrSettingsProblem = 'Mikrofon nicht richtig erkannt oder Zugriff verweigert.';
	StringsDE.nobodyThere = 'Uups, es scheint zur Zeit leider keiner hier zu sein, der dir antworten könnte :-(';
	StringsDE.userNotFound = 'Uups, dieser User scheint gerade nicht hier zu sein :-(';
	StringsDE.loading = 'Lädt';
	StringsDE.oneMoment = 'Einen Moment bitte ...';
	StringsDE.doit = 'Tu es!';
	StringsDE.looksGood = 'Sieht gut aus';
	StringsDE.betterNot = 'Besser nicht';
	StringsDE.back = 'Zurück';
	StringsDE.next = 'Weiter';
	StringsDE.save = 'Speichern';
	StringsDE.tryAgain = 'Nochmal versuchen';
	StringsDE.wait = 'Warten';
	StringsDE.forget = 'Vergessen';
	StringsDE.abort = 'Abbrechen';
	StringsDE.continueOffline = 'Offline weitermachen';
	StringsDE.locateMe = 'Standort bestimmen';
	StringsDE.deviceId = 'Geräte ID';
	StringsDE.allowedToExecuteThisCommand = 'Darf ich diesen Befehl ausführen: ';
	StringsDE.copyList = 'Diese Liste gehört einem anderen User, möchtest du sie in deinen Account kopieren?';
	StringsDE.deleteItemConfirm = 'Bist du sicher, dass du das löschen möchtest?';
	StringsDE.deleteItem = 'Löschen';
	StringsDE.hideItem = 'Verstecken';
	StringsDE.addItem = 'Item hinzufügen';
	StringsDE.moveToMyView = '← MyView';
	StringsDE.alarm = 'Wecker';
	StringsDE.alarmClock = 'Wecker'; 		//name is title of UserDataList
	StringsDE.timer = 'Timer';				//name is title of UserDataList
	StringsDE.oclock = 'Uhr';
	StringsDE.expired = 'abgelaufen';
	StringsDE.missed = 'Verpasst';
	StringsDE.clearHistory = 'Verlauf löschen';
	StringsDE.reload = 'Neu laden';
	StringsDE.refreshUI = 'Interface neu laden';
	StringsDE.refreshUI_info = 'Um Änderungen, die hier gemacht wurden zu <u>sehen</u> muss das Interface neu geladen werden';
	StringsDE.lastUpdate = 'Zuletzt aktualisiert';
	StringsDE.recommendationsFor = 'Empfehlungen für';
	StringsDE.forNewcomers = 'Für Neuankömmlinge';
	StringsDE.myCustomButtons = 'Meine Aktionen';
	StringsDE.dontShowAgain = "Nicht mehr anzeigen";
	StringsDE.adrHome = 'Zu Hause';
	StringsDE.adrWork = 'Arbeit';
	StringsDE.street = 'Straße';
	StringsDE.street_nbr = 'Nr.';
	StringsDE.city = 'Stadt';
	StringsDE.zip_code = 'PLZ';
	StringsDE.country = 'Land';
	StringsDE.teach_ui_btn = 'Teach it';
	StringsDE.frames_view_btn = 'Frame öffnen';
	StringsDE.license = 'Lizenz';
	StringsDE.credits = 'Credits';
	StringsDE.data_privacy = 'Datenschutz';
	StringsDE.tutorial = 'Tutorial';
	StringsDE.way_home = 'Weg nach Hause';
	//More errors
	StringsDE.mesh_node_fail = 'Sorry, die Mesh-Node Funktion zeigte einen Fehler.';
	StringsDE.no_client_support = 'Sorry, aber diese Version der App unterstütz die aufgerufene Aktion nicht.';
	//Offline demo texts
	StringsDE.demoMode = 'Du befindest dich im Demo-Modus! In diesem Modus kannst du die Einstellungen ändern (z.B. hostname), das Tutorial anschauen und mit manchen(!) Teilen des Interfaces spielen. Um auf deinen Assistenten zuzugreifen melde dich bitte zuerst an.';
	StringsDE.notPossibleInDemoMode = 'Sorry aber das geht noch nicht im Demo-Modus.';
	StringsDE.demoModeBtn = 'Demo-Modus';
	StringsDE.myNewsDemoBtn = 'Öffne meine persönlichen News';
	StringsDE.myRadioDemoBtn = 'Starte mein Lieblingsradio';
	StringsDE.myToDoDemoBtn = 'Öffne meine To-Do Liste';
	
	//ENGLISH
	StringsEN.welcome = 'Welcome';
	StringsEN.help = 'Help';
	StringsEN.username = 'Username';
	StringsEN.nickname = 'Nickname';
	StringsEN.password = 'Password';
	StringsEN.language = 'Language';
	StringsEN.general = 'General';
	StringsEN.sendLogin = 'Login';
	StringsEN.sign_out = 'Sign out';
	StringsEN.sign_out_all = 'Sign out all apps';
	StringsEN.apps_admin = 'Manage apps';
	StringsEN.account = 'Account';
	StringsEN.addresses = 'Addresses';
	StringsEN.logout = 'Logout';
	StringsEN.closeLogin = 'Continue without login';
	StringsEN.info_and_help = 'Info and support';
	//StringsEN.chatInputPlaceholder = 'Your message ...';
	StringsEN.chatInputPlaceholder = '';
	StringsEN.loginFailedPlain = 'Login failed!';
	StringsEN.loginFailedServer = 'Login failed! - Problem could be the server.';
	StringsEN.loginFailedUser = 'Login failed! - Wrong username or password.';
	StringsEN.logoutAndReload = 'This action requires a log-out and app reload.';
	StringsEN.noConnectionToNetwork = 'I\'m sorry but it seems that you are offline :-(';
	StringsEN.connecting = 'Connecting ...';
	StringsEN.stillConnecting = 'Still trying to connect ...';
	StringsEN.noConnectionToServer = 'I\'m sorry but I could not establish a connection to the server :-(';
	StringsEN.noConnectionToAssistant = 'Your assistant is taking a coffee break, will be right back! (hopefully)';
	StringsEN.noConnectionOrNoCredentials = 'Connection was lost or credentials became invalid. You can wait and try it again, reload the app or login again.';
	StringsEN.noAsrSupport = 'I\'m sorry but this client does not support speech recognition :-(';
	StringsEN.asrMissingServer = 'I\'m missing some server info to user this speech recognition engine, please check the settings again (ASR server).';
	StringsEN.asrSettingsProblem = 'Microphone has not been recognized properly or access was denied.';
	StringsEN.nobodyThere = 'Uups, sorry but it seems there is nobody here to answer your message :-(';
	StringsEN.userNotFound = 'Uups, this user seems to be not available right now :-(';
	StringsEN.loading = 'Loading';
	StringsEN.oneMoment = 'One moment please ...';
	StringsEN.doit = 'Do it!';
	StringsEN.looksGood = 'Looks good';
	StringsEN.betterNot = 'Better not';
	StringsEN.back = 'Back';
	StringsEN.next = 'Next';
	StringsEN.save = 'Save';
	StringsEN.tryAgain = 'Try again';
	StringsEN.wait = 'Wait';
	StringsEN.forget = 'Forget';
	StringsEN.abort = 'Abort';
	StringsEN.continueOffline = 'Continue offline';
	StringsEN.locateMe = 'Refresh my location';
	StringsEN.deviceId = 'Device ID';
	StringsEN.allowedToExecuteThisCommand = 'Am I allowed to send this request: ';
	StringsEN.copyList = 'This list belongs to another user, do you want to copy it to your account?';
	StringsEN.deleteItemConfirm = 'Are you sure you want to delete this?';
	StringsEN.deleteItem = 'Delete';
	StringsEN.hideItem = 'Hide';
	StringsEN.addItem = 'Add item';
	StringsEN.moveToMyView = '← MyView';
	StringsEN.alarm = 'Alarm';
	StringsEN.alarmClock = 'Alarm';		//name is title of UserDataList
	StringsEN.timer = 'Timer';			//name is title of UserDataList
	StringsEN.oclock = 'o\'clock';
	StringsEN.expired = 'expired';
	StringsEN.missed = 'Missed';
	StringsEN.clearHistory = 'Clear history';
	StringsEN.reload = 'Reload';
	StringsEN.refreshUI = 'Refresh interface';
	StringsEN.refreshUI_info = 'To <u>see</u> changes you made here you need to refresh the interface';
	StringsEN.lastUpdate = 'Last update';
	StringsEN.recommendationsFor = 'Recommendations for';
	StringsEN.forNewcomers = 'For newcomers';
	StringsEN.myCustomButtons = 'My actions';
	StringsEN.dontShowAgain = "Don't show again";
	StringsEN.adrHome = 'Home';
	StringsEN.adrWork = 'Work';
	StringsEN.street = 'Street';
	StringsEN.street_nbr = 'Nbr.';
	StringsEN.city = 'City';
	StringsEN.zip_code = 'Zip';
	StringsEN.country = 'Country';
	StringsEN.teach_ui_btn = 'Teach it';
	StringsEN.frames_view_btn = 'Open frame';
	StringsEN.license = 'License';
	StringsEN.credits = 'Credits';
	StringsEN.data_privacy = 'Data privacy';
	StringsEN.tutorial = 'Tutorial';
	StringsEN.way_home = 'Way home';
	//More errors
	StringsEN.mesh_node_fail = 'Sorry, the Mesh-Node function showed an error.';
	StringsEN.no_client_support = 'Sorry, but this version of the app does not support the requested action.';
	//Offline demo texts
	StringsEN.demoMode = 'You are in demo-mode! This mode only allows you to change settings (e.g. hostname), check out the tutorial and play with some(!) parts of the UI. To get access to your assistant please log-in first.';
	StringsEN.notPossibleInDemoMode = 'Sorry this is not yet possible in demo-mode.';
	StringsEN.demoModeBtn = 'Demo-Mode';
	StringsEN.myNewsDemoBtn = 'Open my personal news';
	StringsEN.myRadioDemoBtn = 'Start my favorite radio station';
	StringsEN.myToDoDemoBtn = 'Open my to-do list';

	//--------------------------------------------------------
	
	var StringsLocale = {};
	if (SepiaFW.config.appLanguage.toLowerCase() === "de"){
		StringsLocale = StringsDE;
	}else{
		StringsLocale = StringsEN;
	}
	
	//get string
	StringsLocale.g = function(name){
		return StringsLocale[name];
	}
	
	//write string
	StringsLocale.w = function(name){
		document.write(StringsLocale[name]);
	}
	
	return StringsLocale;
}