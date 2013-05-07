var WqxKeyInput = function (){
    function WqxKeyInput(wqx, input){
        this.wqx = wqx;
        input.addEventListener('keydown', this.handleKeyDown.bind(this), false);
        input.addEventListener('keyup', this.handleKeyUp.bind(this), false);
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
        9: 'Tab',
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
    var keyNameToKeypadMatrixIndex = {
        'F12': 0x02,

        'F5': 0x08,
        'F6': 0x09,
        'F7': 0x0A,
        'F8': 0x0B,
        'F9': 0x0C,
        'F10': 0x0D,
        'F11': 0x0E,

        'Tab': 0x38, // 50 help
        'Shift': 0x39, // 51 Shift
        'CapsLock': 0x3A, // 52 CapsLock
        'Esc': 0x3B, // 53 AC
        '0': 0x3C, // 54 0
        'Period': 0x3D, // 55 .
        'Equals': 0x3E, // 56 =
        'Left': 0x3F, // 57 `<-`

        'Z': 0x30, // 40 Z
        'X': 0x31, // 41 X
        'C': 0x32, // 42 C
        'V': 0x33, // 43 V
        'B': 0x34, // 44 B
        'N': 0x35, // 46 N
        'M': 0x36, // 46 M
        'PageUp': 0x37, // 47 PgUp

        'A': 0x28, // 30 A
        'S': 0x29, // 31 S
        'D': 0x2A, // 32 D
        'F': 0x2B, // 33 F
        'G': 0x2C, // 34 G
        'H': 0x2D, // 35 H
        'J': 0x2E, // 36 J
        'K': 0x2F, // 37 K

        'Q': 0x20, // 20 Q
        'W': 0x21, // 21 W
        'E': 0x22, // 22 E
        'R': 0x23, // 23 R
        'T': 0x24, // 24 T
        'Y': 0x25, // 25 Y
        'U': 0x26, // 26 U
        'I': 0x27, // 27 I

        'O': 0x18, // 28 O
        'L': 0x19, // 38 L
        'Up': 0x1A, // 48 `^`
        'Down': 0x1B, // 58 `v`
        'P': 0x1C, // 29 P
        'Enter': 0x1D, // 39 Enter
        'PageDown': 0x1E, // 49 PgDown
        'Right': 0x1F, // 59 `->`

        'F1': 0x10, // 12 F1
        'F2': 0x11, // 13 F2
        'F3': 0x12, // 14 F3
        'F4': 0x13 // 15 F4
    };
    WqxKeyInput.prototype._keyDownOrUp = function (key, downOrUp){
        var wqxKeyCode = keyNameToKeypadMatrixIndex[key];
        if (wqxKeyCode) {
            var col = wqxKeyCode >> 3;
            var row = wqxKeyCode & 0x07;
            this.wqx.keypadmatrix[row][col] = downOrUp ? 1 : 0;
        }
    };
    WqxKeyInput.prototype.keyDown = function (key){
        this._keyDownOrUp(key, true);
        this.onpress(key);
    };
    WqxKeyInput.prototype.keyUp = function (key){
        this._keyDownOrUp(key, false);
        this.onrelease(key);
    };
    WqxKeyInput.prototype.handleKeyDown = function (evt){
        this.keyDown(keyCodeToKeyName[evt.keyCode]);
        evt.preventDefault();
    };
    WqxKeyInput.prototype.handleKeyUp = function (evt){
        this.keyUp(keyCodeToKeyName[evt.keyCode]);
        evt.preventDefault();
    };
    WqxKeyInput.prototype.onpress = function (key){};
    WqxKeyInput.prototype.onrelease = function (key){};
    return WqxKeyInput;
}();