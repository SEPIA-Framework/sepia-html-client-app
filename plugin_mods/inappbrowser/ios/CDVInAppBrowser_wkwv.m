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

#import "CDVInAppBrowser.h"
#import "CDVWKProcessPoolFactory.h"
#import <Cordova/CDVPluginResult.h>
#import <Cordova/CDVUserAgentUtil.h>

#define    kInAppBrowserTargetSelf @"_self"
#define    kInAppBrowserTargetSystem @"_system"
#define    kInAppBrowserTargetBlank @"_blank"

#define    kInAppBrowserToolbarBarPositionBottom @"bottom"
#define    kInAppBrowserToolbarBarPositionTop @"top"

#define    IAB_BRIDGE_NAME @"cordova_iab"

#define    INAPP_HOME_URL @"file:<inappbrowser-home>"

#pragma mark CDVInAppBrowser

static float STATUSBAR_HEIGHT = 20.0;
static float TOOLBAR_HEIGHT = 44.0;
static float CONTEXTBAR_HEIGHT = 44.0;
static float FOOTER_HEIGHT = 0.0;

static NSURL *closedUrl;
static NSURL *inappHome;

@interface CDVInAppBrowser () {
    NSInteger _previousStatusBarStyle;
}
@end

@implementation CDVInAppBrowser

- (void)pluginInitialize
{
    _previousStatusBarStyle = -1;
    _callbackIdPattern = nil;
    
    inappHome = [NSURL URLWithString:INAPP_HOME_URL];
}

- (id)settingForKey:(NSString*)key
{
    return [self.commandDelegate.settings objectForKey:[key lowercaseString]];
}

- (void)onReset
{
    [self close:nil];
}

- (void)close:(CDVInvokedUrlCommand*)command
{
    if (self.inAppBrowserViewController == nil) {
        NSLog(@"IAB.close() called but it was already closed.");
        return;
    }
    // Things are cleaned up in browserExit.
    [self.inAppBrowserViewController close];
}

- (BOOL) isSystemUrl:(NSURL*)url
{
    if ([[url host] isEqualToString:@"itunes.apple.com"]) {
        return YES;
    }
    
    return NO;
}

- (void)open:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult;
    
    NSString* url = [command argumentAtIndex:0];
    NSString* target = [command argumentAtIndex:1 withDefault:kInAppBrowserTargetSelf];
    NSString* options = [command argumentAtIndex:2 withDefault:@"" andClass:[NSString class]];
    
    self.callbackId = command.callbackId;
    
    if (url != nil) {
#ifdef __CORDOVA_4_0_0
        NSURL* baseUrl = [self.webViewEngine URL];
#else
        NSURL* baseUrl = [self.webView.request URL];
#endif
        NSURL* absoluteUrl = [[NSURL URLWithString:url relativeToURL:baseUrl] absoluteURL];
        
        if ([self isSystemUrl:absoluteUrl]) {
            target = kInAppBrowserTargetSystem;
        }
        
        if ([target isEqualToString:kInAppBrowserTargetSelf]) {
            [self openInCordovaWebView:absoluteUrl withOptions:options];
        } else if ([target isEqualToString:kInAppBrowserTargetSystem]) {
            [self openInSystem:absoluteUrl];
        } else if ([target isEqualToString:kInAppBrowserTargetBlank]) {
            //[self openInCordovaWebView:absoluteUrl withOptions:options];
            [self openInInAppBrowser:absoluteUrl withOptions:options];
        } else { //anything else
            //[self openInCordovaWebView:absoluteUrl withOptions:options];
            [self openInInAppBrowser:absoluteUrl withOptions:options];
        }
        
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"incorrect number of arguments"];
    }
    
    [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)clearAllData:(void (^ _Nonnull)(void))completion;
{
    NSSet *websiteDataTypes = [WKWebsiteDataStore allWebsiteDataTypes];
    NSDate *dateFrom = [NSDate dateWithTimeIntervalSince1970:0];
    [[WKWebsiteDataStore defaultDataStore] removeDataOfTypes:websiteDataTypes modifiedSince:dateFrom completionHandler:completion];
}
- (void)clearCache:(void (^ _Nonnull)(void))completion;
{
    NSSet *websiteDataTypes = [NSSet setWithArray:@[
            WKWebsiteDataTypeOfflineWebApplicationCache,
            WKWebsiteDataTypeMemoryCache,
            WKWebsiteDataTypeCookies,
            WKWebsiteDataTypeSessionStorage,
    ]];
    //NSSet *websiteDataTypes = [WKWebsiteDataStore allWebsiteDataTypes];
    NSDate *dateFrom = [NSDate dateWithTimeIntervalSince1970:0];
    [[WKWebsiteDataStore defaultDataStore] removeDataOfTypes:websiteDataTypes modifiedSince:dateFrom completionHandler:completion];
}
- (void)clearSessionStorage:(void (^ _Nonnull)(void))completion;
{
    NSSet *websiteDataTypes = [NSSet setWithArray:@[
            //WKWebsiteDataTypeMemoryCache,
            WKWebsiteDataTypeSessionStorage
    ]];
    NSDate *dateFrom = [NSDate dateWithTimeIntervalSince1970:0];
    [[WKWebsiteDataStore defaultDataStore] removeDataOfTypes:websiteDataTypes modifiedSince:dateFrom completionHandler:completion];
}

- (void)openInInAppBrowser:(NSURL*)url withOptions:(NSString*)options
{
    [self openInInAppBrowser:url withOptions:options withCacheSkip:NO];
}
- (void)openInInAppBrowser:(NSURL*)url withOptions:(NSString*)options withCacheSkip:(BOOL)skipCache
{
    CDVInAppBrowserOptions* browserOptions = [CDVInAppBrowserOptions parseOptions:options];
    
    if (!skipCache && browserOptions.clearcache) {
        [self clearCache:^{
            //NSLog(@"Full Cache cleared");
            [self openInInAppBrowser:url withOptions:options withCacheSkip:YES];
        }];
        return;     //<- workaround to wait for completion handler
        
    }else if (!skipCache && browserOptions.clearsessioncache) {
        [self clearSessionStorage:^{
            //Done, now clear session cookies too
            NSHTTPCookie *cookie;
            NSHTTPCookieStorage *storage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
            for (cookie in [storage cookies])
            {
                if (![cookie.domain isEqual: @".^filecookies^"] && cookie.isSessionOnly) {
                    [storage deleteCookie:cookie];
                }
            }
            //NSLog(@"Session Cache cleared");
            [self openInInAppBrowser:url withOptions:options withCacheSkip:YES];
        }];
        return;     //<- workaround to wait for completion handler
    }
    
    if (self.inAppBrowserViewController == nil) {
        NSString* userAgent = [CDVUserAgentUtil originalUserAgent];
        NSString* overrideUserAgent = [self settingForKey:@"OverrideUserAgent"];
        NSString* appendUserAgent = [self settingForKey:@"AppendUserAgent"];
        if(overrideUserAgent){
            userAgent = overrideUserAgent;
        }
        if(appendUserAgent){
            userAgent = [userAgent stringByAppendingString: appendUserAgent];
        }
        self.inAppBrowserViewController = [[CDVInAppBrowserViewController alloc] initWithUserAgent:userAgent prevUserAgent:[self.commandDelegate userAgent] browserOptions: browserOptions];
        self.inAppBrowserViewController.navigationDelegate = self;
        
        if ([self.viewController conformsToProtocol:@protocol(CDVScreenOrientationDelegate)]) {
            self.inAppBrowserViewController.orientationDelegate = (UIViewController <CDVScreenOrientationDelegate>*)self.viewController;
        }
    }
    
    [self.inAppBrowserViewController showLocationBar:browserOptions.location];
    [self.inAppBrowserViewController showToolBar:browserOptions.toolbar :browserOptions.toolbarposition];
    if (browserOptions.closebuttoncaption != nil) {
        [self.inAppBrowserViewController setCloseButtonTitle:browserOptions.closebuttoncaption];
    }
    // Set Presentation Style
    UIModalPresentationStyle presentationStyle = UIModalPresentationFullScreen; // default
    if (browserOptions.presentationstyle != nil) {
        if ([[browserOptions.presentationstyle lowercaseString] isEqualToString:@"pagesheet"]) {
            presentationStyle = UIModalPresentationPageSheet;
        } else if ([[browserOptions.presentationstyle lowercaseString] isEqualToString:@"formsheet"]) {
            presentationStyle = UIModalPresentationFormSheet;
        }
    }
    self.inAppBrowserViewController.modalPresentationStyle = presentationStyle;
    
    // Set Transition Style
    UIModalTransitionStyle transitionStyle = UIModalTransitionStyleCoverVertical; // default
    if (browserOptions.transitionstyle != nil) {
        if ([[browserOptions.transitionstyle lowercaseString] isEqualToString:@"fliphorizontal"]) {
            transitionStyle = UIModalTransitionStyleFlipHorizontal;
        } else if ([[browserOptions.transitionstyle lowercaseString] isEqualToString:@"crossdissolve"]) {
            transitionStyle = UIModalTransitionStyleCrossDissolve;
        }
    }
    self.inAppBrowserViewController.modalTransitionStyle = transitionStyle;
    
    //prevent webView from bouncing
    if (browserOptions.disallowoverscroll) {
        if ([self.inAppBrowserViewController.webView respondsToSelector:@selector(scrollView)]) {
            ((UIScrollView*)[self.inAppBrowserViewController.webView scrollView]).bounces = NO;
        } else {
            for (id subview in self.inAppBrowserViewController.webView.subviews) {
                if ([[subview class] isSubclassOfClass:[UIScrollView class]]) {
                    ((UIScrollView*)subview).bounces = NO;
                }
            }
        }
    }
    
    
    [self.inAppBrowserViewController navigateTo:url];
    [self show:nil withNoAnimate:browserOptions.hidden];
}

- (void)show:(CDVInvokedUrlCommand*)command{
    [self show:command withNoAnimate:NO];
}

- (void)show:(CDVInvokedUrlCommand*)command withNoAnimate:(BOOL)noAnimate
{
    BOOL initHidden = NO;
    if(command == nil && noAnimate == YES){
        initHidden = YES;
    }
    
    if (self.inAppBrowserViewController == nil) {
        NSLog(@"Tried to show IAB after it was closed.");
        return;
    }
    if (_previousStatusBarStyle != -1) {
        NSLog(@"Tried to show IAB while already shown");
        return;
    }
    
    if(!initHidden){
        _previousStatusBarStyle = [UIApplication sharedApplication].statusBarStyle;
    }
    
    __block CDVInAppBrowserNavigationController* nav = [[CDVInAppBrowserNavigationController alloc]
                                                        initWithRootViewController:self.inAppBrowserViewController];
    nav.orientationDelegate = self.inAppBrowserViewController;
    nav.navigationBarHidden = YES;
    nav.modalPresentationStyle = self.inAppBrowserViewController.modalPresentationStyle;
    
    __weak CDVInAppBrowser* weakSelf = self;
    
    // Run later to avoid the "took a long time" log message.
    dispatch_async(dispatch_get_main_queue(), ^{
        if (weakSelf.inAppBrowserViewController != nil) {
            CGRect frame = [[UIScreen mainScreen] bounds];
            if(initHidden){
                frame.origin.x = -10000;
            }
            
            UIWindow *tmpWindow = [[UIWindow alloc] initWithFrame:frame];
            UIViewController *tmpController = [[UIViewController alloc] init];
            [tmpWindow setRootViewController:tmpController];
            [tmpWindow setWindowLevel:UIWindowLevelNormal];
            
            [tmpWindow makeKeyAndVisible];
            [tmpController presentViewController:nav animated:!noAnimate completion:nil];
        }
    });
}

- (void)hide:(CDVInvokedUrlCommand*)command
{
    if (self.inAppBrowserViewController == nil) {
        NSLog(@"Tried to hide IAB after it was closed.");
        return;
        
        
    }
    if (_previousStatusBarStyle == -1) {
        NSLog(@"Tried to hide IAB while already hidden");
        return;
    }
    
    _previousStatusBarStyle = [UIApplication sharedApplication].statusBarStyle;
    
    // Run later to avoid the "took a long time" log message.
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.inAppBrowserViewController != nil) {
            _previousStatusBarStyle = -1;
            [self.inAppBrowserViewController.presentingViewController dismissViewControllerAnimated:YES completion:nil];
        }
    });
}

- (void)openInCordovaWebView:(NSURL*)url withOptions:(NSString*)options
{
    NSURLRequest* request = [NSURLRequest requestWithURL:url];
    
#ifdef __CORDOVA_4_0_0
    // the webview engine itself will filter for this according to <allow-navigation> policy
    // in config.xml for cordova-ios-4.0
    [self.webViewEngine loadRequest:request];
#else
    if ([self.commandDelegate URLIsWhitelisted:url]) {
        [self.webView loadRequest:request];
    } else { // this assumes the InAppBrowser can be excepted from the white-list
        [self openInInAppBrowser:url withOptions:options];
    }
#endif
}

- (void)openInSystem:(NSURL*)url
{
    [[NSNotificationCenter defaultCenter] postNotification:[NSNotification notificationWithName:CDVPluginHandleOpenURLNotification object:url]];
    if (@available(iOS 10.0, *)){
        [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
        //read to understand options: https://useyourloaf.com/blog/openurl-deprecated-in-ios10/
    }else{
        [[UIApplication sharedApplication] openURL:url];
    }
}

// This is a helper method for the inject{Script|Style}{Code|File} API calls, which
// provides a consistent method for injecting JavaScript code into the document.
//
// If a wrapper string is supplied, then the source string will be JSON-encoded (adding
// quotes) and wrapped using string formatting. (The wrapper string should have a single
// '%@' marker).
//
// If no wrapper is supplied, then the source string is executed directly.

- (void)injectDeferredObject:(NSString*)source withWrapper:(NSString*)jsWrapper
{
    // Ensure a message handler bridge is created to communicate with the CDVInAppBrowserViewController
    [self evaluateJavaScript: [NSString stringWithFormat:@"(function(w){if(!w._cdvMessageHandler) {w._cdvMessageHandler = function(id,d){w.webkit.messageHandlers.%@.postMessage({d:d, id:id});}}})(window)", IAB_BRIDGE_NAME]];
    
    if (jsWrapper != nil) {
        NSData* jsonData = [NSJSONSerialization dataWithJSONObject:@[source] options:0 error:nil];
        NSString* sourceArrayString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        if (sourceArrayString) {
            NSString* sourceString = [sourceArrayString substringWithRange:NSMakeRange(1, [sourceArrayString length] - 2)];
            NSString* jsToInject = [NSString stringWithFormat:jsWrapper, sourceString];
            [self evaluateJavaScript:jsToInject];
        }
    } else {
        [self evaluateJavaScript:source];
    }
}


//Synchronus helper for javascript evaluation

- (NSString *)evaluateJavaScript:(NSString *)script {
    __block NSString *resultString = nil;
    __block BOOL finished = NO;
    __block NSString* _script = script;
    
    [self.inAppBrowserViewController.webView evaluateJavaScript:script completionHandler:^(id result, NSError *error) {
        if (error == nil) {
            if (result != nil) {
                resultString = result;
                NSLog(@"%@", resultString);
            }
        } else {
            NSLog(@"evaluateJavaScript error : %@ : %@", error.localizedDescription, _script);
        }
        finished = YES;
    }];
    
    while (!finished)
    {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
    }
    
    return resultString;
}

- (void)injectScriptCode:(CDVInvokedUrlCommand*)command
{
    NSString* jsWrapper = nil;
    
    if ((command.callbackId != nil) && ![command.callbackId isEqualToString:@"INVALID"]) {
        jsWrapper = [NSString stringWithFormat:@"_cdvMessageHandler('%@',JSON.stringify([eval(%%@)]));", command.callbackId];
    }
    [self injectDeferredObject:[command argumentAtIndex:0] withWrapper:jsWrapper];
}

- (void)injectScriptFile:(CDVInvokedUrlCommand*)command
{
    NSString* jsWrapper;
    
    if ((command.callbackId != nil) && ![command.callbackId isEqualToString:@"INVALID"]) {
        jsWrapper = [NSString stringWithFormat:@"(function(d) { var c = d.createElement('script'); c.src = %%@; c.onload = function() { _cdvMessageHandler('%@'); }; d.body.appendChild(c); })(document)", command.callbackId];
    } else {
        jsWrapper = @"(function(d) { var c = d.createElement('script'); c.src = %@; d.body.appendChild(c); })(document)";
    }
    [self injectDeferredObject:[command argumentAtIndex:0] withWrapper:jsWrapper];
}

- (void)injectStyleCode:(CDVInvokedUrlCommand*)command
{
    NSString* jsWrapper;
    
    if ((command.callbackId != nil) && ![command.callbackId isEqualToString:@"INVALID"]) {
        jsWrapper = [NSString stringWithFormat:@"(function(d) { var c = d.createElement('style'); c.innerHTML = %%@; c.onload = function() { _cdvMessageHandler('%@'); }; d.body.appendChild(c); })(document)", command.callbackId];
    } else {
        jsWrapper = @"(function(d) { var c = d.createElement('style'); c.innerHTML = %@; d.body.appendChild(c); })(document)";
    }
    [self injectDeferredObject:[command argumentAtIndex:0] withWrapper:jsWrapper];
}

- (void)injectStyleFile:(CDVInvokedUrlCommand*)command
{
    NSString* jsWrapper;
    
    if ((command.callbackId != nil) && ![command.callbackId isEqualToString:@"INVALID"]) {
        jsWrapper = [NSString stringWithFormat:@"(function(d) { var c = d.createElement('link'); c.rel='stylesheet'; c.type='text/css'; c.href = %%@; c.onload = function() { _cdvMessageHandler('%@'); }; d.body.appendChild(c); })(document)", command.callbackId];
    } else {
        jsWrapper = @"(function(d) { var c = d.createElement('link'); c.rel='stylesheet', c.type='text/css'; c.href = %@; d.body.appendChild(c); })(document)";
    }
    [self injectDeferredObject:[command argumentAtIndex:0] withWrapper:jsWrapper];
}

- (BOOL)isValidCallbackId:(NSString *)callbackId
{
    NSError *err = nil;
    // Initialize on first use
    if (self.callbackIdPattern == nil) {
        self.callbackIdPattern = [NSRegularExpression regularExpressionWithPattern:@"^InAppBrowser[0-9]{1,10}$" options:0 error:&err];
        if (err != nil) {
            // Couldn't initialize Regex; No is safer than Yes.
            return NO;
        }
    }
    if ([self.callbackIdPattern firstMatchInString:callbackId options:0 range:NSMakeRange(0, [callbackId length])]) {
        return YES;
    }
    return NO;
}

/**
 * The message handler bridge provided for the InAppBrowser is capable of executing any oustanding callback belonging
 * to the InAppBrowser plugin. Care has been taken that other callbacks cannot be triggered, and that no
 * other code execution is possible.
 */
- (BOOL)webView:(WKWebView*)theWebView decidePolicyForNavigationAction:(NSURLRequest*)request
{
    NSURL* url = request.URL;
    BOOL isTopLevelNavigation = [request.URL isEqual:[request mainDocumentURL]];
    
    //if is an app store link, let the system handle it, otherwise it fails to load it
    if ([[ url scheme] isEqualToString:@"itms-appss"] || [[ url scheme] isEqualToString:@"itms-apps"]) {
        [theWebView stopLoading];
        [self openInSystem:url];
        return NO;
    }
    else if ((self.callbackId != nil) && isTopLevelNavigation) {
        // Send a loadstart event for each top-level navigation (includes redirects).
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                      messageAsDictionary:@{@"type":@"loadstart", @"url":[url absoluteString]}];
        [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
        
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];
    }
    
    return YES;
}

#pragma mark WKScriptMessageHandler delegate
- (void)userContentController:(nonnull WKUserContentController *)userContentController didReceiveScriptMessage:(nonnull WKScriptMessage *)message {
    
    CDVPluginResult* pluginResult = nil;
    
    NSDictionary* messageContent = (NSDictionary*) message.body;
    NSString* scriptCallbackId = messageContent[@"id"];
    
    if([messageContent objectForKey:@"d"]){
        NSString* scriptResult = messageContent[@"d"];
        NSError* __autoreleasing error = nil;
        NSData* decodedResult = [NSJSONSerialization JSONObjectWithData:[scriptResult dataUsingEncoding:NSUTF8StringEncoding] options:kNilOptions error:&error];
        if ((error == nil) && [decodedResult isKindOfClass:[NSArray class]]) {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:(NSArray*)decodedResult];
        } else {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_JSON_EXCEPTION];
        }
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:@[]];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:scriptCallbackId];
}

- (void)didStartProvisionalNavigation:(WKWebView*)theWebView
{
}

- (void)didFinishNavigation:(WKWebView*)theWebView
{
    if (self.callbackId != nil) {
        // TODO: It would be more useful to return the URL the page is actually on (e.g. if it's been redirected).
        NSString* url = [self.inAppBrowserViewController.currentURL absoluteString];
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                      messageAsDictionary:@{@"type":@"loadstop", @"url":url}];
        [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
        
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];
    }
}

- (void)webView:(WKWebView*)theWebView didFailNavigation:(NSError*)error
{
    if (self.callbackId != nil) {
        NSString* url = [self.inAppBrowserViewController.currentURL absoluteString];
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                                      messageAsDictionary:@{@"type":@"loaderror", @"url":url, @"code": [NSNumber numberWithInteger:error.code], @"message": error.localizedDescription}];
        [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
        
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];
    }
}

- (void)browserExit
{
    if (self.callbackId != nil) {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                      messageAsDictionary:@{@"type":@"exit"}];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];
        self.callbackId = nil;
    }
    
    [self.inAppBrowserViewController.configuration.userContentController removeScriptMessageHandlerForName:IAB_BRIDGE_NAME];
    self.inAppBrowserViewController.configuration = nil;
    
    [self.inAppBrowserViewController.webView stopLoading];
    [self.inAppBrowserViewController.webView removeFromSuperview];
    [self.inAppBrowserViewController.webView setUIDelegate:nil];
    [self.inAppBrowserViewController.webView setNavigationDelegate:nil];
    self.inAppBrowserViewController.webView = nil;
    
    // Set navigationDelegate to nil to ensure no callbacks are received from it.
    self.inAppBrowserViewController.navigationDelegate = nil;
    self.inAppBrowserViewController = nil;
    
    /*
    if (IsAtLeastiOSVersion(@"7.0")) {
        if (_previousStatusBarStyle != -1) {
            [[UIApplication sharedApplication] setStatusBarStyle:_previousStatusBarStyle];
        }
    }
     */
    
    _previousStatusBarStyle = -1; // this value was reset before reapplying it. caused statusbar to stay black on ios7
}

@end //CDVInAppBrowser

#pragma mark CDVInAppBrowserViewController

@implementation CDVInAppBrowserViewController

@synthesize currentURL;

BOOL viewRenderedAtLeastOnce = FALSE;
BOOL isExiting = FALSE;

- (id)initWithUserAgent:(NSString*)userAgent prevUserAgent:(NSString*)prevUserAgent browserOptions: (CDVInAppBrowserOptions*) browserOptions
{
    self = [super init];
    if (self != nil) {
        _userAgent = userAgent;
        _prevUserAgent = prevUserAgent;
        _browserOptions = browserOptions;
#ifdef __CORDOVA_4_0_0
        _webViewDelegate = [[CDVWKWebViewUIDelegate alloc] initWithTitle:@"cordova"];
        //_webViewDelegate = [[CDVUIWebViewDelegate alloc] initWithDelegate:self];
#else
        _webViewDelegate = [[CDVWebViewDelegate alloc] initWithDelegate:self];
#endif
        
        [self createViews];
    }
    
    return self;
}

-(void)dealloc {
    //NSLog(@"dealloc");
}

- (void)createViews
{
    // We create the views in code for primarily for ease of upgrades and not requiring an external .xib to be included
    
    WKUserContentController* userContentController = [[WKUserContentController alloc] init];
    
    WKWebViewConfiguration* configuration = [[WKWebViewConfiguration alloc] init];
    configuration.userContentController = userContentController;
    configuration.processPool = [[CDVWKProcessPoolFactory sharedFactory] sharedProcessPool];
    [configuration.userContentController addScriptMessageHandler:self name:IAB_BRIDGE_NAME];
    
    //Get new values for bars depending on safe areas etc.
    UIViewController *controller = [UIApplication sharedApplication].keyWindow.rootViewController;
    if (@available(iOS 11.0, *)){
        STATUSBAR_HEIGHT = controller.view.safeAreaInsets.top;
        FOOTER_HEIGHT = controller.view.safeAreaInsets.bottom;
    }
    self.view.backgroundColor = [UIColor blackColor];
    
    CGRect statusBarRect = CGRectMake(0.0, 0.0, self.view.bounds.size.width, STATUSBAR_HEIGHT);
    UIView* statusBar = [[UIView alloc] initWithFrame:statusBarRect];
    statusBar.alpha = 1.0;
    statusBar.opaque = YES;
    statusBar.backgroundColor = [UIColor blackColor];
    statusBar.hidden = NO;
    [self.view addSubview:statusBar];
    
    CGRect webViewBounds = self.view.bounds;
    webViewBounds.size.height -= (STATUSBAR_HEIGHT + TOOLBAR_HEIGHT + FOOTER_HEIGHT);
    webViewBounds.origin.y = STATUSBAR_HEIGHT;
    self.webView = [[WKWebView alloc] initWithFrame:webViewBounds configuration:configuration];
    CDVWKWebViewUIDelegate* webViewUIDelegate = [[CDVWKWebViewUIDelegate alloc] initWithTitle:[[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleDisplayName"]];
    ((WKWebView*)self.webView).UIDelegate = webViewUIDelegate;
    
    [self.view addSubview:self.webView];
    [self.view sendSubviewToBack:self.webView];
    
    self.webView.navigationDelegate = self;
    self.webView.UIDelegate = self;
    self.webView.backgroundColor = [UIColor colorWithRed:0.0f/255.0f green:0.0f/255.0f blue:0.0f/255.0f alpha:1.0]; //[UIColor blackColor];
    
    self.webView.clearsContextBeforeDrawing = YES;
    self.webView.clipsToBounds = YES;
    self.webView.contentMode = UIViewContentModeScaleToFill;
    self.webView.multipleTouchEnabled = YES;
    self.webView.opaque = YES;
    self.webView.userInteractionEnabled = YES;
    self.webView.allowsBackForwardNavigationGestures = YES;
    if (_browserOptions.disableswipenavigation){
        self.webView.allowsBackForwardNavigationGestures = NO;
    }else{
        self.webView.allowsBackForwardNavigationGestures = YES;
    }
    if (@available(iOS 11.0, *)) {
        self.webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    } else {
        self.automaticallyAdjustsScrollViewInsets = NO;
    }
    [self.webView setAutoresizingMask:UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth];
    
    
    self.spinner = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleWhiteLarge];
    self.spinner.alpha = 1.000;
    self.spinner.autoresizesSubviews = YES;
    self.spinner.autoresizingMask = (UIViewAutoresizingFlexibleLeftMargin | UIViewAutoresizingFlexibleTopMargin | UIViewAutoresizingFlexibleBottomMargin | UIViewAutoresizingFlexibleRightMargin);
    self.spinner.clearsContextBeforeDrawing = NO;
    self.spinner.clipsToBounds = NO;
    self.spinner.contentMode = UIViewContentModeScaleToFill;
    self.spinner.frame = CGRectMake(CGRectGetMidX(self.webView.frame) - 15.0, CGRectGetMidY(self.webView.frame) - 15.0, 30.0, 30.0);
    self.spinner.hidden = NO;
    self.spinner.hidesWhenStopped = YES;
    self.spinner.multipleTouchEnabled = NO;
    self.spinner.opaque = NO;
    self.spinner.userInteractionEnabled = NO;
    [self.spinner stopAnimating];
    //Add
    [self.view addSubview:self.spinner];
    
    self.closeButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemStop target:self action:@selector(close)];
    self.closeButton.enabled = YES;
    self.closeButton.width = 35.0;
    
    float toolbarY = self.view.bounds.size.height - (TOOLBAR_HEIGHT + FOOTER_HEIGHT);
    CGRect toolbarFrame = CGRectMake(0.0, toolbarY, self.view.bounds.size.width, TOOLBAR_HEIGHT);
    self.toolbar = [[UIToolbar alloc] initWithFrame:toolbarFrame];
    self.toolbar.alpha = 1.000;
    self.toolbar.autoresizesSubviews = YES;
    self.toolbar.autoresizingMask = (UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleTopMargin);
    self.toolbar.barStyle = UIBarStyleBlack;
    //self.toolbar.backgroundColor = [UIColor blackColor];
    self.toolbar.clearsContextBeforeDrawing = YES;
    self.toolbar.clipsToBounds = YES;
    self.toolbar.contentMode = UIViewContentModeScaleToFill;
    self.toolbar.hidden = NO;
    self.toolbar.multipleTouchEnabled = NO;
    self.toolbar.opaque = YES;
    self.toolbar.translucent = NO;
    self.toolbar.userInteractionEnabled = YES;
    
	if (_browserOptions.disableswipenavigation){
		self.addressLabel = [[UILabel alloc] initWithFrame:CGRectMake(0, 5.0, self.view.bounds.size.width - 200.0, 21.0)];
	}else{
		self.addressLabel = [[UILabel alloc] initWithFrame:CGRectMake(0, 5.0, self.view.bounds.size.width - 120.0, 21.0)];
	}
    self.addressLabel.adjustsFontSizeToFitWidth = NO;
    self.addressLabel.alpha = 1.000;
    self.addressLabel.autoresizesSubviews = NO;
    //self.addressLabel.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleRightMargin | UIViewAutoresizingFlexibleTopMargin;
    self.addressLabel.backgroundColor = [UIColor clearColor]; //[UIColor colorWithRed:60.0 / 255.0 green:136.0 / 255.0 blue:230.0 / 255.0 alpha:0.0 ];
    self.addressLabel.baselineAdjustment = UIBaselineAdjustmentAlignCenters;
    self.addressLabel.clearsContextBeforeDrawing = YES;
    self.addressLabel.clipsToBounds = YES;
    self.addressLabel.contentMode = UIViewContentModeScaleAspectFill; //UIViewContentModeScaleToFill;
    self.addressLabel.enabled = YES;
    self.addressLabel.hidden = NO;
    self.addressLabel.lineBreakMode = NSLineBreakByTruncatingTail;
    /*
    if ([self.addressLabel respondsToSelector:NSSelectorFromString(@"setMinimumScaleFactor:")]) {
        [self.addressLabel setValue:@(10.0/[UIFont labelFontSize]) forKey:@"minimumScaleFactor"];
    } else if ([self.addressLabel respondsToSelector:NSSelectorFromString(@"setMinimumFontSize:")]) {
        [self.addressLabel setValue:@(10.0) forKey:@"minimumFontSize"];
    }
    */
    self.addressLabel.multipleTouchEnabled = NO;
    self.addressLabel.numberOfLines = 1;
    self.addressLabel.opaque = NO;
    self.addressLabel.shadowOffset = CGSizeMake(0.0, -1.0);
    self.addressLabel.text = NSLocalizedString(@"Loading...", nil);
    self.addressLabel.textAlignment = NSTextAlignmentCenter;
    self.addressLabel.textColor = [UIColor colorWithWhite:1.000 alpha:1.000];
	[self.addressLabel setFont:[UIFont systemFontOfSize:10]];
    //Gesture
    UITapGestureRecognizer* addressLabelGesture = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(userTappedOnAddress:)];
    self.addressLabel.userInteractionEnabled = YES;
    [self.addressLabel addGestureRecognizer:addressLabelGesture];
	//Button wrapper
	self.urlButton = [[UIBarButtonItem alloc] initWithCustomView:self.addressLabel];
    
    float contextBarY = self.view.bounds.size.height - (CONTEXTBAR_HEIGHT + TOOLBAR_HEIGHT + FOOTER_HEIGHT);
    CGRect contextBarFrame = CGRectMake(0.0, contextBarY, self.view.bounds.size.width, CONTEXTBAR_HEIGHT);
    self.contextBar = [[UIToolbar alloc] initWithFrame:contextBarFrame];
    self.contextBar.alpha = 1.000;
    self.contextBar.autoresizesSubviews = YES;
    self.contextBar.autoresizingMask = (UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleTopMargin);
    self.contextBar.barStyle = UIBarStyleBlack;
    //self.contextBar.backgroundColor = [UIColor blackColor];
    self.contextBar.clearsContextBeforeDrawing = YES;
    self.contextBar.clipsToBounds = YES;
    self.contextBar.contentMode = UIViewContentModeScaleToFill;
    self.contextBar.hidden = YES;
    self.contextBar.multipleTouchEnabled = NO;
    self.contextBar.opaque = YES;
    self.contextBar.translucent = YES;
    self.contextBar.userInteractionEnabled = YES;
    //Add
    [self.view addSubview:self.contextBar];
    //Buttons
    self.contextBtn = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemAdd target:self action:@selector(userPressedContextButton:)];
    self.contextBtn.width = 35.0;
    
    //ContextBar buttons
    UIBarButtonItem* refreshButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemRefresh target:self action:@selector(userPressedRefreshButton:)];
    NSString* clearButtonString = NSLocalizedString(@"Clear data", nil);
    UIBarButtonItem* clearButton = [[UIBarButtonItem alloc] initWithTitle:clearButtonString style:UIBarButtonItemStylePlain target:self action:@selector(userPressedClearButton:)];
    
    //Helper buttons
	UIBarButtonItem* flexibleSpaceButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace target:nil action:nil];
	
	UIBarButtonItem* fixedSpaceButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFixedSpace target:nil action:nil];
	fixedSpaceButton.width = 10;
    
    //Build contextBar
    [self.contextBar setItems:@[clearButton, flexibleSpaceButton, refreshButton]];
    
    //Build toolbar
	if (_browserOptions.disableswipenavigation){
		NSString* frontArrowString = NSLocalizedString(@">", nil); // create arrow from Unicode char
		self.forwardButton = [[UIBarButtonItem alloc] initWithTitle:frontArrowString style:UIBarButtonItemStylePlain target:self action:@selector(goForward:)];
		self.forwardButton.enabled = YES;
		self.forwardButton.imageInsets = UIEdgeInsetsZero;
        self.forwardButton.width = 35.0;
		
		NSString* backArrowString = NSLocalizedString(@"<", nil); // create arrow from Unicode char
		self.backButton = [[UIBarButtonItem alloc] initWithTitle:backArrowString style:UIBarButtonItemStylePlain target:self action:@selector(goBack:)];
		self.backButton.enabled = YES;
		self.backButton.imageInsets = UIEdgeInsetsZero;
        self.backButton.width = 35.0;
		   
		[self.toolbar setItems:@[self.closeButton, flexibleSpaceButton, self.urlButton, fixedSpaceButton, self.contextBtn, flexibleSpaceButton, self.backButton, fixedSpaceButton, self.forwardButton]];
	}else{
		[self.toolbar setItems:@[self.closeButton, flexibleSpaceButton, self.urlButton, flexibleSpaceButton, self.contextBtn]];
	}
    //Add
    [self.view addSubview:self.toolbar];
    
    float footerY = self.view.bounds.size.height - FOOTER_HEIGHT;
    CGRect footerRect = CGRectMake(0.0, footerY, self.view.bounds.size.width, FOOTER_HEIGHT);
    UIView* footer = [[UIView alloc] initWithFrame:footerRect];
    footer.backgroundColor = [UIColor blackColor];
    footer.hidden = NO;
    //Add
    [self.view addSubview:footer];
}

- (void) setWebViewFrame : (CGRect) frame {
    NSLog(@"Setting the WebView's frame to %@", NSStringFromCGRect(frame));
    [self.webView setFrame:frame];
}

- (void)setCloseButtonTitle:(NSString*)title
{
    // the advantage of using UIBarButtonSystemItemDone is the system will localize it for you automatically
    // but, if you want to set this yourself, knock yourself out (we can't set the title for a system Done button, so we have to create a new one)
    self.closeButton = nil;
    self.closeButton = [[UIBarButtonItem alloc] initWithTitle:title style:UIBarButtonItemStylePlain target:self action:@selector(close)];
    self.closeButton.enabled = YES;
    self.closeButton.tintColor = [UIColor colorWithRed:60.0 / 255.0 green:136.0 / 255.0 blue:230.0 / 255.0 alpha:1];
    
    NSMutableArray* items = [self.toolbar.items mutableCopy];
    [items replaceObjectAtIndex:0 withObject:self.closeButton];
    [self.toolbar setItems:items];
}

- (void)showLocationBar:(BOOL)show
{
    if (show) {
        self.addressLabel.hidden = NO;
    } else {
        self.addressLabel.hidden = YES;
    }
}

- (void)showToolBar:(BOOL)show : (NSString *) toolbarPosition
{
    CGRect toolbarFrame = self.toolbar.frame;
    // prevent double show/hide
    if (show == !(self.toolbar.hidden)) {
        return;
    }
    
    if (show) {
        self.toolbar.hidden = NO;
        CGRect webViewBounds = self.view.bounds;
		webViewBounds.size.height -= (STATUSBAR_HEIGHT + TOOLBAR_HEIGHT + FOOTER_HEIGHT);
        self.toolbar.frame = toolbarFrame;
        
		/* not supported anymore
        if ([toolbarPosition isEqualToString:kInAppBrowserToolbarBarPositionTop]) {
            toolbarFrame.origin.y = 0;
			webViewBounds.origin.y = (STATUSBAR_HEIGHT + toolbarFrame.size.height);
            [self setWebViewFrame:webViewBounds];
        } else {
            toolbarFrame.origin.y = (webViewBounds.size.height + STATUSBAR_HEIGHT);
        }
		*/
		toolbarFrame.origin.y = (webViewBounds.size.height + STATUSBAR_HEIGHT);
        [self setWebViewFrame:webViewBounds];
        
    } else {
        self.toolbar.hidden = YES;
		CGRect webViewBounds = self.view.bounds;
		webViewBounds.origin.y = STATUSBAR_HEIGHT;
		webViewBounds.size.height -= (STATUSBAR_HEIGHT + FOOTER_HEIGHT);
        [self setWebViewFrame:webViewBounds];
    }
}

- (void)viewDidLoad
{
    viewRenderedAtLeastOnce = FALSE;
    [super viewDidLoad];
}

- (void)viewDidDisappear:(BOOL)animated
{
    [super viewDidDisappear:animated];
    if (isExiting && (self.navigationDelegate != nil) && [self.navigationDelegate respondsToSelector:@selector(browserExit)]) {
        [self.navigationDelegate browserExit];
        isExiting = FALSE;
    }
}

- (UIStatusBarStyle)preferredStatusBarStyle
{
    return UIStatusBarStyleLightContent;
}

- (BOOL)prefersStatusBarHidden {
    return NO;
}

- (void)close
{
    [CDVUserAgentUtil releaseLock:&_userAgentLockToken];
    closedUrl = self.webView.URL;
    self.currentURL = nil;
    self.previousURL = nil;
    
    __weak UIViewController* weakSelf = self;
    
    // Run later to avoid the "took a long time" log message.
    dispatch_async(dispatch_get_main_queue(), ^{
        isExiting = TRUE;
        if ([weakSelf respondsToSelector:@selector(presentingViewController)]) {
            [[weakSelf presentingViewController] dismissViewControllerAnimated:YES completion:nil];
        } else {
            [[weakSelf parentViewController] dismissViewControllerAnimated:YES completion:nil];
        }
    });
}

- (void)navigateTo:(NSURL*)url
{
    NSURLRequest* request = [NSURLRequest requestWithURL:url];
    //NSLog(@"NAVIGATE TO: %@", url.absoluteString);
    
    if (_userAgentLockToken != 0) {
        if (![self callSpecialUrls:url]){
            [self.webView loadRequest:request];
        }
    } else {
        __weak CDVInAppBrowserViewController* weakSelf = self;
        [CDVUserAgentUtil acquireLock:^(NSInteger lockToken) {
            _userAgentLockToken = lockToken;
            [CDVUserAgentUtil setUserAgent:_userAgent lockToken:lockToken];
            if (![self callSpecialUrls:url]){
                [weakSelf.webView loadRequest:request];
            }
        }];
    }
}
- (bool)callSpecialUrls:(NSURL*)url;
{
    //check special URL
    if ([url.absoluteString hasPrefix:@"file"] && [url.absoluteString hasSuffix:@"%3Cinappbrowser-home%3E"]){
        [self loadHomePage];
        return YES;
    }else if ([url.absoluteString hasPrefix:@"file"] && [url.absoluteString hasSuffix:@"%3Cinappbrowser-last%3E"]){
        if (closedUrl && ![closedUrl.absoluteString isEqualToString:@"about:blank"]){
            [self navigateTo:closedUrl];
            return YES;
        }else{
            [self loadHomePage];
            return YES;
        }
    }else{
        return NO;
    }
}

- (void)goBack:(id)sender
{
    [self.webView goBack];
}

- (void)goForward:(id)sender
{
    [self.webView goForward];
}

- (void)sendToastMessage:(NSString*)message;
{
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:nil
                                                                   message:message
                                                            preferredStyle:UIAlertControllerStyleAlert];
    [self presentViewController:alert animated:YES completion:nil];
    int duration = 2; // duration in seconds
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, duration * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
        [alert dismissViewControllerAnimated:YES completion:nil];
    });
}

- (void)copyUrlToClipboard;
{
    if (!self.webView.URL){
        return;
    }
    
    //TODO: workaround until we can understand this crazy resize bug (copy oversized URL 2! times removes buttons ... o_O)
    self.addressLabel.text = @"Copied URL to clipboard";
    
    UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
    pasteboard.string = self.webView.URL.absoluteString;
    
    [self sendToastMessage:@"Copied URL"];
}

- (void)userPressedContextButton:(id)sender; //withEvent:(UIEvent *)event;
{
    /*
     UITouch *touch = [[event allTouches] anyObject];
     if (touch.tapCount == 0){
         return;
     }
     */
    if (self.contextBar.hidden){
        self.contextBar.alpha = 0.0;
        self.contextBar.hidden = NO;
        [UIView animateWithDuration:0.3 animations:^{
            self.contextBar.alpha = 1.0;
        }];
    }else{
        [UIView animateWithDuration:0.3 animations:^{
            self.contextBar.alpha = 0.0;
        } completion: ^(BOOL finished) {
            self.contextBar.hidden = finished;
        }];
    }
}
- (void)userTappedOnAddress:(UIGestureRecognizer*)gestureRecognizer;
{
    [self copyUrlToClipboard];
}
- (void)userPressedRefreshButton:(id)sender;
{
    if (!self.webView.URL){
        return;
    }
    NSURL *reloadUrl = self.webView.URL;
    if ([reloadUrl.absoluteString isEqualToString:@"about:blank"]){
        reloadUrl = (self.previousURL)? self.previousURL : ((closedUrl)? closedUrl : inappHome);
        [self navigateTo:reloadUrl];
    }else{
        [self.webView reloadFromOrigin];
    }
}
- (void)userPressedClearButton:(id)sender;
{
    NSSet *websiteDataTypes = [NSSet setWithArray:@[
            //WKWebsiteDataTypeDiskCache,
            WKWebsiteDataTypeOfflineWebApplicationCache,
            WKWebsiteDataTypeMemoryCache,
            //WKWebsiteDataTypeLocalStorage,
            WKWebsiteDataTypeCookies,
            WKWebsiteDataTypeSessionStorage,
            //WKWebsiteDataTypeIndexedDBDatabases,
            //WKWebsiteDataTypeWebSQLDatabases
    ]];
    //All kinds of data:
    //NSSet *websiteDataTypes = [WKWebsiteDataStore allWebsiteDataTypes];
    //Date from:
    NSDate *dateFrom = [NSDate dateWithTimeIntervalSince1970:0];
    //Execute
    self.previousURL = self.webView.URL;
    [self loadHomePage];
    [self.spinner startAnimating];
    [[WKWebsiteDataStore defaultDataStore] removeDataOfTypes:websiteDataTypes modifiedSince:dateFrom completionHandler:^{
        //TODO: Done-message might (in theory) come too late if html load is slow or create race-condition
        double delayInSeconds = 1.0;
        dispatch_time_t popTime = dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delayInSeconds * NSEC_PER_SEC));
        dispatch_after(popTime, dispatch_get_main_queue(), ^(void){
            [self sendToastMessage:@"Cleared all browser data"];
            [self.spinner stopAnimating];
            self.addressLabel.text = @"Press 'reload' to open previous page";
        });
    }];
}
-(void)loadHomePage;
{
    //V1
    /*
    NSString *htmlData = @"<html style='width:100%;height:100%;background:#000'></html>";
    [self.webView loadHTMLString:htmlData baseURL:nil];
     */
    //V2
    NSString *filePath = [[NSBundle mainBundle] pathForResource:@"www/search" ofType:@"html"];
    NSString *html = [NSString stringWithContentsOfFile:filePath encoding:NSUTF8StringEncoding error:nil];
    //[self.webView loadHTMLString:html baseURL:[NSBundle mainBundle].resourceURL];
    [self.webView loadHTMLString:html baseURL:nil];
}

- (void)viewWillAppear:(BOOL)animated
{
    /*
    if (IsAtLeastiOSVersion(@"7.0") && !viewRenderedAtLeastOnce) {
        viewRenderedAtLeastOnce = TRUE;
        CGRect viewBounds = [self.webView bounds];
        viewBounds.origin.y = STATUSBAR_HEIGHT;
        //viewBounds.size.height = viewBounds.size.height - (FOOTER_HEIGHT + TOOLBAR_HEIGHT + STATUSBAR_HEIGHT);
        self.webView.frame = viewBounds;
        [[UIApplication sharedApplication] setStatusBarStyle:[self preferredStatusBarStyle]];
    }
     */
    [self.webView addObserver:self forKeyPath:@"URL" options:NSKeyValueObservingOptionNew context:nil];
    [super viewWillAppear:animated];
}

- (void)viewWillDisappear:(BOOL)animated
{
    [self.webView removeObserver:self forKeyPath:@"URL"];
    [super viewWillDisappear:animated];
}

-(void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary<NSKeyValueChangeKey,id> *)change context:(void *)context
{
    //NSLog(@"---URL changed---");
    if (!self.spinner.isAnimating){
        if (![self.currentURL.absoluteString isEqualToString:self.webView.URL.absoluteString]
            && ![self.webView.URL.absoluteString isEqualToString:@"about:blank"]){
            //NSLog(@"previous: %@", self.previousURL.absoluteString);
            //NSLog(@"current: %@", self.currentURL.absoluteString);
            //NSLog(@"webView: %@", self.webView.URL.absoluteString);
            self.previousURL = self.currentURL;
            self.currentURL = self.webView.URL;
            self.addressLabel.text = [self.webView.URL absoluteString];
        }
    }
}

#pragma mark WKNavigationDelegate

- (void)webView:(WKWebView *)theWebView didStartProvisionalNavigation:(WKNavigation *)navigation{
    
    // loading url, start spinner, update back/forward
    
    self.addressLabel.text = NSLocalizedString(@"Loading...", nil);
    self.backButton.enabled = theWebView.canGoBack;
    self.forwardButton.enabled = theWebView.canGoForward;
    
    [self.spinner startAnimating];
    
    return [self.navigationDelegate didStartProvisionalNavigation:theWebView];
}

- (void)webView:(WKWebView *)theWebView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler
{
    NSURL *url = navigationAction.request.URL;
    //NSLog(@"webView - navigateTo: %@", url);
    //NSLog(@"webView - targetFrame: %@", navigationAction.targetFrame);
    NSURL *mainDocumentURL = navigationAction.request.mainDocumentURL;
    
    BOOL isTopLevelNavigation = [url isEqual:mainDocumentURL];
    
    if (isTopLevelNavigation) {
        if (![url.absoluteString isEqualToString:@"about:blank"]){
            self.previousURL = self.currentURL;
        }
        self.currentURL = url;
    }
    //for target=_blank
    if (navigationAction.targetFrame == nil) {
        [self.webView loadRequest:navigationAction.request];
        //NSLog(@"webView - use: _blank");
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }
    if (![url.scheme isEqualToString:@"http"] && ![url.scheme isEqualToString:@"https"] && ![url.scheme isEqualToString:@"file"]){
        UIApplication *app = [UIApplication sharedApplication];
        if ([app canOpenURL:url]){
            if (@available(iOS 10.0, *)){
                [app openURL:url options:@{} completionHandler:nil];
                //read to understand options: https://useyourloaf.com/blog/openurl-deprecated-in-ios10/
            }else{
                [app openURL:url];
            }
            decisionHandler(WKNavigationActionPolicyCancel);
            return;
        }
    }
    
    [self.navigationDelegate webView:theWebView decidePolicyForNavigationAction:navigationAction.request];
    decisionHandler(WKNavigationActionPolicyAllow);
}

- (void)webView:(WKWebView *)theWebView didFinishNavigation:(WKNavigation *)navigation
{
    // update url, stop spinner, update back/forward
    
    self.addressLabel.text = [self.webView.URL absoluteString];
    if ([self.addressLabel.text isEqualToString:@"about:blank"]){
        self.addressLabel.text = @"-SEPIA-";
    }
    self.backButton.enabled = theWebView.canGoBack;
    self.forwardButton.enabled = theWebView.canGoForward;
    //theWebView.scrollView.contentInset = UIEdgeInsetsZero;
    
    [self.spinner stopAnimating];
    
    // Work around a bug where the first time a PDF is opened, all UIWebViews
    // reload their User-Agent from NSUserDefaults.
    // This work-around makes the following assumptions:
    // 1. The app has only a single Cordova Webview. If not, then the app should
    //    take it upon themselves to load a PDF in the background as a part of
    //    their start-up flow.
    // 2. That the PDF does not require any additional network requests. We change
    //    the user-agent here back to that of the CDVViewController, so requests
    //    from it must pass through its white-list. This *does* break PDFs that
    //    contain links to other remote PDF/websites.
    // More info at https://issues.apache.org/jira/browse/CB-2225
    BOOL isPDF = NO;
    //TODO webview class
    //BOOL isPDF = [@"true" isEqualToString :[theWebView evaluateJavaScript:@"document.body==null"]];
    if (isPDF) {
        [CDVUserAgentUtil setUserAgent:_prevUserAgent lockToken:_userAgentLockToken];
    }
    
    [self.navigationDelegate didFinishNavigation:theWebView];
}
    
- (void)webView:(WKWebView*)theWebView failedNavigation:(NSString*) delegateName withError:(nonnull NSError *)error{
    // log fail message, stop spinner, update back/forward
    NSLog(@"webView:%@ - %ld: %@", delegateName, (long)error.code, [error localizedDescription]);
    
    self.backButton.enabled = theWebView.canGoBack;
    self.forwardButton.enabled = theWebView.canGoForward;
    [self.spinner stopAnimating];
    
    self.addressLabel.text = NSLocalizedString(@"Load Error", nil);
    
    [self.navigationDelegate webView:theWebView didFailNavigation:error];
}

- (void)webView:(WKWebView*)theWebView didFailNavigation:(null_unspecified WKNavigation *)navigation withError:(nonnull NSError *)error
{
    [self webView:theWebView failedNavigation:@"didFailNavigation" withError:error];
}
    
- (void)webView:(WKWebView*)theWebView didFailProvisionalNavigation:(null_unspecified WKNavigation *)navigation withError:(nonnull NSError *)error
{
    [self webView:theWebView failedNavigation:@"didFailProvisionalNavigation" withError:error];
}

#pragma mark WKScriptMessageHandler delegate
- (void)userContentController:(nonnull WKUserContentController *)userContentController didReceiveScriptMessage:(nonnull WKScriptMessage *)message {
    if (![message.name isEqualToString:IAB_BRIDGE_NAME]) {
        return;
    }
    //NSLog(@"Received script message %@", message.body);
    [self.navigationDelegate userContentController:userContentController didReceiveScriptMessage:message];
}

#pragma mark CDVScreenOrientationDelegate

- (BOOL)shouldAutorotate
{
    if ((self.orientationDelegate != nil) && [self.orientationDelegate respondsToSelector:@selector(shouldAutorotate)]) {
        return [self.orientationDelegate shouldAutorotate];
    }
    return YES;
}

- (UIInterfaceOrientationMask)supportedInterfaceOrientations
{
    if ((self.orientationDelegate != nil) && [self.orientationDelegate respondsToSelector:@selector(supportedInterfaceOrientations)]) {
        return [self.orientationDelegate supportedInterfaceOrientations];
    }
    
    return 1 << UIInterfaceOrientationPortrait;
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation
{
    if ((self.orientationDelegate != nil) && [self.orientationDelegate respondsToSelector:@selector(shouldAutorotateToInterfaceOrientation:)]) {
        return [self.orientationDelegate shouldAutorotateToInterfaceOrientation:interfaceOrientation];
    }
    
    return YES;
}


@end //CDVInAppBrowserViewController

@implementation CDVInAppBrowserOptions

- (id)init
{
    if (self = [super init]) {
        // default values
        self.location = YES;
        self.toolbar = YES;
        self.closebuttoncaption = nil;
        self.toolbarposition = kInAppBrowserToolbarBarPositionBottom;
        self.clearcache = NO;
        self.clearsessioncache = NO;
        self.disableswipenavigation = NO;
        
        self.enableviewportscale = NO;
        self.mediaplaybackrequiresuseraction = NO;
        self.allowinlinemediaplayback = NO;
        self.keyboarddisplayrequiresuseraction = YES;
        self.suppressesincrementalrendering = NO;
        self.hidden = NO;
        self.disallowoverscroll = NO;
    }
    
    return self;
}

+ (CDVInAppBrowserOptions*)parseOptions:(NSString*)options
{
    CDVInAppBrowserOptions* obj = [[CDVInAppBrowserOptions alloc] init];
    
    // NOTE: this parsing does not handle quotes within values
    NSArray* pairs = [options componentsSeparatedByString:@","];
    
    // parse keys and values, set the properties
    for (NSString* pair in pairs) {
        NSArray* keyvalue = [pair componentsSeparatedByString:@"="];
        
        if ([keyvalue count] == 2) {
            NSString* key = [[keyvalue objectAtIndex:0] lowercaseString];
            NSString* value = [keyvalue objectAtIndex:1];
            NSString* value_lc = [value lowercaseString];
            
            BOOL isBoolean = [value_lc isEqualToString:@"yes"] || [value_lc isEqualToString:@"no"];
            NSNumberFormatter* numberFormatter = [[NSNumberFormatter alloc] init];
            [numberFormatter setAllowsFloats:YES];
            BOOL isNumber = [numberFormatter numberFromString:value_lc] != nil;
            
            // set the property according to the key name
            if ([obj respondsToSelector:NSSelectorFromString(key)]) {
                if (isNumber) {
                    [obj setValue:[numberFormatter numberFromString:value_lc] forKey:key];
                } else if (isBoolean) {
                    [obj setValue:[NSNumber numberWithBool:[value_lc isEqualToString:@"yes"]] forKey:key];
                } else {
                    [obj setValue:value forKey:key];
                }
            }
        }
    }
    
    return obj;
}

@end //CDVInAppBrowserOptions

@implementation CDVInAppBrowserNavigationController : UINavigationController

- (void) dismissViewControllerAnimated:(BOOL)flag completion:(void (^)(void))completion {
    if ( self.presentedViewController) {
        [super dismissViewControllerAnimated:flag completion:completion];
    }
}

- (void) viewDidLoad {
    /*
    CGRect statusBarFrame = [self invertFrameIfNeeded:[UIApplication sharedApplication].statusBarFrame];
    statusBarFrame.size.height = STATUSBAR_HEIGHT;
    // simplified from: http://stackoverflow.com/a/25669695/219684
    
    UIToolbar* bgToolbar = [[UIToolbar alloc] initWithFrame:statusBarFrame];
    bgToolbar.barStyle = UIBarStyleDefault;
    [bgToolbar setAutoresizingMask:UIViewAutoresizingFlexibleWidth];
    [self.view addSubview:bgToolbar];
    */
    [super viewDidLoad];
}

- (CGRect) invertFrameIfNeeded:(CGRect)rect {
    // We need to invert since on iOS 7 frames are always in Portrait context
    if (!IsAtLeastiOSVersion(@"8.0")) {
        if (UIInterfaceOrientationIsLandscape([[UIApplication sharedApplication] statusBarOrientation])) {
            CGFloat temp = rect.size.width;
            rect.size.width = rect.size.height;
            rect.size.height = temp;
        }
        rect.origin = CGPointZero;
    }
    return rect;
}

#pragma mark CDVScreenOrientationDelegate

- (BOOL)shouldAutorotate
{
    if ((self.orientationDelegate != nil) && [self.orientationDelegate respondsToSelector:@selector(shouldAutorotate)]) {
        return [self.orientationDelegate shouldAutorotate];
    }
    return YES;
}

- (UIInterfaceOrientationMask)supportedInterfaceOrientations
{
    if ((self.orientationDelegate != nil) && [self.orientationDelegate respondsToSelector:@selector(supportedInterfaceOrientations)]) {
        return [self.orientationDelegate supportedInterfaceOrientations];
    }
    
    return 1 << UIInterfaceOrientationPortrait;
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation
{
    if ((self.orientationDelegate != nil) && [self.orientationDelegate respondsToSelector:@selector(shouldAutorotateToInterfaceOrientation:)]) {
        return [self.orientationDelegate shouldAutorotateToInterfaceOrientation:interfaceOrientation];
    }
    
    return YES;
}


@end //CDVInAppBrowserNavigationController
