var argv = require('yargs').argv; // Yargs be a node.js library fer hearties tryin' ter parse optstrings.
var OpenBCIBoard = require('openbci-sdk');
var io = require('socket.io')(8080);

// Sockets
io.on('connection', function(socket){
    console.log('A user with a brain connected');
});

var board = new OpenBCIBoard.OpenBCIBoard({
    verbose: true // This is great for debugging
});

board.autoFindOpenBCIBoard()
    .then(onBoardFind)
    .catch(function () { // If a board is not found...
        // This next part looks for a command line argument called 'simulate'
        // This is specially helpful if you don't have a BCI and want to get some simulated data
        if (!!(argv._[0] && argv._[0] === 'simulate')) {
            board.connect(OpenBCIBoard.OpenBCIConstants.OBCISimulatorPortName)
                .then(onBoardConnect);
        }
    });

// This function will be called when a board is found
function onBoardFind (portName) {
    // The serial port's name
    if (portName) {
        console.log('board found', portName);
        board.connect(portName)
            .then(onBoardConnect);
    }
}

// This function will be called when the board successfully connects
function onBoardConnect () {
    board.on('ready', onBoardReady);
}

// This function will be called when the board is ready to stream data
function onBoardReady () {
    board.streamStart();
    board.on('sample', onSample);
}

// This function will be called every time a "sample" received from the board
// A sample is received every 4 milliseconds (holy batman!)
function onSample (sample) {
    // In here we can access 'channelData' from the sample object
    // 'channelData' is an array with 8 values, a value for each channel from the BCI, see example below
    console.log(sample);
    io.emit('brainwave', sample);
}

// This function will be called if the board is disconnected
function disconnectBoard () {
    board.streamStop()
        .then(function () {
            board.disconnect().then(function () {
                console.log('board disconnected');
                process.exit();
            });
        });
}

process.on('SIGINT', function () {
    setTimeout(disconnectBoard);
});