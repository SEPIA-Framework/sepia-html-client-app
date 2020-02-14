SepiaFW.local = sepiaFW_build_strings();

function sepiaFW_build_strings(){
	var StringsDE = {};
	var StringsEN = {};
	
	//TODO: this is a crappy way of doing localizations, but for now it does its job
	
	//GERMAN
	StringsDE.welcome = 'Willkommen';
	StringsDE.help = 'Hilfe';
	StringsDE.ok = 'Ok';
	StringsDE.more = 'Mehr';
	StringsDE.username = 'Username';
	StringsDE.nickname = 'Spitzname';
	StringsDE.password = 'Passwort';
	StringsDE.language = 'Sprache';
	StringsDE.preferred_temp_unit = 'Einheit der Temperatur';
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
	StringsDE.control_hub = 'Control HUB';
	StringsDE.tutorial = 'Tutorial';
	StringsDE.change_account_password = "Account Passwort ändern";
	StringsDE.channels = "Kanäle";
	StringsDE.active_users = "Aktive User";
	StringsDE.edit_chat_channels = "Kanäle bearbeiten";
	StringsDE.invite_user = "User einladen";
	StringsDE.invite = "Einladen";
	//StringsDE.chatInputPlaceholder = 'Deine Nachricht ...';
	StringsDE.chatInputPlaceholder = '';
	StringsDE.loginFailedPlain = 'Login fehlgeschlagen!';
	StringsDE.loginFailedServer = 'Login fehlgeschlagen! - Das Problem könnte der Server sein.';
	StringsDE.loginFailedUser = 'Login fehlgeschlagen! - Username oder Password ist falsch.';
	StringsDE.loginFailedBlocked = 'Login fehlgeschlagen! - Zu viele fehlgeschlagene Versuche. Bitte etwas warten.';
	StringsDE.logoutAndReload = 'Diese Aktion erfordert einen Log-out und App Neustart.';
	StringsDE.noConnectionToNetwork = 'Es tut mir leid, aber sieht so aus als wärest du offline :-(';
	StringsDE.connecting = 'Verbindung wird hergestellt ...';
	StringsDE.stillConnecting = 'Versuche immer noch die Verbindung herzustellen...';
	StringsDE.noConnectionToServer = 'Es tut mir leid, aber ich konnte keine Verbindung zum Server herstellen :-(';
	StringsDE.noConnectionToAssistant = 'Dein Assistent macht gerade Kaffeepause, ist sicher gleich zurück! (hoffentlich)';
	StringsDE.noConnectionOrNoCredentials = 'Verbindung ist verloren gegangen oder die Login Daten sind abgelaufen. Du kannst warten und es noch einmal versuchen, die App neu laden oder dich erneut einloggen.';
	StringsDE.messageLost = 'Die letzte Nachricht konnte nicht zugestellt werden';
	StringsDE.noAsrSupport = 'Es tut mir leid, aber dieser Client unterstütz die Spracherkennung leider nicht :-(';
	StringsDE.asrMissingServer = 'Mir fehlen noch Server Informationen um diese Spracherkennungsengine nutzen zu können, check noch mal die Settings bitte (ASR server).';
	StringsDE.asrSettingsProblem = 'Mikrofon nicht richtig erkannt oder Zugriff verweigert.';
	StringsDE.nobodyThere = 'Uups, es scheint zur Zeit leider keiner hier zu sein, der dir antworten könnte :-(';
	StringsDE.userNotFound = 'Uups, dieser User scheint gerade nicht hier zu sein :-(';
	StringsDE.loading = 'Lädt';
	StringsDE.oneMoment = 'Einen Moment bitte ...';
	StringsDE.done = 'Erledigt';
	StringsDE.doit = 'Tu es!';
	StringsDE.looksGood = 'Sieht gut aus';
	StringsDE.betterNot = 'Besser nicht';
	StringsDE.back = 'Zurück';
	StringsDE.next = 'Weiter';
	StringsDE.save = 'Speichern';
	StringsDE.store = 'Speichern';
	StringsDE.load = 'Laden';
	StringsDE.edit = 'Bearbeiten';
	StringsDE.copy = 'Kopieren';
	StringsDE.show = 'Anzeigen';
	StringsDE.new = 'Neu';
	StringsDE.tryAgain = 'Nochmal versuchen';
	StringsDE.tryReconnect = 'Neu verbinden';
	StringsDE.wait = 'Warten';
	StringsDE.forget = 'Vergessen';
	StringsDE.abort = 'Abbrechen';
	StringsDE.continueOffline = 'Offline weitermachen';
	StringsDE.locateMe = 'Standort bestimmen';
	StringsDE.serverConnections = 'Server Verbindungen';
	StringsDE.deviceId = 'Geräte ID';
	StringsDE.deviceSite = 'Gerätestandort';
	StringsDE.allowedToExecuteThisCommand = 'Darf ich diesen Befehl ausführen: ';
	StringsDE.copyList = 'Diese Liste gehört einem anderen User, möchtest du sie in deinen Account kopieren?';
	StringsDE.cantCopyList = 'Diese Liste gehört einem anderen User und kann nicht gespeichert werden, aber du kannst eventuell einzelne Einträge via share-Funktion kopieren.';
	StringsDE.deleteItemConfirm = 'Bist du sicher, dass du das löschen möchtest?';
	StringsDE.deleteItem = 'Löschen';
	StringsDE.hideItem = 'Verstecken';
	StringsDE.addItem = 'Item hinzufügen';
	StringsDE.moveToMyView = '← MyView';
	StringsDE.exportToCalendar = '<i class="material-icons md-inherit">share</i>&nbsp;Kalender';
	StringsDE.exportToAlarms = '<i class="material-icons md-inherit">share</i>&nbsp;Alarm</i>';
	StringsDE.exportToUrl = '<i class="material-icons md-inherit">share</i>&nbsp;Link</i>';
	StringsDE.copyUrl = '<i class="material-icons md-inherit">link</i>&nbsp;Kopieren</i>';
	StringsDE.alarm = 'Wecker';
	StringsDE.alarmClock = 'Wecker'; 		//name is title of UserDataList
	StringsDE.timer = 'Timer';				//name is title of UserDataList
	StringsDE.oclock = 'Uhr';
	StringsDE.expired = 'abgelaufen';
	StringsDE.missed = 'Verpasst';
	StringsDE.clearHistory = 'Verlauf löschen';
	StringsDE.history = 'Verlauf';
	StringsDE.newMessages = 'Neue Nachrichten';
	StringsDE.reload = 'Neu laden';
	StringsDE.refreshUI = 'Interface neu laden';
	StringsDE.refreshUI_info = 'Um Änderungen, die hier gemacht wurden zu <u>sehen</u> muss das Interface neu geladen werden';
	StringsDE.newSepiaWindow = 'Neues SEPIA Fenster';
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
	StringsDE.way_home = 'Weg nach Hause';
	//Fill words
	StringsDE.from = 'von';
	StringsDE.atClock = 'um';
	//More errors
	StringsDE.serverVersionTooLow = 'Beachte: Deine SEPIA Server Version ist niedrig und manche Features des Clients funktionieren eventuell nicht wie erwartet. Bitte führe ein Server Update durch, wenn möglich!';
	StringsDE.mesh_node_fail = 'Sorry, die Mesh-Node Funktion zeigte einen Fehler.';
	StringsDE.no_client_support = 'Sorry, aber diese Version der App unterstütz die aufgerufene Aktion nicht.';
	StringsDE.cant_execute = "Sorry, aber es sieht so aus als könnte ich diese Aktion nicht ausführen.";
	StringsDE.tried_but_not_sure = "Hab's versucht aber bin nicht sicher ob es geklappt hat.";
	StringsDE.result_unclear = "Das Ergebnis der folgenden Anfrage ist unklar.";
	StringsDE.possible_reason_origin_unsecure = "Mögliche Ursache: Unsicherer Ursprung (SSL Zertifikat)";
	//Service and action texts
	StringsDE.opening_link = "Link wird geöffnet.";
	StringsDE.no_music_playing = "Kannst du was hören? Wahrscheinlich wurde keine Musik gefunden.";
	//Link sharing
	StringsDE.link_join_channel = "Einem Chat-Kanal beitreten."
	StringsDE.link_open_url = "Einen Link öffnen."
	StringsDE.link_create_reminder = "Eine Erinnerung einrichten."
	//Offline demo texts
	StringsDE.demoMode = 'Du befindest dich im Demo-Modus! In diesem Modus kannst du die Einstellungen ändern (z.B. hostname), das Tutorial anschauen und mit manchen(!) Teilen des Interfaces spielen. Um auf deinen Assistenten zuzugreifen melde dich bitte zuerst an.';
	StringsDE.notPossibleInDemoMode = 'Sorry aber das geht noch nicht im Demo-Modus.';
	StringsDE.demoModeBtn = 'Demo-Modus';
	StringsDE.myNewsDemoBtn = 'Öffne meine persönlichen News';
	StringsDE.myRadioDemoBtn = 'Starte mein Lieblingsradio';
	StringsDE.myToDoDemoBtn = 'Öffne meine To-Do Liste';
	//Connection status
	StringsDE.status_connecting = "Wird verbunden...";
	StringsDE.status_opened = "Online";
	StringsDE.status_closed = "Offline";
	StringsDE.status_error = "Error";
	//Teach-UI
	StringsDE.command = 'Befehl';
	StringsDE.chooseCommand = 'Bitte wähle einen Befehl.';
	//Channels
	StringsDE.createdChannel = 'Neuer Kanal wurde erfolgreich erstellt';
	StringsDE.joinedChannel = 'Du bist erfolgreich einem neuen Kanal beigetreten';
	StringsDE.deletedChannel = 'Der Kanal wurde erfolgreich gelöscht';
	
	//ENGLISH
	StringsEN.welcome = 'Welcome';
	StringsEN.help = 'Help';
	StringsEN.ok = 'Ok';
	StringsEN.more = 'More';
	StringsEN.username = 'Username';
	StringsEN.nickname = 'Nickname';
	StringsEN.password = 'Password';
	StringsEN.language = 'Language';
	StringsEN.preferred_temp_unit = 'Unit of Temperature';
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
	StringsEN.control_hub = 'Control HUB';
	StringsEN.tutorial = 'Tutorial';
	StringsEN.change_account_password = "Change account password";
	StringsEN.channels = "Channels";
	StringsEN.active_users = "Active Users";
	StringsEN.edit_chat_channels = "Edit Channels";
	StringsEN.invite_user = "Invite User";
	StringsEN.invite = "Invite";
	//StringsEN.chatInputPlaceholder = 'Your message ...';
	StringsEN.chatInputPlaceholder = '';
	StringsEN.loginFailedPlain = 'Login failed!';
	StringsEN.loginFailedServer = 'Login failed! - Problem could be the server.';
	StringsEN.loginFailedUser = 'Login failed! - Wrong username or password.';
	StringsEN.loginFailedBlocked = 'Login failed! - Too many failed attempts. Please wait a bit.';
	StringsEN.logoutAndReload = 'This action requires a log-out and app reload.';
	StringsEN.noConnectionToNetwork = 'I\'m sorry but it seems that you are offline :-(';
	StringsEN.connecting = 'Connecting ...';
	StringsEN.stillConnecting = 'Still trying to connect ...';
	StringsEN.noConnectionToServer = 'I\'m sorry but I could not establish a connection to the server :-(';
	StringsEN.noConnectionToAssistant = 'Your assistant is taking a coffee break, will be right back! (hopefully)';
	StringsEN.noConnectionOrNoCredentials = 'Connection was lost or credentials became invalid. You can wait and try it again, reload the app or login again.';
	StringsEN.messageLost = 'The last message could not be delivered';
	StringsEN.noAsrSupport = 'I\'m sorry but this client does not support speech recognition :-(';
	StringsEN.asrMissingServer = 'I\'m missing some server info to use this speech recognition engine, please check the settings again (ASR server).';
	StringsEN.asrSettingsProblem = 'Microphone has not been recognized properly or access was denied.';
	StringsEN.nobodyThere = 'Uups, sorry but it seems there is nobody here to answer your message :-(';
	StringsEN.userNotFound = 'Uups, this user seems to be not available right now :-(';
	StringsEN.loading = 'Loading';
	StringsEN.oneMoment = 'One moment please ...';
	StringsEN.done = 'Done';
	StringsEN.doit = 'Do it!';
	StringsEN.looksGood = 'Looks good';
	StringsEN.betterNot = 'Better not';
	StringsEN.back = 'Back';
	StringsEN.next = 'Next';
	StringsEN.save = 'Save';
	StringsEN.store = 'Store';
	StringsEN.load = 'Load';
	StringsEN.edit = 'Edit';
	StringsEN.copy = 'Copy';
	StringsEN.show = 'Show';
	StringsEN.new = 'New';
	StringsEN.tryAgain = 'Try again';
	StringsEN.tryReconnect = 'Try reconnect';
	StringsEN.wait = 'Wait';
	StringsEN.forget = 'Forget';
	StringsEN.abort = 'Abort';
	StringsEN.continueOffline = 'Continue offline';
	StringsEN.locateMe = 'Refresh my location';
	StringsEN.serverConnections = 'Server connections';
	StringsEN.deviceId = 'Device ID';
	StringsEN.deviceSite = 'Device site';
	StringsEN.allowedToExecuteThisCommand = 'Am I allowed to send this request: ';
	StringsEN.copyList = 'This list belongs to another user, do you want to copy it to your account?';
	StringsEN.cantCopyList = 'This list belongs to another user and cannot be stored, but you might be able to copy single items with the share function.';
	StringsEN.deleteItemConfirm = 'Are you sure you want to delete this?';
	StringsEN.deleteItem = 'Delete';
	StringsEN.hideItem = 'Hide';
	StringsEN.addItem = 'Add item';
	StringsEN.moveToMyView = '← MyView';
	StringsEN.exportToCalendar = '<i class="material-icons md-inherit">share</i>&nbsp;Calendar';
	StringsEN.exportToAlarms = '<i class="material-icons md-inherit">share</i>&nbsp;Alarm</i>';
	StringsEN.exportToUrl = '<i class="material-icons md-inherit">share</i>&nbsp;Link</i>';
	StringsEN.copyUrl = '<i class="material-icons md-inherit">link</i>&nbsp;Copy</i>';
	StringsEN.alarm = 'Alarm';
	StringsEN.alarmClock = 'Alarm';		//name is title of UserDataList
	StringsEN.timer = 'Timer';			//name is title of UserDataList
	StringsEN.oclock = 'o\'clock';
	StringsEN.expired = 'expired';
	StringsEN.missed = 'Missed';
	StringsEN.clearHistory = 'Clear history';
	StringsEN.history = 'History';
	StringsEN.newMessages = "New messages";
	StringsEN.reload = 'Reload';
	StringsEN.refreshUI = 'Refresh interface';
	StringsEN.refreshUI_info = 'To <u>see</u> changes you made here you need to refresh the interface';
	StringsEN.newSepiaWindow = 'New SEPIA window';
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
	StringsEN.way_home = 'Way home';
	//Fill words
	StringsEN.from = 'from';
	StringsEN.atClock = 'at';
	//More errors
	StringsEN.serverVersionTooLow = 'Note: Your SEPIA server version is low and some features of the client might not work as expected. Please update the server when possible!';
	StringsEN.mesh_node_fail = 'Sorry, the Mesh-Node function showed an error.';
	StringsEN.no_client_support = 'Sorry, but this version of the app does not support the requested action.';
	StringsEN.cant_execute = "Sorry, but it seems I can't execute the requested action.";
	StringsEN.tried_but_not_sure = "I've tried but I'm not sure if it worked.";
	StringsEN.result_unclear = "The result of the following request is unclear.";
	StringsEN.possible_reason_origin_unsecure = "Possible reason: Unsecure origin (SSL certificate)";
	//Service and action texts
	StringsEN.opening_link = "Opening link.";
	StringsEN.no_music_playing = "Can you hear something? Probably no music found.";
	StringsEN.no_music_playing = "Can you hear something? Probably no music found.";
	//Link sharing
	StringsEN.link_join_channel = "Join a chat-channel."
	StringsEN.link_open_url = "Open a link."
	StringsEN.link_create_reminder = "Create a reminder."
	//Offline demo texts
	StringsEN.demoMode = 'You are in demo-mode! This mode only allows you to change settings (e.g. hostname), check out the tutorial and play with some(!) parts of the UI. To get access to your assistant please log-in first.';
	StringsEN.notPossibleInDemoMode = 'Sorry this is not yet possible in demo-mode.';
	StringsEN.demoModeBtn = 'Demo-Mode';
	StringsEN.myNewsDemoBtn = 'Open my personal news';
	StringsEN.myRadioDemoBtn = 'Start my favorite radio station';
	StringsEN.myToDoDemoBtn = 'Open my to-do list';
	//Connection status
	StringsEN.status_connecting = "Connecting...";
	StringsEN.status_opened = "Online";
	StringsEN.status_closed = "Offline";
	StringsEN.status_error = "Error";
	//Teach-UI
	StringsEN.command = 'Command';
	StringsEN.chooseCommand = 'Please choose a command.';
	//Channels
	StringsEN.createdChannel = 'You have successfully created a new channel';
	StringsEN.joinedChannel = 'You have successfully joined a new channel';
	StringsEN.deletedChannel = 'You have successfully deleted the channel';

	//--------------------------------------------------------
	
	var StringsLocale = {};
	
	//get string
	StringsLocale.g = function(name){
		if (SepiaFW.config.appLanguage.toLowerCase() === "de"){
			return StringsDE[name];
		}else{
			return StringsEN[name];
		}
	}
	
	//write string
	StringsLocale.w = function(name){
		if (SepiaFW.config.appLanguage.toLowerCase() === "de"){
			document.write(StringsDE[name]);
		}else{
			document.write(StringsEN[name]);
		}
	}

	//specials:

	var weekdayEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	var weekdayDE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

	StringsLocale.getWeekdayName = function(dayIndex){
		if (SepiaFW.config.appLanguage.toLowerCase() === "de"){
			return weekdayDE[dayIndex];
		}else{
			return weekdayEN[dayIndex];
		}
	}

	//-------------- Languages --------------

	//ISO639-1 language codes
	StringsLocale.getSupportedAppLanguages = function(){
		return [
			{value:"de", name:"&nbsp;DE&nbsp;"},
			{value:"en", name:"&nbsp;EN&nbsp;"},
		];
	}
	//BCP47 language-REGION codes
	StringsLocale.getExperimentalAsrLanguages = function(){
		return [
			{value:"", name:"Default (app lang.)"},
			{value:"en-AU", name:"Australia (en-AU)"},
			{value:"en-CA", name:"Canada (en-CA)"},
			{value:"fr-FR", name:"France (fr-FR)"},
			{value:"el-GR", name:"Greece (el-GR)"},
			{value:"en-IE", name:"Ireland (en-IE)"},
			{value:"it-IT", name:"Italy (it-IT)"},
			{value:"ja-JP", name:"Japan (ja-JP)"},
			{value:"nl-NL", name:"Netherlands (nl-NL)"},
			{value:"en-NZ", name:"New Zealand (en-NZ)"},
			{value:"pt-PT", name:"Portugal (pt-PT)"},
			{value:"ru-RU", name:"Russia (ru-RU)"},
			{value:"en-ZA", name:"South Africa (en-ZA)"},
			{value:"af-ZA", name:"South Africa (af-ZA)"},
			{value:"es-ES", name:"Spain (es-ES)"},
			{value:"sv-SE", name:"Sweden (sv-SE)"},
			{value:"tr-TR", name:"Turkey (tr-TR)"},
			{value:"en-GB", name:"United Kingdom (en-GB)"}
		];
	}
	
	return StringsLocale;
}