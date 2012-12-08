var WqxKeypad = function (){
    function WqxKeypad(wqx, input){
        this.wqx = wqx;
        input.addEventListener('keydown', this.handleKeyDown.bind(this));
        input.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    var keyCodeToKeyName = {
        116: 'F5',
        117: 'F6',
        118: 'F7',
        119: 'F8',
        120: 'F9',
        121: 'F10',
        122: 'F11',
        112: 'F1',
        113: 'F2',
        114: 'F3',
        115: 'F4',
        123: 'F12',
        81: 'Q',
        87: 'W',
        69: 'E',
        82: 'R',
        84: 'T',
        89: 'Y',
        85: 'U',
        73: 'I',
        79: 'O',
        80: 'P',
        65: 'A',
        83: 'S',
        68: 'D',
        70: 'F',
        71: 'G',
        72: 'H',
        74: 'J',
        75: 'K',
        76: 'L',
        13: 'Enter',
        90: 'Z',
        88: 'X',
        67: 'C',
        86: 'V',
        66: 'B',
        78: 'N',
        77: 'M',
        33: 'PageUp',
        38: 'Up',
        34: 'PageDown',
        17: 'Control',
        229: 'Shift',
        20: 'CapsLock',
        27: 'Esc',
        48: '0',
        190: 'Period',
        187: 'Equals',
        37: 'Left',
        40: 'Down',
        39: 'Right'
    };
    var keyNameToWqxKeyCode = {
        'F5': 0,
        'F6': 1,
        'F7': 2,
        'F8': 3,
        'F9': 4,
        'F10': 5,
        'F11': 6,
        'F1': 12,
        'F2': 13,
        'F3': 14,
        'F4': 15,
        'F12': 18,
        'Q': 20,
        'W': 21,
        'E': 22,
        'R': 23,
        'T': 24,
        'Y': 25,
        'U': 26,
        'I': 27,
        'O': 28,
        'P': 29,
        'A': 30,
        'S': 31,
        'D': 32,
        'F': 33,
        'G': 34,
        'H': 35,
        'J': 36,
        'K': 37,
        'L': 38,
        'Enter': 39,
        'Z': 40,
        'X': 41,
        'C': 42,
        'V': 43,
        'B': 44,
        'N': 45,
        'M': 46,
        'PageUp': 47,
        'Up': 48,
        'PageDown': 49,
        'Control': 50,
        'Shift': 51,
        'CapsLock': 52,
        'Esc': 53,
        '0': 54,
        'Period': 55,
        'Equals': 56,
        'Left': 57,
        'Down': 58,
        'Right': 59
    };

    WqxKeypad.prototype.handleKeyDown = function (evt){
        var wqxKeyCode = keyNameToWqxKeyCode[keyCodeToKeyName[evt.keyCode]];
        if (wqxKeyCode) {
            var row = Math.floor(wqxKeyCode / 10);
            var col = wqxKeyCode % 10;
            this.wqx.keypadmatrix[row][col] = 1;
        }
        evt.preventDefault();
    };
    WqxKeypad.prototype.handleKeyUp = function (evt){
        var wqxKeyCode = keyNameToWqxKeyCode[keyCodeToKeyName[evt.keyCode]];
        if (wqxKeyCode) {
            var row = Math.floor(wqxKeyCode / 10);
            var col = wqxKeyCode % 10;
            this.wqx.keypadmatrix[row][col] = 0;
        }
        evt.preventDefault();
    };
    return WqxKeypad;
}();