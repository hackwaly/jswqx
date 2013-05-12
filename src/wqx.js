// cc800
// http://bbs.emsky.net/viewthread.php?tid=33474

var Wqx = (function (){
    var io00_bank_switch = 0x00;
    var io01_int_enable = 0x01;
    var io01_int_status = 0x01;
    var io03_timer1_val = 0x03;
    var io04_stop_timer0 = 0x04;
    var io04_general_ctrl = 0x04;
    var io05_start_timer0 = 0x05;
    var io05_clock_ctrl = 0x05;
    var io06_stop_timer1 = 0x06;
    var io06_lcd_config = 0x06;
    var io07_port_config = 0x07;
    var io07_start_timer1 = 0x07;
    var io08_port0_data = 0x08;
    var io09_port1_data = 0x09;
    var io0A_bios_bsw = 0x0A;
    var io0A_roa = 0x0A;
    var io0B_port3_data = 0x0B;
    var io0B_lcd_ctrl = 0x0B;
    var io0C_general_status = 0x0C;
    var io0C_timer01_ctrl = 0x0C;
    var io0C_lcd_config = 0x0C;
    var io0D_volumeid = 0x0D;
    var io0D_lcd_segment = 0x0D;
    var io0E_dac_data = 0x0E;
    var io0F_zp_bsw = 0x0F;
    var io0F_port0_dir = 0x0F;
    var io15_port1_dir = 0x15;
    var io16_port2_dir = 0x16;
    var io17_port2_data = 0x17;
    var io18_port4_data = 0x18;
    var io19_ckv_select = 0x19;
    var io1A_volume_set = 0x1A;
    var io1B_pwm_data = 0x1B;
    var io1C_batt_detect = 0x1C;
    var io1E_batt_detect = 0x1E;
    var io20_JG = 0x20;
    var io23_unknow = 0x23;
    var io_ROA_bit = 0x80; // RAM/ROM (io_bios_bsw)

    var map0000 = 0;
    var map2000 = 1;
    var map4000 = 2;
    var map6000 = 3;
    var map8000 = 4;
    var mapA000 = 5;
    var mapC000 = 6;
    var mapE000 = 7;

    var SPDC1016Frequency = 5000000;
    var FrameRate = 50;
    var CyclesPerFrame = SPDC1016Frequency / FrameRate;
    var CyclesPerNMI = SPDC1016Frequency / 2;
    var CyclesPer4Ms = SPDC1016Frequency / 250;

    function memcpy(dest, src, length){
        for (var i=0; i<length; i++) {
            dest[i] = src[i];
        }
    }

    function getByteArray(buffer, byteOffset, byteLength){
        byteOffset = byteOffset | 0;
        if (!(buffer instanceof ArrayBuffer)) {
            byteOffset += buffer.byteOffset;
            buffer = buffer.buffer;
        }
        if (byteLength == null) {
            byteLength = buffer.byteLength - byteOffset;
        }
        return new Uint8Array(buffer, byteOffset, byteLength);
    }

    function Wqx(div, opts){
        opts = opts || {};

        this._DEBUG = false;
        this.div = div;

        this.frameCounter = 0;
        this.nmiCounter = 0;
        this.clockCounter = 0;
        this.shouldIrq = false;
        this.shouldNmi = false;
        this.frameTimer = null;
        this.totalInsts = 0;

        this.keypadmatrix = [
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0]
        ];
        this.lcdoffshift0flag = 0;
        this.lcdbuffaddr = null;
        this.timer0started = false;
        this.timer0value = 0;
//        this.timer0waveoutstart = false;
        this.ptr40 = null;
        this.zp40cache = null;

        this.rom = null;
        this.volume0array = [];
        this.volume1array = [];
        this.volume2array = [];
        this.nor = null;
        this.norbankheader = [];
        this.ram = null;
        this.memmap = [];
        this.bbsbankheader = [];
        this.may4000ptr = null;
        this.cpu = null;
        this.initLcd();
        this.initRom();
        this.initNor();
        this.initRam();
        this.initMemmap();
        this.initIo();
        this.resetCpu();
    }

    Wqx.prototype.initLcd = function (){
        var doc = this.div.ownerDocument;
        var canvas = doc.createElement('canvas');
        canvas.width = 320;
        canvas.height = 160;
        this.div.appendChild(canvas);
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.canvasCtx.fillStyle = '#32284A';
        this.canvasCtx.setTransform(2, 0, 0, 2, 0, 0);
        this.canvasCtx.save();
    };
    Wqx.prototype.initRom = function (){
        this.rom = new Uint8Array(0x8000 * 768);
        for (var i=0; i<256; i++) {
            this.volume0array[i] = getByteArray(this.rom, 0x8000 * i, 0x8000);
            this.volume1array[i] = getByteArray(this.rom, 0x8000 * (i + 256), 0x8000);
            this.volume2array[i] = getByteArray(this.rom, 0x8000 * (i + 512), 0x8000);
        }
    };
    Wqx.prototype.initNor = function (){
        this.nor = new Uint8Array(0x8000 * 32);
        this.norbankheader = [];
        for (var i=0; i<32; i++) {
            this.norbankheader[i] = getByteArray(this.nor, 0x8000 * i, 0x8000);
        }
    };
    Wqx.prototype.initRam = function (){
        this.ram = new Uint8Array(0x10000);
        this.ptr40 = getByteArray(this.ram, 0x40, 0x40);
        this.zp40cache = new Uint8Array(0x40);
    };
    Wqx.prototype.initMemmap = function (){
        this.memmap[map0000] = getByteArray(this.ram, 0, 0x2000);
        this.ram2000_4000 = getByteArray(this.ram, 0x2000, 0x2000);
        this.memmap[map2000] = this.ram2000_4000;
        this.ram4000_6000 = getByteArray(this.ram, 0x4000, 0x2000);
        this.memmap[map4000] = this.ram4000_6000;
        this.memmap[map6000] = getByteArray(this.ram, 0x6000, 0x2000);
        this.memmap[map8000] = getByteArray(this.ram, 0x8000, 0x2000);
        this.memmap[mapA000] = getByteArray(this.ram, 0xA000, 0x2000);
        this.memmap[mapC000] = getByteArray(this.ram, 0xC000, 0x2000);
        this.memmap[mapE000] = getByteArray(this.ram, 0xE000, 0x2000);
        this.ramRomBank1 = new Uint8Array(0x2000);
        this.fillC000BIOSBank(this.volume0array);
        this.memmap[mapC000] = getByteArray(this.bbsbankheader[0], 0, 0x2000);
        this.may4000ptr = this.volume0array[0];
        this.memmap[mapE000] = getByteArray(this.volume0array[0], 0x2000, 0x2000);
        this.switch4000ToBFFF();
//        this._dbg_logMemmap();
    };

    function hex(num, len){
        var str = num.toString(16).toUpperCase();
        return new Array(len - str.length + 1).join('0') + str;
    }
    var _dbg_mapNames = ['map0000','map2000','map4000','map6000','map8000','mapA000','mapC000','mapE000'];
    Wqx.prototype._dbg_ptrName = function (i){
        var ptr = this.memmap[i];
        var mapName = _dbg_mapNames[i];
        if (ptr.buffer === this.rom.buffer) {
            return mapName + ': ROM[0x' + hex(ptr.byteOffset, 8) + ']';
        } else if (ptr.buffer === this.nor.buffer) {
            return mapName + ': NOR[0x' + hex(ptr.byteOffset, 8) + ']';
        } else {
            return mapName + ': RAM[0x' + hex(ptr.byteOffset, 8) + ']';
        }
    };
    Wqx.prototype._dbg_logMemmap = function (){
        var buff = [];
        for (var i=0; i<_dbg_mapNames.length; i++) {
            buff.push(this._dbg_ptrName(i));
        }
        console.log(buff.join('\n'));
    };

    Wqx.prototype.fillC000BIOSBank = function (volume_array){
        this.bbsbankheader[0] = getByteArray(volume_array[0], 0, 0x2000);
        this.bbsbankheader[1] = this.ramRomBank1;
        this.bbsbankheader[2] = getByteArray(volume_array[0], 0x4000, 0x2000);
        this.bbsbankheader[3] = getByteArray(volume_array[0], 0x6000, 0x2000);
        // 4567, 89AB, CDEF take first 4page 0000~7FFF in BROM
        for (var i = 0; i < 3; i++) {
            this.bbsbankheader[i * 4 + 4] = getByteArray(volume_array[i + 1], 0, 0x2000);
            this.bbsbankheader[i * 4 + 5] = getByteArray(volume_array[i + 1], 0x2000, 0x2000);
            this.bbsbankheader[i * 4 + 6] = getByteArray(volume_array[i + 1], 0x4000, 0x2000);
            this.bbsbankheader[i * 4 + 7] = getByteArray(volume_array[i + 1], 0x6000, 0x2000);
        }
    };
    Wqx.prototype.switch4000ToBFFF = function (){
        this.memmap[map4000] = getByteArray(this.may4000ptr, 0, 0x2000);
        this.memmap[map6000] = getByteArray(this.may4000ptr, 0x2000, 0x2000);
        this.memmap[map8000] = getByteArray(this.may4000ptr, 0x4000, 0x2000);
        this.memmap[mapA000] = getByteArray(this.may4000ptr, 0x6000, 0x2000);
//        this._dbg_logMemmap();
    };

    Wqx.prototype.initIo = function (){
        this.io_read_map = new Array(0x10000);
        this.io_write_map = new Array(0x10000);
        for (var i=0; i<0x10000; i++) {
            this.io_read_map[i] = i < 0x40;
            this.io_write_map[i] = i < 0x40 || i >= 0x4000;
        }
        this.io_read = this.readIO.bind(this);
        this.io_write = this.writeIO.bind(this);
        this._eraseBuff = new Uint8Array(256);
        // bit5 TIMER0 SOURCE CLOCK SELECT BIT1/TIMER CLOCK SELECT BIT2
        // bit3 TIMER1 SOURCE CLOCK SELECT BIT1/TIMER CLOCK SELECT BIT0
        // ([0C] & 3) * 1000 || [06] * 10 = LCDAddr
        this.ram[io0C_timer01_ctrl] = 0x28;
        this.ram[io1B_pwm_data] = 0;
        this.ram[io01_int_enable] = 0; // Disable all int
        this.ram[io04_general_ctrl] = 0;
        this.ram[io05_clock_ctrl] = 0;
        this.ram[io08_port0_data] = 0;
        this.ram[io00_bank_switch] = 0;
        this.ram[io09_port1_data] = 0;
    };
    Wqx.prototype.readIO = function (addr){
//        console.log('readIO: ' + addr.toString(16) + ' @' + this._instCount);
        switch (addr) {
            case 0x00:
                return this.read00BankSwitch();
            case 0x02:
                return this.read02Timer0Value();
            case 0x04:
                return this.read04StopTimer0();
            case 0x05:
                return this.read05StartTimer0;
            case 0x06:
                return this.read06StopTimer1();
            case 0x07:
                return this.read07StartTimer1();
            case 0x3B:
                return this.read3BUnknown();
            case 0x3F:
                return this.read3FClock();
            default:
                return this.ram[addr];
        }
    };
    Wqx.prototype.read00BankSwitch = function (){
//        console.log('read00BankSwitch');
        return this.ram[io00_bank_switch];
    };
    Wqx.prototype.read04StopTimer0 = function (){
        if (this.timer0started) {
            this.timer0value = this.read02Timer0Value();
            this.timer0started = false;
        }
//        if (this.timer0waveoutstart) {
//            this.timer0waveoutstart = false;
//        }
//        console.log('read04StopTimer0: ' + this.ram[io04_general_ctrl]);
        return this.ram[io04_general_ctrl];
    };
    Wqx.prototype.read02Timer0Value = function (){
        if (this.timer0started) {
            this.timer0value = Math.floor((this.cpu.cycles - this.timer0startcycles) /
                SPDC1016Frequency) & 0xFF;
        }
//        console.log('read02Timer0Value: ' + this.timer0value);
        return this.timer0value;
    };
    Wqx.prototype.read05StartTimer0 = function (){
        console.log('read05StartTimer0');
        this.timer0started = true;
        this.timer0startcycles = this.cpu.cycles;
//        if (this.read02Timer0Value() == 0x3F) {
//            //gTimer0WaveoutStarted = 1;
//            //mayTimer0Var1 = 0;
//            //maypTimer0VarA8 = (int)&unk_4586A8;
//            //mayTimer0Var2 = 0;
//            //mayIO2345Var1 = 0;
//            //ResetWaveout(&pwh);
//            //OpenWaveout((DWORD_PTR)&pwh, 0x1F40u);
//            this.timer0waveoutstart = true;
//        }
        return this.ram[io05_clock_ctrl]; // follow rulz by GGV
    };
    Wqx.prototype.read06StopTimer1 = function (){
        console.log('read06StopTimer1: ' + this.ram[io04_general_ctrl]);
        //todo
        return this.ram[io06_lcd_config];
    };
    Wqx.prototype.read07StartTimer1 = function (){
        console.log('read06StopTimer1');
    };
    Wqx.prototype.read3BUnknown = function (){
        if (!(this.ram[0x3d] & 0x03)) {
            return this.clockRecords[0x3B] & 0xFE;
        }
    };
    Wqx.prototype.read3FClock = function (){
        return this.clockRecords[this.ram[62]] || 0;
    };
    Wqx.prototype.writeIO = function (addr, value){
//        console.log('writeIO: 0x' + addr.toString(16) + ', 0x' + value.toString(16) + ' @' + this._instCount);
        switch (addr) {
        case 0x00:
            return this.write00BankSwitch(value);
        case 0x02:
            return this.write02Timer0Value(value);
        case 0x05:
            return this.write05ClockCtrl(value);
        case 0x06:
            return this.write06LCDStartAddr(value);
        case 0x08:
            return this.write08Port0(value);
        case 0x09:
            return this.write09Port1(value);
        case 0x0A:
            return this.write0AROABBS(value);
        case 0x0C:
            return this.writeTimer01Control(value);
        case 0x0D:
            return this.write0DVolumeIDLCDSegCtrl(value);
        case 0x0F:
            return this.write0FZeroPageBankswitch(value);
        case 0x20:
            return this.write20JG(value);
        case 0x23:
            return this.write23JGWav(value);
        case 0x3F:
            return this.write3FClock(value);
        }
        if (addr >= this.lcdbuffaddr && addr < this.lcdbuffaddr + 1600) {
            return this.updateLCD(addr, value);
        }
        if (addr >= 0x4000) {
            return this.writeGE4000(addr, value);
        }
        this.ram[addr] = value;
    };

    // decompiled.
    Wqx.prototype.write00BankSwitch = function (bank){
//        console.log('write00BankSwitch: ' + bank);
        if (this.ram[io00_bank_switch] !== bank) {
            if (bank < 0x20) {
                this.may4000ptr = this.norbankheader[bank];
            } else if (bank >= 0x80) {
                if (this.ram[io0D_volumeid] & 0x01) {
                    this.may4000ptr = this.volume1array[bank];
                } else if (this.ram[io0D_volumeid] & 0x02) {
                    this.may4000ptr = this.volume2array[bank];
                } else {
                    this.may4000ptr = this.volume0array[bank];
                }
            }
            this.switch4000ToBFFF();
            this.ram[io00_bank_switch] = bank;
        }
    };
    Wqx.prototype.write02Timer0Value = function (value){
//        console.log('write02Timer0Value: ' + value);
        if (this.timer0started) {
            this.timer0startcycles = (this.cpu.cycles -
                (value * SPDC1016Frequency / 10));
        } else {
            this.timer0value = value;
        }
    };
    Wqx.prototype.write05ClockCtrl = function (value){
//        console.log('write05ClockCtrl: ' + value);
        // FROM WQXSIM
        // SPDC1016
        if (this.ram[io05_clock_ctrl] & 0x08) {
            // old bit3, LCDON
            if ((value & 0x0F) === 0) {
                // new bit0~bit3 is 0
                this.lcdoffshift0flag = true;
            }
        }
        this.ram[io05_clock_ctrl] = value;
    };
    Wqx.prototype.setLcdStartAddr = function (addr){
        this.lcdbuffaddr = addr;
        for (var i=0; i<1600; i++) {
            this.io_write_map[this.lcdbuffaddr+i] = true;
        }
        console.log('lcdAddr: ' + this.lcdbuffaddr);
    };
    Wqx.prototype.write06LCDStartAddr = function (value){
        console.log('write06LCDStartAddr: ' + value);
        if (this.lcdbuffaddr == null) {
            this.setLcdStartAddr(((this.ram[io0C_lcd_config] & 0x03) << 12) | (value << 4));
        }
        this.ram[io06_lcd_config] = value;
        // SPDC1016
        // don't know how wqxsim works.
        this.ram[io09_port1_data] &= 0xFE; // remove bit0 of port1 (keypad)
    };
    Wqx.prototype.write08Port0 = function (value){
        this.ram[io0B_port3_data] &= 0xFE;
    };
    function buildByte(array){
        return (array[0]) |
            (array[1] << 1) |
            (array[2] << 2) |
            (array[3] << 3) |
            (array[4] << 4) |
            (array[5] << 5) |
            (array[6] << 6) |
            (array[7] << 7);
    }
    Wqx.prototype.write09Port1 = function (value){
        switch (value){
        case 0x01: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[0]); break;
        case 0x02: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[1]); break;
        case 0x04: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[2]); break;
        case 0x08: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[3]); break;
        case 0x10: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[4]); break;
        case 0x20: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[5]); break;
        case 0x40: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[6]); break;
        case 0x80: this.ram[io08_port0_data] = buildByte(this.keypadmatrix[7]); break;
        case 0:
            this.ram[io0B_port3_data] |= 1;
            if (this.keypadmatrix[7] === 0xFE) {
                this.ram[io0B_port3_data] &= 0xFE;
            }
            break;
        case 0x7F:
            if (this.ram[io15_port1_dir] === 0x7F) {
                this.ram[io08_port0_data] = (
                    buildByte(this.keypadmatrix[0]) |
                    buildByte(this.keypadmatrix[1]) |
                    buildByte(this.keypadmatrix[2]) |
                    buildByte(this.keypadmatrix[3]) |
                    buildByte(this.keypadmatrix[4]) |
                    buildByte(this.keypadmatrix[5]) |
                    buildByte(this.keypadmatrix[6]) |
                    buildByte(this.keypadmatrix[7])
                    );
                break;
            }
        }
        this.ram[io09_port1_data] = value;
    };
    Wqx.prototype.write0AROABBS = function (value){
//        console.log('write0AROABBS: ' + value);
        if (value !== this.ram[io0A_roa]) {
            this.memmap[mapC000] = getByteArray(this.bbsbankheader[value & 0x0F], 0, 0x2000);
            this.ram[io0A_roa] = value;
        }
    };
    Wqx.prototype.writeTimer01Control = function (value){
//        console.log('writeTimer01Control: ' + value);
        if (this.lcdbuffaddr === null) {
            this.lcdbuffaddr = ((value & 0x03) << 12) | (this.ram[io06_lcd_config] << 4);
            console.log('lcdAddr: ' + this.lcdbuffaddr);
        }
        this.ram[io0C_lcd_config] = value;
    };

    // decompiled.
    Wqx.prototype.write0DVolumeIDLCDSegCtrl = function (value){
//        console.log('write0DVolumeIDLCDSegCtrl: ' + value);
        if (value !== this.ram[io0D_volumeid]) {
            // bit0 changed.
            // volume1,3 != volume0,2
            var bank = this.ram[io00_bank_switch];
            if ((value & 0x03) === 1) {
                // Volume1
                this.fillC000BIOSBank(this.volume1array);
                this.may4000ptr = this.volume1array[bank];
                this.memmap[mapE000] = getByteArray(this.volume1array[0], 0x2000, 0x2000);
            } else if ((value & 0x03) === 3) {
                // Volume2
                this.fillC000BIOSBank(this.volume2array);
                this.may4000ptr = this.volume2array[bank];
                this.memmap[mapE000] = getByteArray(this.volume2array[0], 0x2000, 0x2000);
            } else {
                // Volume0
                this.fillC000BIOSBank(this.volume0array);
                this.may4000ptr = this.volume0array[bank];
                this.memmap[mapE000] = getByteArray(this.volume0array[0], 0x2000, 0x2000);
            }

            var page2000 = this.ram4000_6000;
            var roabbs = this.ram[io0A_roa];
            if (!(roabbs & 0x04)) {
                page2000 = this.ram2000_4000;
            }
            if (this.memmap[map2000] !== page2000) {
                this.memmap[map2000] = page2000;
//                this.canvasCtx.clearRect(0, 0, 160, 80);
            }
            this.memmap[mapC000] = this.bbsbankheader[roabbs & 0x0F];
            this.switch4000ToBFFF();
        }
        this.ram[io0D_volumeid] = value;
//        this._dbg_logMemmap();
    };
    Wqx.prototype.write0FZeroPageBankswitch = function (value){
//        console.log('write0FZeroPageBankswitch: ' + value);
        var oldzpbank = this.ram[io0F_zp_bsw] & 0x07;
        var newzpbank = (value & 0x07);
        var newzpptr = this.getZeroPagePointer(newzpbank);
        if (oldzpbank !== newzpbank) {
            if (oldzpbank === 0) {
                // oldzpbank == 0
                memcpy(this.zp40cache, this.ptr40, 0x40); // backup fixed 40~80 to cache
                memcpy(this.ptr40, newzpptr, 0x40); // copy newbank to 40
            } else {
                // dangerous if exchange 00 <-> 40
                // oldaddr maybe 0 or 200~300
                var oldzpptr = this.getZeroPagePointer(oldzpbank);
                memcpy(oldzpptr, this.ptr40, 0x40);
                if (newzpbank !== 0) {
                    memcpy(this.ptr40, newzpptr, 0x40);
                } else {
                    memcpy(this.ptr40, this.zp40cache, 0x40); // copy backup to 40
                }
            }
        }
        this.ram[io0F_zp_bsw] = value;
    };
    Wqx.prototype.getZeroPagePointer = function (bank){
        //.text:0040BFD0 bank            = byte ptr  4
        //.text:0040BFD0
        //.text:0040BFD0                 mov     al, [esp+bank]
        //.text:0040BFD4                 cmp     al, 4
        //.text:0040BFD6                 jnb     short loc_40BFE5 ; if (bank < 4) {
        //.text:0040BFD8                 xor     eax, eax        ; bank == 0,1,2,3
        //.text:0040BFD8                                         ; set bank = 0
        //.text:0040BFDA                 and     eax, 0FFFFh     ; WORD(bank)
        //.text:0040BFDF                 add     eax, offset gFixedRAM0 ; result = &gFixedRAM0[WORD(bank)];
        //.text:0040BFE4                 retn                    ; }
        //.text:0040BFE5 ; ---------------------------------------------------------------------------
        //.text:0040BFE5
        //.text:0040BFE5 loc_40BFE5:                             ; CODE XREF: GetZeroPagePointer+6j
        //.text:0040BFE5                 movzx   ax, al          ; 4,5,6,7
        //.text:0040BFE9                 add     eax, 4          ; bank+=4
        //.text:0040BFEC                 shl     eax, 6          ; bank *= 40;
        //.text:0040BFEF                 and     eax, 0FFFFh     ; WORD(bank)
        //.text:0040BFF4                 add     eax, offset gFixedRAM0
        //.text:0040BFF9                 retn
        if (bank >= 4) {
            // 4,5,6,7
            // 4 -> 200 5-> 240
            return getByteArray(this.ram, (bank + 4) << 6, 0x40);
        } else {
            // 0,1,2,3
            return getByteArray(this.ram, 0, 0x40);
        }
    };
    Wqx.prototype.write20JG = function (value){
//        console.log('write20JG');
        this.ram[io20_JG] = value;
        if (value === 0x80 || value === 0x40) {
            // todo:
            this.ram[io20_JG] = 0;
        }
    };

    Wqx.prototype.write23JGWav = function (value){
//        console.log('write23JGWav');
        this.ram[io23_unknow] = value;
        if (value === 0xC2) {
            // gMayJGBuff2[(unsigned __int8)gMayJGIndex] = gZeroPage[34];
        } else if (value === 0xC4) {

        } else if (value === 0x80) {
            this.ram[io20_JG] = 0x80;
            // todo:
        }
    };
    Wqx.prototype.write3FClock = function (value){
        if (this.ram[62] >= 0x07) {
            if (this.ram[62] === 0x0B) {
                this.ram[61] = 0xF8;
                this.mayClockFlags |= value & 0x07;
                this.clockRecords[0x0B] = value ^ (this.clockRecords[0x0B] ^ value) & 0x7F;
            } else if (this.ram[62] === 0x0A) {
                this.clockRecords[0x0A] = value;
                this.mayClockFlags |= value & 0x07;
            } else {
                this.clockRecords[this.ram[62] % 80] = value;
            }
        } else {
            if (!(this.clockRecords[0x0B]  & 0x80)) {
                this.clockRecords[this.ram[62]] = value;
            }
        }
        this.ram[0x3F] = value;
    };

    Wqx.prototype._eraseStep = 0;
    Wqx.prototype._eraseType = 0;
    Wqx.prototype._eraseSelectedBank = 0;
    Wqx.prototype._eraseTemp1 = 0;
    Wqx.prototype._eraseTemp2 = 0;
    Wqx.prototype._eraseBuff = null;
    Wqx.prototype.writeGE4000 = function (addr, value){
//        console.log('writeGE4000: ' + addr.toString(16) + ', ' + value.toString(16));
        var buffer = this.memmap[addr >> 13].buffer;
        // writable bank.
        if (buffer === this.ram || buffer === this.ramRomBank1) {
            this.memmap[addr >> 13][addr & 0x1FFF] = value;
            if (buffer === this.ramRomBank1) {
                console.log('write to ramRomBank1');
            }
            return;
        }
        if (addr >= 0xE000) {
            return;
        }
        var bank = this.ram[io00_bank_switch];
        if (bank >= 0x20) {
            return;
        }

        // ##############
        // # erasing ....
        var self = this;
        function erase_all_nor_banks(){
            for (var i=32; i--;) {
                for (var j=0x8000; j--;) {
                    self.norbankheader[i][j] = 0xFF;
                }
            }
        }
        function erase_buff(){
            for (var j=256; j--;) {
                self._eraseBuff[j] = 0xFF;
            }
        }
        if (this._eraseStep === 0) {
            if (addr === 0x5555 && value === 0xAA) {
                this._eraseStep = 1;
                return;
            } else if (addr === 0x8000 && value === 0xF0) {
                return;
            }
        } else if (this._eraseStep === 1) {
            if (addr === 0xAAAA && value === 0x55) {
                this._eraseStep = 2;
                return;
            }
        } else if (this._eraseStep === 2) {
            if (addr === 0x5555) {
                switch (value){
                case 0x90:
                    this._eraseSelectedBank = this.ram[io00_bank_switch];
                    this._eraseTemp1 = this.norbankheader[this._eraseSelectedBank][0x4000];
                    this._eraseTemp2 = this.norbankheader[this._eraseSelectedBank][0x4001];
                    this.norbankheader[this._eraseSelectedBank][0x4000] = 0xC7;
                    this.norbankheader[this._eraseSelectedBank][0x4001] = 0xD5;
                    this._eraseStep = 3;
                    this._eraseType = 1;
                    return;
                case 0xA0: this._eraseStep = 3; this._eraseType = 2; return;
                case 0x80: this._eraseStep = 3; this._eraseType = 3; return;
                case 0xA8: this._eraseStep = 3; this._eraseType = 4; return;
                case 0x88: this._eraseStep = 3; this._eraseType = 5; return;
                case 0x78: this._eraseStep = 3; this._eraseType = 6; return;
                }
            }
        } else if (this._eraseStep === 3) {
            switch (this._eraseType) {
            case 1:
                if (value === 0xF0) {
                    this.norbankheader[this._eraseSelectedBank][0x4000] = this._eraseTemp1;
                    this.norbankheader[this._eraseSelectedBank][0x4001] = this._eraseTemp2;
                    this._eraseStep = 0;
                    this._eraseType = 0;
                    return;
                }
                break;
            case 2:
                this.may4000ptr[addr - 0x4000] &= value;
                this._eraseStep = 4;
                return;
            case 4:
                this._eraseStep = 4;
                this._eraseBuff[addr % 256] &= value;
                return;
            case 3:
            case 5:
                if (addr === 0x5555 && value === 0xAA) {
                    this._eraseStep = 4;
                    return;
                }
                break;
            }
        } else if (this._eraseStep === 4) {
            switch (this._eraseType) {
            case 3:
            case 5:
                if (addr === 0xAAAA && value === 0x55) {
                    this._eraseStep = 5;
                    return;
                }
                break;
            }
        } else if (this._eraseStep === 5) {
            if (addr === 0x5555 && value === 0x10) {
                erase_all_nor_banks();
                this._eraseStep = 6;
                if (this._eraseType === 5) {
                    erase_buff();
                }
                return;
            }
            if (this._eraseType === 3 && value === 0x30) {
                var k = this.ram[io00_bank_switch];
                var a = addr - addr % 0x800 - 0x4000;
                for (var j=0x800; j--;) {
                    this.norbankheader[k][a + j] = 0xFF;
                }
                this._eraseStep = 6;
                return;
            }
            if (this._eraseType === 5 && value === 0x48) {
                erase_buff();
                this._eraseStep = 6;
                return;
            }
        }
        // ????.
        if (addr === 0x8000 && value === 0xF0) {
            this._eraseStep = 0;
            this._eraseType = 0;
            return;
        }
        console.log('error occurs when operate in flash! ' + addr.toString(16) + ',' + value.toString(16));
    };

    Wqx.prototype.resetCpu = function (){
        this.cpu = new M65C02Context();
        this.cpu.ram = this.ram;
        this.cpu.memmap = this.memmap;
        this.cpu.io_read_map = this.io_read_map;
        this.cpu.io_write_map = this.io_write_map;
        this.cpu.io_read = this.io_read;
        this.cpu.io_write = this.io_write;
        this.cpu.cycles = 0;
        this.cpu.reg_a = 0;
        this.cpu.reg_x = 0;
        this.cpu.reg_y = 0;
        // 00100100 unused P(bit5) = 1, I(bit3) = 1, B(bit4) = 0
        this.cpu.set_reg_ps(0x24);
        // assume 1FFC/1FFD in same stripe
        this.cpu.reg_pc = (this.memmap[7][0x1FFD] << 8) | this.memmap[7][0x1FFC];
        this.cpu.reg_sp = 0x01FF;
        this.cpu.irq = 1;
        this.cpu.nmi = 1;
        this.cpu.wai = 0;
        this.cpu.stp = 0;
    };

    Wqx.prototype.loadBROM = function (buffer){
        var byteOffset = 0;
        while (byteOffset < buffer.byteLength) {
            var bufferSrc1 = getByteArray(buffer, byteOffset, 0x4000);
            var bufferSrc2 = getByteArray(buffer, byteOffset + 0x4000, 0x4000);
            var bufferDest1 = getByteArray(this.rom, byteOffset + 0x4000, 0x4000);
            var bufferDest2 = getByteArray(this.rom, byteOffset, 0x4000);
            memcpy(bufferDest1, bufferSrc1, 0x4000);
            memcpy(bufferDest2, bufferSrc2, 0x4000);
            byteOffset += 0x8000;
        }
        this.resetCpu();
    };

    Wqx.prototype.loadNorFlash = function (buffer){
        var byteOffset = 0;
        while (byteOffset < buffer.byteLength) {
            var bufferSrc1 = getByteArray(buffer, byteOffset, 0x4000);
            var bufferSrc2 = getByteArray(buffer, byteOffset + 0x4000, 0x4000);
            var bufferDest1 = getByteArray(this.nor, byteOffset + 0x4000, 0x4000);
            var bufferDest2 = getByteArray(this.nor, byteOffset, 0x4000);
            memcpy(bufferDest1, bufferSrc1, 0x4000);
            memcpy(bufferDest2, bufferSrc2, 0x4000);
            byteOffset += 0x8000;
        }
        this.resetCpu();
    };

    Wqx.prototype.updateLCD = function (addr, value){
//        var lcdBuffer = getByteArray(this.ram, this.lcdbuffaddr, 160*80/8);
//        this.canvasCtx.clearRect(0, 0, 160, 80);
//        for (var i=0; i<80; i++) {
//            for (var j=0; j<20; j++) {
//                var p = j * 8;
//                var pixelsByte = lcdBuffer[20*i+j];
//                if (pixelsByte & 0x80) if (j > 0) this.canvasCtx.fillRect(p + 0, i, 1, 1);
//                if (pixelsByte & 0x40) this.canvasCtx.fillRect(p + 1, i, 1, 1);
//                if (pixelsByte & 0x20) this.canvasCtx.fillRect(p + 2, i, 1, 1);
//                if (pixelsByte & 0x10) this.canvasCtx.fillRect(p + 3, i, 1, 1);
//                if (pixelsByte & 0x08) this.canvasCtx.fillRect(p + 4, i, 1, 1);
//                if (pixelsByte & 0x04) this.canvasCtx.fillRect(p + 5, i, 1, 1);
//                if (pixelsByte & 0x02) this.canvasCtx.fillRect(p + 6, i, 1, 1);
//                if (pixelsByte & 0x01) this.canvasCtx.fillRect(p + 7, i, 1, 1);
//            }
//        }
        var offset = addr - this.lcdbuffaddr;
        var oldValue = this.ram[addr];
        var row = Math.floor(offset / 20);
        var col = offset % 20;
        var p = col * 8;
        var changed = oldValue ^ value;

        if (changed & 0x80) {
            if (value & 0x80) {
                if (col > 0) {
                    this.canvasCtx.fillRect(p + 0, row, 1, 1);
                }
            } else {
                if (col > 0) {
                    this.canvasCtx.clearRect(p + 0, row, 1, 1);
                }
            }
        }
        if (changed & 0x40) {
            if (value & 0x40) {
                this.canvasCtx.fillRect(p + 1, row, 1, 1);
            } else {
                this.canvasCtx.clearRect(p + 1, row, 1, 1);
            }
        }
        if (changed & 0x20) {
            if (value & 0x20) {
                this.canvasCtx.fillRect(p + 2, row, 1, 1);
            } else {
                this.canvasCtx.clearRect(p + 2, row, 1, 1);
            }
        }
        if (changed & 0x10) {
            if (value & 0x10) {
                this.canvasCtx.fillRect(p + 3, row, 1, 1);
            } else {
                this.canvasCtx.clearRect(p + 3, row, 1, 1);
            }
        }
        if (changed & 0x08) {
            if (value & 0x08) {
                this.canvasCtx.fillRect(p + 4, row, 1, 1);
            } else {
                this.canvasCtx.clearRect(p + 4, row, 1, 1);
            }
        }
        if (changed & 0x04) {
            if (value & 0x04) {
                this.canvasCtx.fillRect(p + 5, row, 1, 1);
            } else {
                this.canvasCtx.clearRect(p + 5, row, 1, 1);
            }
        }
        if (changed & 0x02) {
            if (value & 0x02) {
                this.canvasCtx.fillRect(p + 6, row, 1, 1);
            } else {
                this.canvasCtx.clearRect(p + 6, row, 1, 1);
            }
        }
        if (changed & 0x01) {
            if (value & 0x01) {
                this.canvasCtx.fillRect(p + 7, row, 1, 1);
            } else {
                this.canvasCtx.clearRect(p + 7, row, 1, 1);
            }
        }
        this.ram[addr] = value;
    };

    Wqx.prototype.mayClockFlags = 0;
    Wqx.prototype.adjustTime = function (){
        if (++this.clockRecords[0] >= 60) {
            this.clockRecords[0] = 0;
            if (++this.clockRecords[1] >= 60) {
                this.clockRecords[1] = 0;
                if (++this.clockRecords[2] >= 24) {
                    this.clockRecords[2] &= 0;
                    ++this.clockRecords[3];
                }
            }
        }
    };

    Wqx.prototype.encounterIRQClock = function (){
        if ((this.clockRecords[10] & 0x02) && (this.mayClockFlags & 0x02)) {
            if (((this.clockRecords[7] & 0x80) && !((this.clockRecords[7] ^ this.clockRecords[2])) & 0x1F) ||
                ((this.clockRecords[6] & 0x80) && !((this.clockRecords[6] ^ this.clockRecords[1])) & 0x3F) ||
                ((this.clockRecords[5] & 0x80) && !((this.clockRecords[5] ^ this.clockRecords[0])) & 0x3F)) {
                return true;
            }
        }
        return false;
    };

    Wqx.prototype.run = function (){
        this._timerCounter = 0;
        this._instCount = 0;
        this.clockRecords = new Uint8Array(80);
        if (!this.frameTimer) {
            this.frameTimer = setInterval(this.frame.bind(this), 1000 / FrameRate);
        }
    };

//    Wqx.prototype._loop = function (){
//        this.frame();
//        this.frameTimer = requestAnimationFrame(this._loop.bind(this), null);
//    };

    Wqx.prototype.stop = function (){
        clearInterval(this.frameTimer);
        this.frameTimer = null;
    };

    Wqx.prototype.reset = function (){
        this.resetCpu();
        this.frameCounter = 0;
        this.nmiCounter = 0;
    };

    Wqx.prototype.frame = function (){
        var frameCycles = CyclesPerFrame * (this.frameCounter + 1);
        var nmiCycles = CyclesPerNMI * (this.nmiCounter + 1);
        var clockCycles = CyclesPer4Ms * (this.clockCounter + 1);
        var lastCycles = 0;
        while (this.cpu.cycles < frameCycles) {
//            if (this._instCount === 2854234) {
//                debugger;
//            }
            if (this._DEBUG &&
                typeof wqxsimlogs !== 'undefined' &&
                wqxsimlogs.length > 1) {
                if (this._instCount >= wqxsimlogs.START &&
                    this._instCount < wqxsimlogs.START + wqxsimlogs.length - 1) {
                    var log = wqxsimlogs[this._instCount - wqxsimlogs.START];
                    var error = '';
                    if (log.A !== this.cpu.reg_a) {
                        error += ' A ';
                    }
                    if (log.X !== this.cpu.reg_x) {
                        error += ' X ';
                    }
                    if (log.Y !== this.cpu.reg_y) {
                        error += ' Y ';
                    }
                    if (log.PS !== this.cpu.get_reg_ps()) {
                        error += ' PS ';
                    }
                    if (log.SP + 0x100 !== this.cpu.reg_sp) {
                        error += ' SP ';
                    }
                    if (log.PC !== this.cpu.reg_pc) {
                        error += ' PC ';
                    }
                    if (log.OP !== this.memmap[(this.cpu.reg_pc)>>13][(this.cpu.reg_pc)&0x1FFF]) {
                        error += ' OP ';
                    }
//                    if (log.X !== this.ram[0x20]) {
//                        error += ' X ';
//                    }
                    if (error) {
                        console.log(this._instCount + ': ' + error);
                        debugger;
                        this.stop();
                        return;
                    }
                } else if (this._instCount === wqxsimlogs.START + wqxsimlogs.length - 1) {
                    alert('good!');
                }
            }
            this.cpu.execute();
            if (this.cpu.cycles >= nmiCycles) {
                this.nmiCounter++;
                nmiCycles += CyclesPerNMI;
                if (!(this.nmiCounter & 0x01)) {
                    this.adjustTime();
                }
                if (!this.encounterIRQClock() || (this.nmiCounter & 0x1)) {
                    this.ram[0x3D] = 0;
                } else {
                    this.ram[0x3D] = 0x20;
                    this.mayClockFlags &= 0xFD;
                }
                this.shouldIrq = true;
            }
            if (this.shouldIrq && !this.cpu.flag_i) {
                this.cpu.irq = 0;
                this.shouldIrq = false;
                this.cpu.doIrq();
            }
            this._instCount ++;
            if (this.cpu.cycles >= clockCycles) {
                this.clockCounter ++;
                this.clockRecords[4] ++;
                clockCycles += CyclesPer4Ms;
                this.ram[io01_int_enable] |= 0x08;
                this.shouldIrq = true;
            }
//            if ((this._instCount - 6000) % 6000 === 0) {
//                this.clockRecords[4] ++;
//                this.ram[io01_int_enable] |= 0x08;
//                this.shouldIrq = true;
//                console.log(this.cpu.cycles - lastCycles);
//                lastCycles = this.cpu.cycles;
//            }
            this.totalInsts++;
        }
        document.title = (this.frameCounter);
        this.frameCounter++;
    };

    return Wqx;
})();