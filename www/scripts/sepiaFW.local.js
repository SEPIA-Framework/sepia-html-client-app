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
	StringsDE.select = 'Auswählen';
	StringsDE.username = 'Username';
	StringsDE.nickname = 'Spitzname';
	StringsDE.password = 'Passwort';
	StringsDE.language = 'Sprache';
	StringsDE.preferred_temp_unit = 'Einheit der Temperatur';
	StringsDE.general = 'Allgemein';
	StringsDE.sendLogin = 'Login';
	StringsDE.sign_out = 'Abmelden';
	StringsDE.sign_out_all = 'Alle abmelden';
	StringsDE.apps_admin = 'Verwalten';
	StringsDE.account = 'Account';
	StringsDE.addresses = 'Adressen';
	StringsDE.contacts = 'Kontakte';
	StringsDE.favorites = 'Favoriten';
	StringsDE.logout = 'Logout';
	StringsDE.offlineTestMode = 'Offline Test-Modus';
	StringsDE.continueWithoutLogin = 'Weiter ohne Login';
	StringsDE.createAccount = 'Account erstellen';
	StringsDE.info_and_help = 'Infos und Support';
	StringsDE.control_hub = 'Control HUB';
	StringsDE.tutorial = 'Tutorial';
	StringsDE.change_account_password = "Passwort ändern";
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
	StringsDE.loginFailedHost = 'Login fehlgeschlagen! - Hostname wurde geändert, bitte prüfen.';
	StringsDE.loginFailedClientId = 'Login fehlgeschlagen! - Client- oder Geräte-ID wurde geändert, bitte prüfen.';
	StringsDE.loginFailedBlocked = 'Login fehlgeschlagen! - Zu viele fehlgeschlagene Versuche. Bitte etwas warten.';
	StringsDE.loginFailedExpired = 'Es sieht so aus als wäre deine Sitzung abgelaufen. Bitte logge dich erneut ein.';
	StringsDE.logoutAndReload = 'Diese Aktion erfordert einen Logout und App Neustart.';
	StringsDE.noConnectionToNetwork = 'Es tut mir leid, aber sieht so aus als wärest du offline :-(';
	StringsDE.connecting = 'Verbindung wird hergestellt ...';
	StringsDE.stillConnecting = 'Versuche immer noch die Verbindung herzustellen...';
	StringsDE.noConnectionToServer = 'Es tut mir leid, aber ich konnte keine Verbindung zum Server herstellen :-(';
	StringsDE.noConnectionToAssistant = 'Dein Assistent macht gerade Kaffeepause, ist sicher gleich zurück! (hoffentlich)';
	StringsDE.noConnectionOrNoCredentials = 'Verbindung ist verloren gegangen oder die Login Daten sind abgelaufen. Du kannst warten und es noch einmal versuchen, die App neu laden oder dich erneut einloggen.';
	StringsDE.messageLost = 'Die letzte Nachricht konnte nicht zugestellt werden';
	StringsDE.noAsrSupport = 'Es tut mir leid, aber dieser Client unterstütz die Spracherkennung leider nicht :-(';
	StringsDE.asrMissingServer = 'Mir fehlen noch Server Informationen um diese Spracherkennungsengine nutzen zu können, check noch mal die Settings bitte (ASR server).';
	StringsDE.asrSettingsProblem = 'Es gab ein unerwartetes Problem mit dem Mikrofon oder bei der Verarbeitung des Audiosignals.';
	StringsDE.asrMicProblem = 'Mikrofon nicht richtig erkannt oder Zugriff verweigert.';
	StringsDE.asrOtherError = 'Es tut mir leid, aber es gab ein unerwartetes Problem mit der Spracherkennung.';
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
	StringsDE.export = 'Exportieren';
	StringsDE.edit = 'Bearbeiten';
	StringsDE.copy = 'Kopieren';
	StringsDE.show = 'Anzeigen';
	StringsDE.open = 'Öffnen';
	StringsDE.close = 'Schließen';
	StringsDE.closed = 'geschlossen';
	StringsDE.new = 'Neu';
	StringsDE.unknown = 'Unbekannt';
	StringsDE.not_defined = 'Nicht definiert';
	StringsDE.retry = 'Nochmal versuchen';
	StringsDE.tryAgain = 'Nochmal versuchen';
	StringsDE.tryReconnect = 'Neu verbinden';
	StringsDE.wait = 'Warten';
	StringsDE.forget = 'Vergessen';
	StringsDE.abort = 'Abbrechen';
	StringsDE.continueOffline = 'Offline weiter';
	StringsDE.locateMe = 'Standort bestimmen';
	StringsDE.serverConnections = 'Server Verbindungen';
	StringsDE.deviceId = 'Geräte ID';
	StringsDE.deviceSite = 'Gerätestandort';
	StringsDE.thisDevice = 'dieses Gerät';
	StringsDE.allowedToExecuteThisCommand = 'Darf ich diesen Befehl ausführen: ';
	StringsDE.copyList = 'Diese Liste gehört einem anderen User, möchtest du sie in deinen Account kopieren?';
	StringsDE.cantCopyList = 'Diese Liste gehört einem anderen User und kann nicht gespeichert werden, aber du kannst eventuell einzelne Einträge via share-Funktion kopieren.';
	StringsDE.listOutOfSync = 'Der Inhalt der Liste ist eventuell nicht mehr aktuell. Wenn du diese Liste speicherst werden vorherige Änderungen überschrieben.';
	StringsDE.deleteItemConfirm = 'Bist du sicher, dass du das löschen möchtest?';
	StringsDE.deleteItem = 'Löschen';
	StringsDE.hideItem = 'Ausblenden';
	StringsDE.hideItemWithIcon = '<i class="material-icons md-inherit">visibility_off</i>';
	StringsDE.addItem = 'Item hinzufügen';
	StringsDE.moveToMyView = '← Zu My-View hinzufügen';
	StringsDE.moveToMyViewWithIcon = '<i class="material-icons md-inherit">add_to_home_screen</i>';
	StringsDE.exportToCalendar = '<i class="material-icons md-inherit">share</i><span>&nbsp;Kalender</span>';
	StringsDE.exportToAlarms = '<i class="material-icons md-inherit">share</i><span>&nbsp;Alarm</span>';
	StringsDE.exportToUrl = '<i class="material-icons md-inherit">share</i><span>&nbsp;Link</span>';
	StringsDE.copyUrl = '<i class="material-icons md-inherit">link</i><span>&nbsp;Kopieren</span>';
	StringsDE.playOn = '<i class="material-icons md-inherit">airplay</i><span>&nbsp;Play On</span>';
	StringsDE.closeCard = '<i class="material-icons md-inherit">cancel_presentation</i><span>&nbsp;Beenden</span>';
	StringsDE.readNewsArticle = '<i class="material-icons md-inherit">local_library</i><span>&nbsp;Artikel lesen</span>';
	StringsDE.alarm = 'Wecker';
	StringsDE.alarmClock = 'Wecker'; 		//name is title of UserDataList
	StringsDE.timer = 'Timer';				//name is title of UserDataList
	StringsDE.oclock = 'Uhr';
	StringsDE.expired = 'abgelaufen';
	StringsDE.missed = 'Verpasst';
	StringsDE.clearHistory = 'Verlauf löschen';
	StringsDE.history = 'Verlauf';
	StringsDE.newMessages = 'Neue Nachrichten';
	StringsDE.message = 'Nachricht';
	StringsDE.notification = 'Benachrichtigung';
	StringsDE.reload = 'Neu laden';
	StringsDE.newWindow = 'Neues Fenster';
	StringsDE.mySepiaClients = 'My Clients';
	StringsDE.reloadApp = 'Neustart';
	StringsDE.reloadAppInfo = 'Änderungen, die hier gemacht wurden sollten durch einen Neustart bestätigt werden';
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
	StringsDE.audioDevices = "Audiogeräte";
	StringsDE.mediaDevices = "Mediengeräte";
	//Fill words
	StringsDE.from = 'von';
	StringsDE.atClock = 'um';
	StringsDE.toMe = 'zu mir';
	//More errors/info
	StringsDE.tts_test = "Hallo Boss, wenn du diese Nachricht hören kannst, dann funktioniert die Sprachausgabe. Ich hoffe es hat geklappt!";
	StringsDE.error_after_try = "Habs versucht aber irgendwas ging schief. Versuch es vielleicht später noch mal?!";
	StringsDE.serverVersionTooLow = 'Beachte: Dein SEPIA Server nutzt nicht die aktuellste Version und manche Features des Clients funktionieren eventuell nicht wie erwartet. Bitte führe ein Server Update durch, wenn möglich!';
	StringsDE.mesh_node_fail = 'Sorry, die Mesh-Node Funktion zeigte einen Fehler.';
	StringsDE.no_client_support = 'Sorry, aber diese Version der App unterstütz die aufgerufene Aktion nicht.';
	StringsDE.cant_execute = "Sorry, aber es sieht so aus als könnte ich diese Aktion nicht ausführen.";
	StringsDE.tried_but_not_sure = "Hab's versucht aber bin nicht sicher ob es geklappt hat.";
	StringsDE.result_unclear = "Das Ergebnis der folgenden Anfrage ist unklar.";
	StringsDE.possible_reason_origin_unsecure = "Mögliche Ursache: Unsicherer Ursprung (SSL Zertifikat)";
	StringsDE.check_browser_settings = "Bitte prüfe die Browsereinstellungen (z.B. 'chrome://settings/content' oder 'about:preferences#privacy')";
	StringsDE.notification_error = "Benachrichtigungsfehler";
	StringsDE.missing_clexi_connection = "Keine Verbindung zum CLEXI Server.";
	StringsDE.missing_clexi_plugin = "CLEXI Server fehlt ein Plugin.";
	StringsDE.runtime_command_success = "Systembefehl erfolgreich.";
	StringsDE.no_other_user_clients_found = "Sorry, aber ich habe keine weiteren, aktiven Geräte gefunden von dir.";
	//Service and action texts
	StringsDE.opening_link = "Link wird geöffnet.";
	StringsDE.no_music_playing = "Kannst du was hören? Wahrscheinlich wurde keine Musik gefunden.";
	StringsDE.no_media_found = "Es wurde nichts zum Abspielen gefunden.";
	StringsDE.remote_action = "Remote-Zugriff";
	StringsDE.remote_action_audio_stream = "ich habe einen Audio Stream via Remote-Zugriff empfangen. Stream wird gestartet.";
	StringsDE.remote_action_media_player = "habe Daten via Remote-Zugriff empfangen. Media player wird gestartet.";
	StringsDE.remote_action_notify = "ich habe eine Benachrichtigung für dich.";
	StringsDE.read_article = "Artikel lesen";
	StringsDE.choose_device_for_music = "Wähle ein Gerät auf dem du die Musik abspielen willst";
	StringsDE.choose_device_for_action = "Auf welchem Gerät soll die Aktion ausgeführt werden?";
	StringsDE.broadcast_to_device_or_chat = "Broadcast an eines deiner Geräte schicken oder per Chat senden?";
	StringsDE.relative_precipitation = "relativer Niederschlag";
	//Link sharing
	StringsDE.link_join_channel = "Einem Chat-Kanal beitreten.";
	StringsDE.link_open_url = "Einen Link öffnen.";
	StringsDE.link_media_search = "Mediensuche";
	StringsDE.link_create_reminder = "Eine Erinnerung einrichten.";
	//Offline demo texts
	StringsDE.demoMode = 'Du befindest dich im Demo-Modus! In diesem Modus kannst du die Einstellungen ändern (z.B. hostname), das Tutorial anschauen und mit manchen(!) Teilen des Interfaces spielen. Um auf deinen Assistenten zuzugreifen melde dich bitte zuerst an.';
	StringsDE.setupMode = 'Du befindest dich im Setup-Modus! Dieser Modus kann genutzt werden um den Client lokal oder via Fernzugriff zu konfigurieren. Bitte beachte, dass die meisten Grundfunktionen nicht verfügbar sind in diesem Modus!';
	StringsDE.notPossibleInDemoMode = 'Sorry aber das geht noch nicht im Demo-Modus.';
	StringsDE.demoModeBtn = 'Demo-Modus';
	StringsDE.myNewsDemoBtn = 'Öffne meine persönlichen News';
	StringsDE.myRadioDemoBtn = 'Starte mein Lieblingsradio';
	StringsDE.myToDoDemoBtn = 'Öffne meine To-Do Liste';
	StringsDE.myMusicPlayerDemoBtn = 'Spiele Musik von Ed';
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
	StringsDE.pmFor = "PM für ";
	StringsDE.pmFrom = "PM von ";
	//Views
	StringsDE.view_home = "Home Screen";
	StringsDE.view_chat = "Chat";
	StringsDE.view_extended_results = "SEPIA Service Infos";
	//My-View sections
	StringsDE.section_music = "Musik";
	StringsDE.section_time_events = "Events";
	StringsDE.section_lists = "Listen";
	StringsDE.section_news_articles = "Nachrichten";
	StringsDE.section_news_outlets = "Nachrichtenkanäle";
	StringsDE.section_weather = "Wetter";
	StringsDE.section_links = "Links";
	StringsDE.section_others = "Mehr";
	
	//ENGLISH
	StringsEN.welcome = 'Welcome';
	StringsEN.help = 'Help';
	StringsEN.ok = 'Ok';
	StringsEN.more = 'More';
	StringsEN.select = 'Select';
	StringsEN.username = 'Username';
	StringsEN.nickname = 'Nickname';
	StringsEN.password = 'Password';
	StringsEN.language = 'Language';
	StringsEN.preferred_temp_unit = 'Unit of Temperature';
	StringsEN.general = 'General';
	StringsEN.sendLogin = 'Login';
	StringsEN.sign_out = 'Sign out';
	StringsEN.sign_out_all = 'Sign out all';
	StringsEN.apps_admin = 'Manage';
	StringsEN.account = 'Account';
	StringsEN.addresses = 'Addresses';
	StringsEN.contacts = 'Contacts';
	StringsEN.favorites = 'Favorites';
	StringsEN.logout = 'Logout';
	StringsEN.offlineTestMode = 'Offline test mode';
	StringsEN.continueWithoutLogin = 'Continue without login';
	StringsEN.createAccount = 'Create account';
	StringsEN.info_and_help = 'Info and support';
	StringsEN.control_hub = 'Control HUB';
	StringsEN.tutorial = 'Tutorial';
	StringsEN.change_account_password = "Change password";
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
	StringsEN.loginFailedHost = 'Login failed! - Hostname was changed, please check.';
	StringsEN.loginFailedClientId = 'Login failed! - Client- or device-ID was changed, please check.';
	StringsEN.loginFailedBlocked = 'Login failed! - Too many failed attempts. Please wait a bit.';
	StringsEN.loginFailedExpired = 'It looks like your session expired. Please login again.';
	StringsEN.logoutAndReload = 'This action requires a logout and app reload.';
	StringsEN.noConnectionToNetwork = 'I\'m sorry but it seems that you are offline :-(';
	StringsEN.connecting = 'Connecting ...';
	StringsEN.stillConnecting = 'Still trying to connect ...';
	StringsEN.noConnectionToServer = 'I\'m sorry but I could not establish a connection to the server :-(';
	StringsEN.noConnectionToAssistant = 'Your assistant is taking a coffee break, will be right back! (hopefully)';
	StringsEN.noConnectionOrNoCredentials = 'Connection was lost or credentials became invalid. You can wait and try it again, reload the app or login again.';
	StringsEN.messageLost = 'The last message could not be delivered';
	StringsEN.noAsrSupport = 'I\'m sorry but this client does not support speech recognition :-(';
	StringsEN.asrMissingServer = 'I\'m missing some server info to use this speech recognition engine, please check the settings again (ASR server).';
	StringsEN.asrSettingsProblem = 'There was a problem with the microphone or with audio signal processing.';
	StringsEN.asrMicProblem = 'Microphone has not been recognized properly or access was denied.';
	StringsEN.asrOtherError = 'I\'m sorry but there was an unexpected problem with the speech recognition.';
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
	StringsEN.export = 'Export';
	StringsEN.edit = 'Edit';
	StringsEN.copy = 'Copy';
	StringsEN.show = 'Show';
	StringsEN.open = 'Open';
	StringsEN.close = 'Close';
	StringsEN.closed = 'closed';
	StringsEN.new = 'New';
	StringsEN.unknown = 'Unknown';
	StringsEN.not_defined = 'Not defined';
	StringsEN.retry = 'Retry';
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
	StringsEN.thisDevice = 'this device';
	StringsEN.allowedToExecuteThisCommand = 'Am I allowed to send this request: ';
	StringsEN.copyList = 'This list belongs to another user, do you want to copy it to your account?';
	StringsEN.cantCopyList = 'This list belongs to another user and cannot be stored, but you might be able to copy single items with the share function.';
	StringsEN.listOutOfSync = 'The content of the list may be out of date. If you store this list previous changes will be overwritten.';
	StringsEN.deleteItemConfirm = 'Are you sure you want to delete this?';
	StringsEN.deleteItem = 'Delete';
	StringsEN.hideItem = 'Hide';
	StringsEN.hideItemWithIcon = '<i class="material-icons md-inherit">visibility_off</i>';
	StringsEN.addItem = 'Add item';
	StringsEN.moveToMyView = '← Move to My-View';
	StringsEN.moveToMyViewWithIcon = '<i class="material-icons md-inherit">add_to_home_screen</i>';
	StringsEN.exportToCalendar = '<i class="material-icons md-inherit">share</i><span>&nbsp;Calendar</span>';
	StringsEN.exportToAlarms = '<i class="material-icons md-inherit">share</i><span>&nbsp;Alarm</span>';
	StringsEN.exportToUrl = '<i class="material-icons md-inherit">share</i><span>&nbsp;Link</span>';
	StringsEN.copyUrl = '<i class="material-icons md-inherit">link</i><span>&nbsp;Copy</span>';
	StringsEN.playOn = '<i class="material-icons md-inherit">airplay</i><span>&nbsp;Play On</span>';
	StringsEN.closeCard = '<i class="material-icons md-inherit">cancel_presentation</i><span>&nbsp;Close</span>';
	StringsEN.readNewsArticle = '<i class="material-icons md-inherit">local_library</i><span>&nbsp;Read article</span>';
	StringsEN.alarm = 'Alarm';
	StringsEN.alarmClock = 'Alarm';		//name is title of UserDataList
	StringsEN.timer = 'Timer';			//name is title of UserDataList
	StringsEN.oclock = 'o\'clock';
	StringsEN.expired = 'expired';
	StringsEN.missed = 'Missed';
	StringsEN.clearHistory = 'Clear history';
	StringsEN.history = 'History';
	StringsEN.newMessages = "New messages";
	StringsEN.message = 'Message';
	StringsEN.notification = 'Notification';
	StringsEN.reload = 'Reload';
	StringsEN.newWindow = 'New window';
	StringsEN.mySepiaClients = 'Meine Clients';
	StringsEN.reloadApp = 'Reload app';
	StringsEN.reloadAppInfo = 'Changes you made here should be confirmed via a reload of the app';
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
	StringsEN.audioDevices = "Audio devices";
	StringsEN.mediaDevices = "Media devices";
	//Fill words
	StringsEN.from = 'from';
	StringsEN.atClock = 'at';
	StringsEN.toMe = 'to me';
	//More errors/info
	StringsEN.tts_test = "Hello Boss, if you can hear this message then the voice output must be ok. I hope it's working!";
	StringsEN.error_after_try = "I've tried but something went wrong. Try again later maybe?!";
	StringsEN.serverVersionTooLow = 'Note: Your SEPIA server is not using the latest version and some features of the client might not work as expected. Please update the server when possible!';
	StringsEN.mesh_node_fail = 'Sorry, the Mesh-Node function showed an error.';
	StringsEN.no_client_support = 'Sorry, but this version of the app does not support the requested action.';
	StringsEN.cant_execute = "Sorry, but it seems I can't execute the requested action.";
	StringsEN.tried_but_not_sure = "I've tried but I'm not sure if it worked.";
	StringsEN.result_unclear = "The result of the following request is unclear.";
	StringsEN.possible_reason_origin_unsecure = "Possible reason: Unsecure origin (SSL certificate)";
	StringsEN.check_browser_settings = "Please check your browser settings (e.g. 'chrome://settings/content' or 'about:preferences#privacy')";
	StringsEN.notification_error = "Notification error";
	StringsEN.missing_clexi_connection = "No connection to CLEXI server.";
	StringsEN.missing_clexi_plugin = "CLEXI server is missing a plugin.";
	StringsEN.runtime_command_success = "System command was successful.";
	StringsEN.no_other_user_clients_found = "I'm sorry, but I haven't found any other active devices of yours.";
	//Service and action texts
	StringsEN.opening_link = "Opening link.";
	StringsEN.no_music_playing = "Can you hear something? Probably no music found.";
	StringsEN.no_media_found = "Found no media to play.";
	StringsEN.remote_action = "Remote access";
	StringsEN.remote_action_audio_stream = "I've received an audio stream via remote access. Starting now.";
	StringsEN.remote_action_media_player = "I've received media via remote access. Starting player.";
	StringsEN.remote_action_notify = "I have a message for you.";
	StringsEN.read_article = "Read article";
	StringsEN.choose_device_for_music = "Choose a device to play your music on";
	StringsEN.choose_device_for_action = "On which device should the action be executed?";
	StringsEN.broadcast_to_device_or_chat = "Broadcast to one of your devices or via chat?";
	StringsEN.relative_precipitation = "relative precipitation";
	//Link sharing
	StringsEN.link_join_channel = "Join a chat-channel.";
	StringsEN.link_open_url = "Open a link.";
	StringsEN.link_media_search = "Media Search";
	StringsEN.link_create_reminder = "Create a reminder.";
	//Offline demo texts
	StringsEN.demoMode = 'You are in demo-mode! This mode only allows you to change settings (e.g. hostname), check out the tutorial and play with some(!) parts of the UI. To get access to your assistant please log-in first.';
	StringsEN.setupMode = 'You are in setup-mode! This mode is used to configure the client locally or via remote access. Note that most client features will not work in this mode!';
	StringsEN.notPossibleInDemoMode = 'Sorry this is not yet possible in demo-mode.';
	StringsEN.demoModeBtn = 'Demo-Mode';
	StringsEN.myNewsDemoBtn = 'Open my personal news';
	StringsEN.myRadioDemoBtn = 'Start my favorite radio station';
	StringsEN.myToDoDemoBtn = 'Open my to-do list';
	StringsEN.myMusicPlayerDemoBtn = 'Play music from Ed';
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
	StringsEN.pmFor = "PM for ";
	StringsEN.pmFrom = "PM from ";
	//Views
	StringsEN.view_home = "Home Screen";
	StringsEN.view_chat = "Chat";
	StringsEN.view_extended_results = "SEPIA service info";
	//My-View sections
	StringsEN.section_music = "Music";
	StringsEN.section_time_events = "Events";
	StringsEN.section_lists = "Lists";
	StringsEN.section_news_articles = "News";
	StringsEN.section_news_outlets = "News Channels";
	StringsEN.section_weather = "Weather";
	StringsEN.section_links = "Links";
	StringsEN.section_others = "More";

	//--------------------------------------------------------
	
	var StringsLocale = {};
	
	//get string
	StringsLocale.g = function(name, lang){
		var langCode = (lang || SepiaFW.config.appLanguage).toLowerCase();
		if (langCode == "de"){
			return StringsDE[name];
		}else{
			return StringsEN[name];
		}
	}
	
	//write string
	StringsLocale.w = function(name, lang){
		var langCode = (lang || SepiaFW.config.appLanguage).toLowerCase();
		if (langCode == "de"){
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
	var supportedAppLanguages = [
		{value:"de", name:"DE"},
		{value:"en", name:"EN"},
		//see below for experimental add
	];
	StringsLocale.getSupportedAppLanguages = function(){
		return supportedAppLanguages;
	}
	//BCP47 language-REGION codes
	StringsLocale.getExperimentalAsrLanguages = function(){
		return [
			{value:"", name:"Default (app lang.)"},
			{value:"en-AU", name:"Australia (en-AU)"},
			{value:"ar-XA", name:"Arabia (ar-XA)"},
			{value:"es-AR", name:"Argentina (es-AR)"},
			{value:"nl-BE", name:"Belgium (nl-BE)"},
			{value:"pt-BR", name:"Brasil (pt-BR)"},
			{value:"en-CA", name:"Canada (en-CA)"},
			{value:"fr-CA", name:"Canada (fr-CA)"},
			{value:"zh-CN", name:"China (zh-CN)"},
			{value:"es-CO", name:"Colombia (es-CO)"},
			{value:"da-DK", name:"Denmark (da-DK)"},
			{value:"fr-FR", name:"France (fr-FR)"},
			{value:"de-DE", name:"Germany (de-DE)"},
			{value:"el-GR", name:"Greece (el-GR)"},
			{value:"en-IE", name:"Ireland (en-IE)"},
			{value:"it-IT", name:"Italy (it-IT)"},
			{value:"ja-JP", name:"Japan (ja-JP)"},
			{value:"ko-KR", name:"Korea (ko-KR)"},
			{value:"es-MX", name:"Mexico (es-MX)"},
			{value:"nl-NL", name:"Netherlands (nl-NL)"},
			{value:"en-NZ", name:"New Zealand (en-NZ)"},
			{value:"no-NO", name:"Norway (no-NO)"},
			{value:"pl-PL", name:"Poland (pl-PL)"},
			{value:"pt-PT", name:"Portugal (pt-PT)"},
			{value:"ru-RU", name:"Russia (ru-RU)"},
			{value:"en-ZA", name:"South Africa (en-ZA)"},
			{value:"af-ZA", name:"South Africa (af-ZA)"},
			{value:"es-ES", name:"Spain (es-ES)"},
			{value:"sv-SE", name:"Sweden (sv-SE)"},
			{value:"tr-TR", name:"Turkey (tr-TR)"},
			{value:"en-GB", name:"United Kingdom (en-GB)"},
			{value:"en-US", name:"USA (en-US)"}
		];
	}
	//Add experimental app languages
	function addExperimentalAppLanguages(){
		supportedAppLanguages.push({value: "---", name: "--Dev. Only--", disabled: true});
		StringsLocale.getExperimentalAsrLanguages().forEach(function(langObj){
			if (langObj.value && !langObj.disabled){
				var shortCode = langObj.value.split("-")[0];
				if (!supportedAppLanguages.find(function(lo){ return lo.value == shortCode; })){
					supportedAppLanguages.push({value: shortCode, name: (shortCode.toUpperCase() + " (exp.)"), experimental: true});
				}
			}
		});
	}
	addExperimentalAppLanguages();
	//Map short to default long
	StringsLocale.getDefaultBcp47LanguageCode = function(langCodeShort){
		if (langCodeShort && langCodeShort.length === 2){
			langCodeShort = langCodeShort.toLowerCase();
			var mappedCode = defaultShortLangCodeToLongMap[langCodeShort];
			if (!mappedCode){
				var firstExpCode = StringsLocale.getExperimentalAsrLanguages().find(function(lc){ return lc.value.indexOf(langCodeShort) == 0; });
				mappedCode = firstExpCode? firstExpCode.value : "";
			}
			return mappedCode;
		}
	}
	var defaultShortLangCodeToLongMap = {
		"de": "de-DE",
		"en": "en-US",
		"es": "es-ES",
		"fr": "fr-FR",
		"nl": "nl-BE",
		"pt": "pt-PT"
	}
	
	return StringsLocale;
}