## ADD THE CODE FROM BELOW TO 'SplashScreen.java'

* Open: `src\main\java\org\apache\cordova\splashscreen`
* Go to approx. line 315
* Do code change described below

```
// Create and show the dialog
splashDialog = new Dialog(context, android.R.style.Theme_Translucent_NoTitleBar);
// check to see if the splash screen should be full screen
if ((cordova.getActivity().getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_FULLSCREEN)
		== WindowManager.LayoutParams.FLAG_FULLSCREEN) {
	splashDialog.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
			WindowManager.LayoutParams.FLAG_FULLSCREEN);
}
//---NEW---
if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
	try {
		splashDialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
		splashDialog.getWindow().setNavigationBarColor(Color.parseColor(preferences.getString("NavigationBarBackgroundColor", "#000000")));
	} catch (Exception e) {
		e.printStackTrace();
	}
}
//---NEW END---
splashDialog.setContentView(splashImageView);
splashDialog.setCancelable(false);
splashDialog.show();
```
