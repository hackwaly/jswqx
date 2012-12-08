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
    var keyNameToKeypadMatrixIndex = {
        'F12': 0x02,

        'F5': 0x08,
        'F6': 0x09,
        'F7': 0x0A,
        'F8': 0x0B,
        'F9': 0x0C,
        'F10': 0x0D,
        'F11': 0x0E,

        'Control': 0x10, // 50 help
        'Shift': 0x11, // 51 Shift
        'CapsLock': 0x12, // 52 CapsLock
        'Esc': 0x13, // 53 AC
        '0': 0x14, // 54 0
        'Period': 0x15, // 55 .
        'Equals': 0x16, // 56 =
        'Left': 0x17, // 57 `<-`

        'Z': 0x18, // 40 Z
        'X': 0x19, // 41 X
        'C': 0x1A, // 42 C
        'V': 0x1B, // 43 V
        'B': 0x1C, // 44 B
        'N': 0x1D, // 46 N
        'M': 0x1E, // 46 M
        'PageUp': 0x1F, // 47 PgUp

        'A': 0x20, // 30 A
        'S': 0x21, // 31 S
        'D': 0x22, // 32 D
        'F': 0x23, // 33 F
        'G': 0x24, // 34 G
        'H': 0x25, // 35 H
        'J': 0x26, // 36 J
        'K': 0x27, // 37 K

        'Q': 0x28, // 20 Q
        'W': 0x29, // 21 W
        'E': 0x2A, // 22 E
        'R': 0x2B, // 23 R
        'T': 0x2C, // 24 T
        'Y': 0x2D, // 25 Y
        'U': 0x2E, // 26 U
        'I': 0x2F, // 27 I

        'O': 0x30, // 28 O
        'L': 0x31, // 38 L
        'Up': 0x32, // 48 `^`
        'Down': 0x33, // 58 `v`
        'P': 0x34, // 29 P
        'Enter': 0x35, // 39 Enter
        'PageDown': 0x36, // 49 PgDown
        'Right': 0x37, // 59 `->`

        'F1': 0x3A, // 12 F1
        'F2': 0x3B, // 13 F2
        'F3': 0x3C, // 14 F3
        'F4': 0x3D // 15 F4
    };

    WqxKeypad.prototype.handleKeyDown = function (evt){
        var wqxKeyCode = keyNameToKeypadMatrixIndex[keyCodeToKeyName[evt.keyCode]];
        if (wqxKeyCode) {
            var row = wqxKeyCode >> 3;
            var col = wqxKeyCode & 0x07;
            this.wqx.keypadmatrix[row][col] = 1;
        }
        evt.preventDefault();
    };
    WqxKeypad.prototype.handleKeyUp = function (evt){
        var wqxKeyCode = keyNameToKeypadMatrixIndex[keyCodeToKeyName[evt.keyCode]];
        if (wqxKeyCode) {
            var row = wqxKeyCode >> 3;
            var col = wqxKeyCode & 0x07;
            this.wqx.keypadmatrix[row][col] = 0;
        }
        evt.preventDefault();
    };
    return WqxKeypad;
}();