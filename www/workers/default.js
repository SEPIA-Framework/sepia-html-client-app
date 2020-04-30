self.addEventListener('message', function(e) {
    var msg = e.data;
    var data = msg.data;
    switch (data.cmd) {
        case 'echo':
            self.postMessage(msg);
            break;
        default:
            self.postMessage('Unknown command: ' + data.cmd);
    };
}, false);