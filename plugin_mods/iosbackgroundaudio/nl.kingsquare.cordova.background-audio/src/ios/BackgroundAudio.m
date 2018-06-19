#import <Cordova/CDV.h>
#import <AVFoundation/AVFoundation.h>

@interface BackgroundAudio : CDVPlugin
{}
@end

@implementation BackgroundAudio

- (void)pluginInitialize {
	// initializations go here.
	AVAudioSession *audioSession = [AVAudioSession sharedInstance];
	BOOL ok;
	NSError *setCategoryError = nil;
	ok = [audioSession setCategory:AVAudioSessionCategoryPlayback error:&setCategoryError];
	if (!ok) {
		NSLog(@"%s setCategoryError=%@", __PRETTY_FUNCTION__, setCategoryError);
	}
}

@end