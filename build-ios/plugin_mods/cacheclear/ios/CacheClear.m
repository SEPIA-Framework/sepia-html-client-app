#import "CacheClear.h"
#import "CDVWKWebViewUIDelegate.h"

@implementation CacheClear

@synthesize command;

- (void)clearAllData:(void (^ _Nonnull)(void))completion;
{
    NSSet *websiteDataTypes = [WKWebsiteDataStore allWebsiteDataTypes];
    NSDate *dateFrom = [NSDate dateWithTimeIntervalSince1970:0];
    [[WKWebsiteDataStore defaultDataStore] removeDataOfTypes:websiteDataTypes modifiedSince:dateFrom completionHandler:completion];
}

- (void)task:(CDVInvokedUrlCommand *)command
{
    NSLog(@"Cordova iOS CacheClear() called.");

    self.command = command;

    // Arguments arenot used at the moment.
    // NSArray* arguments = command.arguments;

    [self clearAllData:^{
        [[NSURLCache sharedURLCache] removeAllCachedResponses];
        [self success];
    }];
}

- (void)success
{
    NSString *resultMsg = @"Cordova iOS webview cache cleared.";
    NSLog(@"%@", resultMsg);

    // create acordova result
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                messageAsString:resultMsg];

    // send cordova result
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)error:(NSString *)message
{
    NSString *resultMsg = [NSString stringWithFormat:@"Error while clearing webview cache (%@).", message];
    NSLog(@"%@", resultMsg);

    // create cordova result
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                                                messageAsString:resultMsg];

    // send cordova result
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

@end
