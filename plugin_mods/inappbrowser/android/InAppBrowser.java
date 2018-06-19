/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/
package org.apache.cordova.inappbrowser;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.provider.Browser;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.text.TextUtils;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.WindowManager.LayoutParams;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.CookieSyncManager;
import android.webkit.HttpAuthHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.TextView;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.Config;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaHttpAuthHandler;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.LOG;
import org.apache.cordova.PluginManager;
import org.apache.cordova.PluginResult;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.StringTokenizer;

@SuppressLint("SetJavaScriptEnabled")
public class InAppBrowser extends CordovaPlugin {

    private static final String NULL = "null";
    protected static final String LOG_TAG = "InAppBrowser";
    private static final String SELF = "_self";
    private static final String SYSTEM = "_system";
    private static final String EXIT_EVENT = "exit";
    private static final String LOCATION = "location";
    private static final String ZOOM = "zoom";
    private static final String HIDDEN = "hidden";
    private static final String LOAD_START_EVENT = "loadstart";
    private static final String LOAD_STOP_EVENT = "loadstop";
    private static final String LOAD_ERROR_EVENT = "loaderror";
    private static final String CLEAR_ALL_CACHE = "clearcache";
    private static final String CLEAR_SESSION_CACHE = "clearsessioncache";
    private static final String HARDWARE_BACK_BUTTON = "hardwareback";
    private static final String MEDIA_PLAYBACK_REQUIRES_USER_ACTION = "mediaPlaybackRequiresUserAction";
    private static final String SHOULD_PAUSE = "shouldPauseOnSuspend";
    private static final Boolean DEFAULT_HARDWARE_BACK = true;
    private static final String USER_WIDE_VIEW_PORT = "useWideViewPort";

    private InAppBrowserDialog dialog;
    private WebView inAppWebView;
    private TextView edittext;
    private CallbackContext callbackContext;
    private boolean showLocationBar = true;
    private boolean showZoomControls = false;
    private boolean openWindowHidden = false;
    private boolean clearAllCache = false;
    private boolean clearSessionCache = false;
    private boolean hardwareBackButton = true;
    private boolean mediaPlaybackRequiresUserGesture = false;
    private boolean shouldPauseInAppBrowser = false;
    private boolean useWideViewPort = true;
    private ValueCallback<Uri> mUploadCallback;
    private ValueCallback<Uri[]> mUploadCallbackLollipop;
    private final static int FILECHOOSER_REQUESTCODE = 1;
    private final static int FILECHOOSER_REQUESTCODE_LOLLIPOP = 2;

    private static String closedUrl;
    private static String previousUrl;
    private static String inAppBrowserHomeUrl = "file:///android_asset/www/search.html";

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action the action to execute.
     * @param args JSONArry of arguments for the plugin.
     * @param callbackContext the callbackContext used when calling back into JavaScript.
     * @return A PluginResult object with a status and message.
     */
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if (action.equals("open")) {
            this.callbackContext = callbackContext;
            final String url = args.getString(0);
            String t = args.optString(1);
            if (t == null || t.equals("") || t.equals(NULL)) {
                t = SELF;
            }
            final String target = t;
            final HashMap<String, Boolean> features = parseFeature(args.optString(2));

            LOG.d(LOG_TAG, "target = " + target);

            this.cordova.getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    String result = "";
                    // SELF
                    if (SELF.equals(target)) {
                        LOG.d(LOG_TAG, "in self");
                        /* This code exists for compatibility between 3.x and 4.x versions of Cordova.
                         * Previously the Config class had a static method, isUrlWhitelisted(). That
                         * responsibility has been moved to the plugins, with an aggregating method in
                         * PluginManager.
                         */
                        Boolean shouldAllowNavigation = null;
                        if (url.startsWith("javascript:")) {
                            shouldAllowNavigation = true;
                        }
                        if (shouldAllowNavigation == null) {
                            try {
                                Method iuw = Config.class.getMethod("isUrlWhiteListed", String.class);
                                shouldAllowNavigation = (Boolean)iuw.invoke(null, url);
                            } catch (NoSuchMethodException e) {
                                LOG.d(LOG_TAG, e.getLocalizedMessage());
                            } catch (IllegalAccessException e) {
                                LOG.d(LOG_TAG, e.getLocalizedMessage());
                            } catch (InvocationTargetException e) {
                                LOG.d(LOG_TAG, e.getLocalizedMessage());
                            }
                        }
                        if (shouldAllowNavigation == null) {
                            try {
                                Method gpm = webView.getClass().getMethod("getPluginManager");
                                PluginManager pm = (PluginManager)gpm.invoke(webView);
                                Method san = pm.getClass().getMethod("shouldAllowNavigation", String.class);
                                shouldAllowNavigation = (Boolean)san.invoke(pm, url);
                            } catch (NoSuchMethodException e) {
                                LOG.d(LOG_TAG, e.getLocalizedMessage());
                            } catch (IllegalAccessException e) {
                                LOG.d(LOG_TAG, e.getLocalizedMessage());
                            } catch (InvocationTargetException e) {
                                LOG.d(LOG_TAG, e.getLocalizedMessage());
                            }
                        }
                        // load in webview
                        if (Boolean.TRUE.equals(shouldAllowNavigation)) {
                            LOG.d(LOG_TAG, "loading in webview");
                            webView.loadUrl(url);
                        }
                        //Load the dialer
                        else if (url.startsWith(WebView.SCHEME_TEL))
                        {
                            try {
                                LOG.d(LOG_TAG, "loading in dialer");
                                Intent intent = new Intent(Intent.ACTION_DIAL);
                                intent.setData(Uri.parse(url));
                                cordova.getActivity().startActivity(intent);
                            } catch (android.content.ActivityNotFoundException e) {
                                LOG.e(LOG_TAG, "Error dialing " + url + ": " + e.toString());
                            }
                        }
                        // load in InAppBrowser
                        else {
                            LOG.d(LOG_TAG, "loading in InAppBrowser");
                            result = showWebPage(url, features);
                        }
                    }
                    // SYSTEM
                    else if (SYSTEM.equals(target)) {
                        LOG.d(LOG_TAG, "in system");
                        result = openExternal(url);
                    }
                    // BLANK - or anything else
                    else {
                        LOG.d(LOG_TAG, "in blank");
                        result = showWebPage(url, features);
                    }

                    PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, result);
                    pluginResult.setKeepCallback(true);
                    callbackContext.sendPluginResult(pluginResult);
                }
            });
        }
        else if (action.equals("close")) {
            closeDialog();
        }
        else if (action.equals("injectScriptCode")) {
            String jsWrapper = null;
            if (args.getBoolean(1)) {
                jsWrapper = String.format("(function(){prompt(JSON.stringify([eval(%%s)]), 'gap-iab://%s')})()", callbackContext.getCallbackId());
            }
            injectDeferredObject(args.getString(0), jsWrapper);
        }
        else if (action.equals("injectScriptFile")) {
            String jsWrapper;
            if (args.getBoolean(1)) {
                jsWrapper = String.format("(function(d) { var c = d.createElement('script'); c.src = %%s; c.onload = function() { prompt('', 'gap-iab://%s'); }; d.body.appendChild(c); })(document)", callbackContext.getCallbackId());
            } else {
                jsWrapper = "(function(d) { var c = d.createElement('script'); c.src = %s; d.body.appendChild(c); })(document)";
            }
            injectDeferredObject(args.getString(0), jsWrapper);
        }
        else if (action.equals("injectStyleCode")) {
            String jsWrapper;
            if (args.getBoolean(1)) {
                jsWrapper = String.format("(function(d) { var c = d.createElement('style'); c.innerHTML = %%s; d.body.appendChild(c); prompt('', 'gap-iab://%s');})(document)", callbackContext.getCallbackId());
            } else {
                jsWrapper = "(function(d) { var c = d.createElement('style'); c.innerHTML = %s; d.body.appendChild(c); })(document)";
            }
            injectDeferredObject(args.getString(0), jsWrapper);
        }
        else if (action.equals("injectStyleFile")) {
            String jsWrapper;
            if (args.getBoolean(1)) {
                jsWrapper = String.format("(function(d) { var c = d.createElement('link'); c.rel='stylesheet'; c.type='text/css'; c.href = %%s; d.head.appendChild(c); prompt('', 'gap-iab://%s');})(document)", callbackContext.getCallbackId());
            } else {
                jsWrapper = "(function(d) { var c = d.createElement('link'); c.rel='stylesheet'; c.type='text/css'; c.href = %s; d.head.appendChild(c); })(document)";
            }
            injectDeferredObject(args.getString(0), jsWrapper);
        }
        else if (action.equals("show")) {
            this.cordova.getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    dialog.show();
                }
            });
            PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
            pluginResult.setKeepCallback(true);
            this.callbackContext.sendPluginResult(pluginResult);
        }
        else if (action.equals("hide")) {
            this.cordova.getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    dialog.hide();
                }
            });
            PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
            pluginResult.setKeepCallback(true);
            this.callbackContext.sendPluginResult(pluginResult);
        }
        else {
            return false;
        }
        return true;
    }

    /**
     * Called when the view navigates.
     */
    @Override
    public void onReset() {
        closeDialog();
    }

    /**
     * Called when the system is about to start resuming a previous activity.
     */
    @Override
    public void onPause(boolean multitasking) {
        if (shouldPauseInAppBrowser) {
            inAppWebView.onPause();
        }
    }

    /**
     * Called when the activity will start interacting with the user.
     */
    @Override
    public void onResume(boolean multitasking) {
        if (shouldPauseInAppBrowser) {
            inAppWebView.onResume();
        }
    }

    /**
     * Called by AccelBroker when listener is to be shut down.
     * Stop listener.
     */
    public void onDestroy() {
        closeDialog();
    }

    /**
     * Inject an object (script or style) into the InAppBrowser WebView.
     *
     * This is a helper method for the inject{Script|Style}{Code|File} API calls, which
     * provides a consistent method for injecting JavaScript code into the document.
     *
     * If a wrapper string is supplied, then the source string will be JSON-encoded (adding
     * quotes) and wrapped using string formatting. (The wrapper string should have a single
     * '%s' marker)
     *
     * @param source      The source object (filename or script/style text) to inject into
     *                    the document.
     * @param jsWrapper   A JavaScript string to wrap the source string in, so that the object
     *                    is properly injected, or null if the source string is JavaScript text
     *                    which should be executed directly.
     */
    private void injectDeferredObject(String source, String jsWrapper) {
        if (inAppWebView!=null) {
            String scriptToInject;
            if (jsWrapper != null) {
                org.json.JSONArray jsonEsc = new org.json.JSONArray();
                jsonEsc.put(source);
                String jsonRepr = jsonEsc.toString();
                String jsonSourceString = jsonRepr.substring(1, jsonRepr.length()-1);
                scriptToInject = String.format(jsWrapper, jsonSourceString);
            } else {
                scriptToInject = source;
            }
            final String finalScriptToInject = scriptToInject;
            this.cordova.getActivity().runOnUiThread(new Runnable() {
                @SuppressLint("NewApi")
                @Override
                public void run() {
                    inAppWebView.evaluateJavascript(finalScriptToInject, null);
                }
            });
        } else {
            LOG.d(LOG_TAG, "Can't inject code into the system browser");
        }
    }

    /**
     * Put the list of features into a hash map
     *
     * @param optString
     * @return
     */
    private HashMap<String, Boolean> parseFeature(String optString) {
        if (optString.equals(NULL)) {
            return null;
        } else {
            HashMap<String, Boolean> map = new HashMap<String, Boolean>();
            StringTokenizer features = new StringTokenizer(optString, ",");
            StringTokenizer option;
            while(features.hasMoreElements()) {
                option = new StringTokenizer(features.nextToken(), "=");
                if (option.hasMoreElements()) {
                    String key = option.nextToken();
                    Boolean value = option.nextToken().equals("no") ? Boolean.FALSE : Boolean.TRUE;
                    map.put(key, value);
                }
            }
            return map;
        }
    }

    /**
     * Display a new browser with the specified URL.
     *
     * @param url the url to load.
     * @return "" if ok, or error message.
     */
    public String openExternal(String url) {
        try {
            Intent intent = null;
            intent = new Intent(Intent.ACTION_VIEW);
            // Omitting the MIME type for file: URLs causes "No Activity found to handle Intent".
            // Adding the MIME type to http: URLs causes them to not be handled by the downloader.
            Uri uri = Uri.parse(url);
            if ("file".equals(uri.getScheme())) {
                intent.setDataAndType(uri, webView.getResourceApi().getMimeType(uri));
            } else {
                intent.setData(uri);
            }
            intent.putExtra(Browser.EXTRA_APPLICATION_ID, cordova.getActivity().getPackageName());
            this.cordova.getActivity().startActivity(intent);
            return "";
        // not catching FileUriExposedException explicitly because buildtools<24 doesn't know about it
        } catch (java.lang.RuntimeException e) {
            LOG.d(LOG_TAG, "InAppBrowser: Error loading url "+url+":"+ e.toString());
            return e.toString();
        }
    }

    /**
     * Closes the dialog
     */
    public void closeDialog() {
        closedUrl = (inAppWebView == null)? "" : inAppWebView.getUrl();
        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final WebView childView = inAppWebView;
                // The JS protects against multiple calls, so this should happen only when
                // closeDialog() is called by other native code.
                if (childView == null) {
                    return;
                }

                childView.setWebViewClient(new WebViewClient() {
                    // NB: wait for about:blank before dismissing
                    public void onPageFinished(WebView view, String url) {
                        if (dialog != null) {
                            dialog.dismiss();
                            dialog = null;
                        }
                    }
                });
                // NB: From SDK 19: "If you call methods on WebView from any thread
                // other than your app's UI thread, it can cause unexpected results."
                // http://developer.android.com/guide/webapps/migrating.html#Threads
                childView.loadUrl("about:blank");

                try {
                    JSONObject obj = new JSONObject();
                    obj.put("type", EXIT_EVENT);
                    sendUpdate(obj, false);
                } catch (JSONException ex) {
                    LOG.d(LOG_TAG, "Should never happen");
                }
            }
        });
    }

    /**
     * Checks to see if it is possible to go back one page in history, then does so.
     */
    public void goBack() {
        if (this.inAppWebView.canGoBack()) {
            this.inAppWebView.goBack();
        }
    }

    /**
     * Can the web browser go back?
     * @return boolean
     */
    public boolean canGoBack() {
        return this.inAppWebView.canGoBack();
    }

    /**
     * Has the user set the hardware back button to go back
     * @return boolean
     */
    public boolean hardwareBack() {
        return hardwareBackButton;
    }

    /**
     * Checks to see if it is possible to go forward one page in history, then does so.
     */
    private void goForward() {
        if (this.inAppWebView.canGoForward()) {
            this.inAppWebView.goForward();
        }
    }

    /**
     * Navigate to the new page
     *
     * @param url to load
     */
    private void navigate(String url) {
        InputMethodManager imm = (InputMethodManager)this.cordova.getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(edittext.getWindowToken(), 0);

        if (!url.startsWith("http") && !url.startsWith("file:")) {
            this.inAppWebView.loadUrl("http://" + url);
        } else {
            this.inAppWebView.loadUrl(url);
        }
        this.inAppWebView.requestFocus();
    }


    /**
     * Should we show the location bar?
     *
     * @return boolean
     */
    private boolean getShowLocationBar() {
        return this.showLocationBar;
    }

    private InAppBrowser getInAppBrowser(){
        return this;
    }

    private void clearAllCache() {
        if (inAppWebView != null) {
            inAppWebView.clearCache(true);
        }
        CookieManager.getInstance().removeAllCookie();      //TODO: fix
    }
    private void clearSessionCache() {
        CookieManager.getInstance().removeSessionCookie();
    }

    /**
     * Get a drawable by name from the main package.
     */
    private Drawable getDrawableFromMyResources(String name){
        Resources activityRes = cordova.getActivity().getResources();
        int resId = activityRes.getIdentifier(name, "drawable", cordova.getActivity().getPackageName());
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return activityRes.getDrawable(resId, cordova.getActivity().getTheme());
        }else{
            return activityRes.getDrawable(resId);
        }
    }

    /**
     * Display a new browser with the specified URL.
     *
     * @param url the url to load.
     * @param features jsonObject
     */
    public String showWebPage(final String url, HashMap<String, Boolean> features) {
        // Check options
        if (features != null) {
            Boolean show = features.get(LOCATION);
            if (show != null) {
                showLocationBar = show.booleanValue();
            }
            Boolean zoom = features.get(ZOOM);
            if (zoom != null) {
                showZoomControls = zoom.booleanValue();
            }
            Boolean hidden = features.get(HIDDEN);
            if (hidden != null) {
                openWindowHidden = hidden.booleanValue();
            }
            Boolean hardwareBack = features.get(HARDWARE_BACK_BUTTON);
            if (hardwareBack != null) {
                hardwareBackButton = hardwareBack.booleanValue();
            } else {
                hardwareBackButton = DEFAULT_HARDWARE_BACK;
            }
            Boolean mediaPlayback = features.get(MEDIA_PLAYBACK_REQUIRES_USER_ACTION);
            if (mediaPlayback != null) {
                mediaPlaybackRequiresUserGesture = mediaPlayback.booleanValue();
            }
            Boolean cache = features.get(CLEAR_ALL_CACHE);
            if (cache != null) {
                clearAllCache = cache.booleanValue();
            } else {
                cache = features.get(CLEAR_SESSION_CACHE);
                if (cache != null) {
                    clearSessionCache = cache.booleanValue();
                }
            }
            Boolean shouldPause = features.get(SHOULD_PAUSE);
            if (shouldPause != null) {
                shouldPauseInAppBrowser = shouldPause.booleanValue();
            }
            Boolean wideViewPort = features.get(USER_WIDE_VIEW_PORT);
            if (wideViewPort != null ) {
		            useWideViewPort = wideViewPort.booleanValue();
            }
        }

        final CordovaWebView thatWebView = this.webView;

        // Create dialog in new thread
        Runnable runnable = new Runnable() {
            /**
             * Convert our DIP units to Pixels
             *
             * @return int
             */
            private int dpToPixels(int dipValue) {
                int value = (int) TypedValue.applyDimension( TypedValue.COMPLEX_UNIT_DIP,
                                                            (float) dipValue,
                                                            cordova.getActivity().getResources().getDisplayMetrics()
                );

                return value;
            }

            @SuppressLint("NewApi")
            public void run() {

                // CB-6702 InAppBrowser hangs when opening more than one instance
                if (dialog != null) {
                    dialog.dismiss();
                };

                // Let's create the main dialog
                dialog = new InAppBrowserDialog(cordova.getActivity(), android.R.style.Theme_NoTitleBar);
                dialog.getWindow().getAttributes().windowAnimations = android.R.style.Animation_Dialog;
                dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
                dialog.setCancelable(true);
                dialog.setInAppBroswer(getInAppBrowser());

                // Main container layout
                LinearLayout main = new LinearLayout(cordova.getActivity());
                main.setOrientation(LinearLayout.VERTICAL);

                // Toolbar layout
                LinearLayout toolbar = new LinearLayout(cordova.getActivity());
                toolbar.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, this.dpToPixels(44), 0f));
                toolbar.setPadding(this.dpToPixels(8), this.dpToPixels(4), this.dpToPixels(8), this.dpToPixels(4));
                toolbar.setContentDescription("Toolbar");
                toolbar.setId(Integer.valueOf(1));
                //Please, no more black! <- who said this?!? Black is awesome!
                //toolbar.setBackgroundColor(android.graphics.Color.rgb(235,235,235));
                int toolbarColor;
                int blackColor = android.graphics.Color.rgb(0, 0, 0);
                int blueColor = android.graphics.Color.rgb(0, 122, 255);
				if(Build.VERSION.SDK_INT >= 21){
                    /*
                    toolbarColor = cordova.getActivity().getWindow().getStatusBarColor();
					dialog.getWindow().setStatusBarColor(toolbarColor); 	//TODO: not working
					*/
                    toolbarColor = Color.rgb(0, 0, 0);
                }else{
                    toolbarColor = blackColor;
                }
                toolbar.setBackgroundColor(toolbarColor);

                // Back button
                ImageButton back = new ImageButton(cordova.getActivity());
                back.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT, 0f));
                back.setContentDescription("Back Button");
                back.setId(Integer.valueOf(2));
                back.setBackground(null);
                if (toolbarColor == blackColor)
                    back.setColorFilter(blueColor);
                back.setImageDrawable(getDrawableFromMyResources("ic_chevron_left_black_24dp"));
                back.setScaleType(ImageView.ScaleType.FIT_CENTER);
                back.setPadding(this.dpToPixels(8), this.dpToPixels(5), this.dpToPixels(8), this.dpToPixels(5));
                back.getAdjustViewBounds();

                back.setOnClickListener(new View.OnClickListener() {
                    public void onClick(View v) {
                        goBack();
                    }
                });

                // Forward button
                ImageButton forward = new ImageButton(cordova.getActivity());
                forward.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT, 0f));
                forward.setContentDescription("Forward Button");
                forward.setId(Integer.valueOf(3));
                forward.setBackground(null);
                if (toolbarColor == blackColor)
                    forward.setColorFilter(blueColor);
                forward.setImageDrawable(getDrawableFromMyResources("ic_chevron_right_black_24dp"));
                forward.setScaleType(ImageView.ScaleType.FIT_CENTER);
                forward.setPadding(this.dpToPixels(8), this.dpToPixels(5), this.dpToPixels(8), this.dpToPixels(5));
                forward.getAdjustViewBounds();

                forward.setOnClickListener(new View.OnClickListener() {
                    public void onClick(View v) {
                        goForward();
                    }
                });

                // Edit Text Box
                edittext = new TextView(cordova.getActivity());
                edittext.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT, 1f));
                edittext.setId(Integer.valueOf(4));
                if (toolbarColor == blackColor) {
                    edittext.setBackgroundColor(blackColor);
                    edittext.setTextColor(Color.WHITE);
                }else{
                    edittext.setBackgroundColor(android.graphics.Color.WHITE);
                    edittext.setTextColor(blackColor);
                }
				edittext.setTextSize(12);
				edittext.setPadding(this.dpToPixels(8), this.dpToPixels(4), this.dpToPixels(8), this.dpToPixels(4));
                edittext.setGravity(Gravity.CENTER);
                edittext.setSingleLine(true);
                edittext.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
                edittext.setText(url);
                //edittext.setImeOptions(EditorInfo.IME_ACTION_GO);
                //edittext.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
                //edittext.setInputType(InputType.TYPE_NULL); //Makes the text NON-EDITABLE
                edittext.setEllipsize(TextUtils.TruncateAt.END);
                edittext.setFocusable(false);
                edittext.setFocusableInTouchMode(false);

                edittext.setOnClickListener(new View.OnClickListener() {
                    public void onClick(View v) {
                        edittext.setText("copied link to clipboard");
                        edittext.invalidate();
                        android.content.ClipboardManager clipboard = (android.content.ClipboardManager) cordova.getActivity().getSystemService(Context.CLIPBOARD_SERVICE);
                        android.content.ClipData clip = android.content.ClipData.newPlainText("Copied link", inAppWebView.getUrl());
                        clipboard.setPrimaryClip(clip);
                    }
                });
                /*
                edittext.setOnKeyListener(new View.OnKeyListener() {
                    public boolean onKey(View v, int keyCode, KeyEvent event) {
                        // If the event is a key-down event on the "enter" button
                        if ((event.getAction() == KeyEvent.ACTION_DOWN) && (keyCode == KeyEvent.KEYCODE_ENTER)) {
                          navigate(edittext.getText().toString());
                          return true;
                        }
                        return false;
                    }
                });
                */

                // Close/Done button
                ImageButton close = new ImageButton(cordova.getActivity());
                close.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT, 0f));
                close.setContentDescription("Close Button");
                close.setId(Integer.valueOf(5));
                /*
                close.setText("×");
                close.setTextSize(24);
                close.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
                close.setBackground(null);
                if (toolbarColor == blackColor)
                    close.setTextColor(blueColor);
                */
                close.setBackground(null);
                close.setPadding(this.dpToPixels(8), this.dpToPixels(5), this.dpToPixels(8), this.dpToPixels(5));
                if (toolbarColor == blackColor)
                    close.setColorFilter(blueColor);
                close.setImageDrawable(getDrawableFromMyResources("ic_close_black_24dp"));
                close.setScaleType(ImageView.ScaleType.FIT_CENTER);
                close.getAdjustViewBounds();

                close.setOnClickListener(new View.OnClickListener() {
                    public void onClick(View v) {
                        closeDialog();
                    }
                });

                // Reload button
                Button reload = new Button(cordova.getActivity());
                reload.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT, 1f));
                reload.setContentDescription("Reload Button");
                reload.setId(Integer.valueOf(10));
                reload.setText("reload");
                reload.setTextSize(12);
                reload.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
                reload.setBackground(null);
                if (toolbarColor == blackColor)
                    reload.setTextColor(blueColor);
                reload.setPadding(this.dpToPixels(8), this.dpToPixels(5), this.dpToPixels(8), this.dpToPixels(5));
                //Drawable reloadIcon = activityRes.getDrawable(android.R.drawable.ic_popup_sync);
                //reload.setImageDrawable(reloadIcon);
                //reload.setScaleType(ImageView.ScaleType.FIT_CENTER);
                //reload.getAdjustViewBounds();

                reload.setOnClickListener(new View.OnClickListener() {
                    public void onClick(View v) {
                        if (inAppWebView.getUrl().equals(inAppBrowserHomeUrl) && previousUrl != null && !previousUrl.isEmpty()) {
                            inAppWebView.loadUrl(previousUrl);
                        }else{
                            inAppWebView.reload();
                        }
                    }
                });

                // Home button
                Button homeButton = new Button(cordova.getActivity());
                homeButton.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT, 1f));
                homeButton.setContentDescription("Home Button");
                homeButton.setId(Integer.valueOf(10));
                homeButton.setText("home");
                homeButton.setTextSize(12);
                homeButton.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
                homeButton.setBackground(null);
                if (toolbarColor == blackColor)
                    homeButton.setTextColor(blueColor);
                homeButton.setPadding(this.dpToPixels(8), this.dpToPixels(5), this.dpToPixels(8), this.dpToPixels(5));

                homeButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(View v) {
                        inAppWebView.loadUrl(inAppBrowserHomeUrl);
                    }
                });

                //Clear data button
                Button clearAllButton = new Button(cordova.getActivity());
                clearAllButton.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT, 1f));
                clearAllButton.setContentDescription("Clear all browser data");
                clearAllButton.setText("clear data");
                clearAllButton.setTextSize(12);
                clearAllButton.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
                clearAllButton.setBackground(null);
                if (toolbarColor == blackColor)
                    clearAllButton.setTextColor(blueColor);
                clearAllButton.setPadding(this.dpToPixels(8), this.dpToPixels(5), this.dpToPixels(8), this.dpToPixels(5));

                clearAllButton.setOnClickListener(new View.OnClickListener() {
                    public void onClick(View v) {
                        edittext.setText("Deleting app data...");
                        previousUrl = inAppWebView.getUrl();
                        clearAllCache();
                        inAppWebView.loadUrl(inAppBrowserHomeUrl);
                    }
                });

                // WebView wrapper
                final RelativeLayout inAppWebViewWrapper = new RelativeLayout(cordova.getActivity());
                inAppWebViewWrapper.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT, 1f));
                inAppWebViewWrapper.setId(Integer.valueOf(6));
                // WebView
                inAppWebView = new WebView(cordova.getActivity());
                inAppWebView.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                inAppWebView.setId(Integer.valueOf(7));
                inAppWebView.setScrollBarStyle(View.SCROLLBARS_OUTSIDE_OVERLAY);
                // File Chooser Implemented ChromeClient
                inAppWebView.setWebChromeClient(new InAppChromeClient(thatWebView) {
                    // For Android 5.0+
                    @Override
                    public boolean onShowFileChooser (WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams)
                    {
                        LOG.d(LOG_TAG, "File Chooser 5.0+");
                        // If callback exists, finish it.
                        if(mUploadCallbackLollipop != null) {
                            mUploadCallbackLollipop.onReceiveValue(null);
                        }
                        mUploadCallbackLollipop = filePathCallback;

                        // Create File Chooser Intent
                        Intent content = new Intent(Intent.ACTION_GET_CONTENT);
                        content.addCategory(Intent.CATEGORY_OPENABLE);
                        content.setType("*/*");

                        // Run cordova startActivityForResult
                        cordova.startActivityForResult(InAppBrowser.this, Intent.createChooser(content, "Select File"), FILECHOOSER_REQUESTCODE_LOLLIPOP);
                        return true;
                    }

                    // For Android 4.1+
                    public void openFileChooser(ValueCallback<Uri> uploadMsg, String acceptType, String capture)
                    {
                        LOG.d(LOG_TAG, "File Chooser 4.1+");
                        // Call file chooser for Android 3.0+
                        openFileChooser(uploadMsg, acceptType);
                    }

                    // For Android 3.0+
                    public void openFileChooser(ValueCallback<Uri> uploadMsg, String acceptType)
                    {
                        LOG.d(LOG_TAG, "File Chooser 3.0+");
                        mUploadCallback = uploadMsg;
                        Intent content = new Intent(Intent.ACTION_GET_CONTENT);
                        content.addCategory(Intent.CATEGORY_OPENABLE);

                        // run startActivityForResult
                        cordova.startActivityForResult(InAppBrowser.this, Intent.createChooser(content, "Select File"), FILECHOOSER_REQUESTCODE);
                    }

                });
                WebViewClient client = new InAppBrowserClient(thatWebView, edittext);
                inAppWebView.setWebViewClient(client);
                WebSettings settings = inAppWebView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
				settings.setBuiltInZoomControls(true);
				settings.setDisplayZoomControls(showZoomControls);
                settings.setPluginState(android.webkit.WebSettings.PluginState.ON);

                settings.setMediaPlaybackRequiresUserGesture(mediaPlaybackRequiresUserGesture);

                String overrideUserAgent = preferences.getString("OverrideUserAgent", null);
                String appendUserAgent = preferences.getString("AppendUserAgent", null);

                if (overrideUserAgent != null) {
                    settings.setUserAgentString(overrideUserAgent);
                }
                if (appendUserAgent != null) {
                    settings.setUserAgentString(settings.getUserAgentString() + appendUserAgent);
                }

                //Toggle whether this is enabled or not!
                Bundle appSettings = cordova.getActivity().getIntent().getExtras();
                boolean enableDatabase = appSettings == null || appSettings.getBoolean("InAppBrowserStorageEnabled", true);
                if (enableDatabase) {
                    String databasePath = cordova.getActivity().getApplicationContext().getDir("inAppBrowserDB", Context.MODE_PRIVATE).getPath();
                    settings.setDatabasePath(databasePath);
                    settings.setDatabaseEnabled(true);
                }
                settings.setDomStorageEnabled(true);

                if (clearAllCache) {
                    clearAllCache();
                } else if (clearSessionCache) {
                    clearSessionCache();
                }

                //check url
                String loadUrl = url;
                if (url.matches("^file:.*%3Cinappbrowser-last%3E$")){
                    if (closedUrl == null || closedUrl.isEmpty()) {
                        loadUrl = inAppBrowserHomeUrl;
                    }else{
                        loadUrl = closedUrl;
                    }
                }else if (url.matches("^file:.*%3Cinappbrowser-home%3E$")){
                    loadUrl = inAppBrowserHomeUrl;
                }
                inAppWebView.loadUrl(loadUrl);
                inAppWebView.getSettings().setLoadWithOverviewMode(true);
                inAppWebView.getSettings().setUseWideViewPort(useWideViewPort);
                inAppWebView.requestFocus();
                inAppWebView.requestFocusFromTouch();

                // Context bar layout
                final LinearLayout contextBar = new LinearLayout(cordova.getActivity());
                RelativeLayout.LayoutParams contextBarLayout = new RelativeLayout.LayoutParams(LayoutParams.MATCH_PARENT, this.dpToPixels(44));
                contextBarLayout.addRule(RelativeLayout.ALIGN_PARENT_BOTTOM);
                contextBar.setLayoutParams(contextBarLayout);
                contextBar.setPadding(this.dpToPixels(4), this.dpToPixels(4), this.dpToPixels(4), this.dpToPixels(4));
                contextBar.setContentDescription("Context bar");
                contextBar.setId(Integer.valueOf(8));
                contextBar.setBackgroundColor(toolbarColor);
                contextBar.setAlpha(0.9f); //see contextButton action for alpha value

                // Context menu button
                ImageButton contextButton = new ImageButton(cordova.getActivity());
                contextButton.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT, 0f));
                contextButton.setContentDescription("Context Button");
                contextButton.setId(Integer.valueOf(9));
                contextButton.setBackground(null);
                if (toolbarColor == blackColor)
                    contextButton.setColorFilter(blueColor);
                contextButton.setImageDrawable(getDrawableFromMyResources("ic_add_black_24dp"));
                contextButton.setScaleType(ImageView.ScaleType.FIT_CENTER);
                contextButton.setPadding(this.dpToPixels(8), this.dpToPixels(5), this.dpToPixels(8), this.dpToPixels(5));
                contextButton.getAdjustViewBounds();

                contextButton.setOnClickListener(new View.OnClickListener() {
                    float visAlpha = 0.9f;
                    public void onClick(View v) {
                        if (contextBar.getVisibility() == View.GONE){
                            final Animation fade = new AlphaAnimation(0.0f, visAlpha);
                            fade.setDuration(300);
                            fade.setAnimationListener(new Animation.AnimationListener(){
                                @Override
                                public void onAnimationStart(Animation animation){}
                                @Override
                                public void onAnimationRepeat(Animation animation){}
                                @Override
                                public void onAnimationEnd(Animation animation){
                                    contextBar.setAlpha(visAlpha);
                                }
                            });
                            contextBar.post(new Runnable() {
                                public void run() {
                                    contextBar.startAnimation(fade);
                                    contextBar.setVisibility(View.VISIBLE);
                                }
                            });
                        }else{
                            final Animation fade = new AlphaAnimation(visAlpha, 0.0f);
                            fade.setDuration(300);
                            fade.setAnimationListener(new Animation.AnimationListener(){
                                @Override
                                public void onAnimationStart(Animation animation){}
                                @Override
                                public void onAnimationRepeat(Animation animation){}
                                @Override
                                public void onAnimationEnd(Animation animation){
                                    contextBar.setVisibility(View.GONE);
                                }
                            });
                            contextBar.post(new Runnable() {
                                public void run() {
                                    contextBar.startAnimation(fade);
                                }
                            });
                        }
                    }
                });

                // Add our webview to our main view/layout
                inAppWebViewWrapper.addView(inAppWebView);
                // Add context bar on top of webView
                contextBar.addView(clearAllButton);
                contextBar.addView(homeButton);
                contextBar.addView(reload);
                inAppWebViewWrapper.addView(contextBar);
                contextBar.bringToFront();
                main.addView(inAppWebViewWrapper);
                contextBar.setVisibility(View.GONE);

                // Add buttons and edittext to toolbar
                toolbar.addView(close);
                if (showLocationBar) {
                    toolbar.addView(edittext);
                }else{
                    //TODO: add placeholder
                }
                if (!hardwareBackButton) {
                    toolbar.addView(back);
                    toolbar.addView(forward);
                }
                toolbar.addView(contextButton);

                // Don't add the toolbar if its been disabled
                if (getShowLocationBar()) {
                    // Add our toolbar to our main view/layout
                    main.addView(toolbar);
                }

                WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
                lp.copyFrom(dialog.getWindow().getAttributes());
                lp.width = WindowManager.LayoutParams.MATCH_PARENT;
                lp.height = WindowManager.LayoutParams.MATCH_PARENT;

                dialog.setContentView(main);
                dialog.show();
                dialog.getWindow().setAttributes(lp);
                // the goal of openhidden is to load the url and not display it
                // Show() needs to be called to cause the URL to be loaded
                if(openWindowHidden) {
                    dialog.hide();
                }
            }
        };
        this.cordova.getActivity().runOnUiThread(runnable);
        return "";
    }

    /**
     * Create a new plugin success result and send it back to JavaScript
     *
     * @param obj a JSONObject contain event payload information
     */
    private void sendUpdate(JSONObject obj, boolean keepCallback) {
        sendUpdate(obj, keepCallback, PluginResult.Status.OK);
    }

    /**
     * Create a new plugin result and send it back to JavaScript
     *
     * @param obj a JSONObject contain event payload information
     * @param status the status code to return to the JavaScript environment
     */
    private void sendUpdate(JSONObject obj, boolean keepCallback, PluginResult.Status status) {
        if (callbackContext != null) {
            PluginResult result = new PluginResult(status, obj);
            result.setKeepCallback(keepCallback);
            callbackContext.sendPluginResult(result);
            if (!keepCallback) {
                callbackContext = null;
            }
        }
    }

    /**
     * Receive File Data from File Chooser
     *
     * @param requestCode the requested code from chromeclient
     * @param resultCode the result code returned from android system
     * @param intent the data from android file chooser
     */
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        // For Android >= 5.0
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            LOG.d(LOG_TAG, "onActivityResult (For Android >= 5.0)");
            // If RequestCode or Callback is Invalid
            if(requestCode != FILECHOOSER_REQUESTCODE_LOLLIPOP || mUploadCallbackLollipop == null) {
                super.onActivityResult(requestCode, resultCode, intent);
                return;
            }
            mUploadCallbackLollipop.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, intent));
            mUploadCallbackLollipop = null;
        }
        // For Android < 5.0
        else {
            LOG.d(LOG_TAG, "onActivityResult (For Android < 5.0)");
            // If RequestCode or Callback is Invalid
            if(requestCode != FILECHOOSER_REQUESTCODE || mUploadCallback == null) {
                super.onActivityResult(requestCode, resultCode, intent);
                return;
            }

            if (null == mUploadCallback) return;
            Uri result = intent == null || resultCode != cordova.getActivity().RESULT_OK ? null : intent.getData();

            mUploadCallback.onReceiveValue(result);
            mUploadCallback = null;
        }
    }

    /**
     * The webview client receives notifications about appView
     */
    public class InAppBrowserClient extends WebViewClient {
        TextView edittext;
        CordovaWebView webView;

        /**
         * Constructor.
         *
         * @param webView
         * @param mEditText
         */
        public InAppBrowserClient(CordovaWebView webView, TextView mEditText) {
            this.webView = webView;
            this.edittext = mEditText;
        }

        /**
         * Override the URL that should be loaded
         *
         * This handles a small subset of all the URIs that would be encountered.
         *
         * @param webView
         * @param url
         */
        @Override
        public boolean shouldOverrideUrlLoading(WebView webView, String url) {
            if (url.startsWith(WebView.SCHEME_TEL)) {
                try {
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse(url));
                    cordova.getActivity().startActivity(intent);
                    return true;
                } catch (android.content.ActivityNotFoundException e) {
                    LOG.e(LOG_TAG, "Error dialing " + url + ": " + e.toString());
                }
            } else if (url.startsWith("geo:") || url.startsWith(WebView.SCHEME_MAILTO) || url.startsWith("market:") || url.startsWith("intent:")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse(url));
                    cordova.getActivity().startActivity(intent);
                    return true;
                } catch (android.content.ActivityNotFoundException e) {
                    LOG.e(LOG_TAG, "Error with " + url + ": " + e.toString());
                }
            }
            // If sms:5551212?body=This is the message
            else if (url.startsWith("sms:")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);

                    // Get address
                    String address = null;
                    int parmIndex = url.indexOf('?');
                    if (parmIndex == -1) {
                        address = url.substring(4);
                    } else {
                        address = url.substring(4, parmIndex);

                        // If body, then set sms body
                        Uri uri = Uri.parse(url);
                        String query = uri.getQuery();
                        if (query != null) {
                            if (query.startsWith("body=")) {
                                intent.putExtra("sms_body", query.substring(5));
                            }
                        }
                    }
                    intent.setData(Uri.parse("sms:" + address));
                    intent.putExtra("address", address);
                    intent.setType("vnd.android-dir/mms-sms");
                    cordova.getActivity().startActivity(intent);
                    return true;
                } catch (android.content.ActivityNotFoundException e) {
                    LOG.e(LOG_TAG, "Error sending sms " + url + ":" + e.toString());
                }
            }
            return false;
        }

        /*
        Update URL UI element
         */
        public void updateUrlIndicator(String newUrl){
            if (!newUrl.equals(edittext.getText().toString())) {
                if (newUrl.startsWith("file") && newUrl.contains("/android_asset/")){
                    edittext.setText("-SEPIA-");
                }else{
                    edittext.setText(newUrl);
                }
            }
        }

        /*
         * onPageStarted fires the LOAD_START_EVENT
         *
         * @param view
         * @param url
         * @param favicon
         */
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            String newloc = "";
            if (url.startsWith("http:") || url.startsWith("https:") || url.startsWith("file:")) {
                newloc = url;
            }
            else
            {
                // Assume that everything is HTTP at this point, because if we don't specify,
                // it really should be.  Complain loudly about this!!!
                LOG.e(LOG_TAG, "Possible Uncaught/Unknown URI");
                newloc = "http://" + url;
            }

            // Update the UI if we haven't already
            updateUrlIndicator("Loading...");

            try {
                JSONObject obj = new JSONObject();
                obj.put("type", LOAD_START_EVENT);
                obj.put("url", newloc);
                sendUpdate(obj, true);
            } catch (JSONException ex) {
                LOG.e(LOG_TAG, "URI passed in has caused a JSON error.");
            }
        }



        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);

            // CB-10395 InAppBrowser's WebView not storing cookies reliable to local device storage
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                CookieManager.getInstance().flush();
            } else {
                CookieSyncManager.getInstance().sync();
            }

            // Update the UI if we haven't already
            updateUrlIndicator(url);

            // https://issues.apache.org/jira/browse/CB-11248
            view.clearFocus();
            view.requestFocus();

            try {
                JSONObject obj = new JSONObject();
                obj.put("type", LOAD_STOP_EVENT);
                obj.put("url", url);

                sendUpdate(obj, true);
            } catch (JSONException ex) {
                LOG.d(LOG_TAG, "Should never happen");
            }
        }

        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            super.onReceivedError(view, errorCode, description, failingUrl);

            // Update the UI if we haven't already
            updateUrlIndicator("Page error");

            try {
                JSONObject obj = new JSONObject();
                obj.put("type", LOAD_ERROR_EVENT);
                obj.put("url", failingUrl);
                obj.put("code", errorCode);
                obj.put("message", description);

                sendUpdate(obj, true, PluginResult.Status.ERROR);
            } catch (JSONException ex) {
                LOG.d(LOG_TAG, "Should never happen");
            }
        }

        @Override
        public void doUpdateVisitedHistory (WebView view, String url, boolean isReload) {
            super.doUpdateVisitedHistory(view, url, isReload);

            // Update the UI if we haven't already
            if (!isReload) {
                //LOG.d(LOG_TAG, "update history: " + url);   //DEBUG
                updateUrlIndicator(view.getUrl());          //USE this NOT 'url'
                //NOTE: for some reason 'url' is showing all page activity like background ad stuff etc., but it does not go to history
            }
        }
        private String currentUrlinHistory = "";

        /**
         * On received http auth request.
         */
        @Override
        public void onReceivedHttpAuthRequest(WebView view, HttpAuthHandler handler, String host, String realm) {

            // Check if there is some plugin which can resolve this auth challenge
            PluginManager pluginManager = null;
            try {
                Method gpm = webView.getClass().getMethod("getPluginManager");
                pluginManager = (PluginManager)gpm.invoke(webView);
            } catch (NoSuchMethodException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            } catch (IllegalAccessException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            } catch (InvocationTargetException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            }

            if (pluginManager == null) {
                try {
                    Field pmf = webView.getClass().getField("pluginManager");
                    pluginManager = (PluginManager)pmf.get(webView);
                } catch (NoSuchFieldException e) {
                    LOG.d(LOG_TAG, e.getLocalizedMessage());
                } catch (IllegalAccessException e) {
                    LOG.d(LOG_TAG, e.getLocalizedMessage());
                }
            }

            if (pluginManager != null && pluginManager.onReceivedHttpAuthRequest(webView, new CordovaHttpAuthHandler(handler), host, realm)) {
                return;
            }

            // By default handle 401 like we'd normally do!
            super.onReceivedHttpAuthRequest(view, handler, host, realm);
        }
    }
}
