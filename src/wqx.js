// cc800
// http://bbs.emsky.net/viewthread.php?tid=33474

// ── 调试追踪开关 ──────────────────────────────────────────────────
// 设为 true 可在控制台看到完整启动链和关键函数调用序列
var WQX_TRACE = false;
function _trace(name) { if (WQX_TRACE) console.log('[WQX] ' + name); }
// ──────────────────────────────────────────────────────────────────

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
    var io_ROA_bit = 0x80;

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

        // 睡眠/唤醒状态，对应C++ slept/should_wake_up/wake_up_pending/wake_up_key
        this.slept = false;
        this.shouldWakeUp = false;
        this.wakeUpPending = false;
        this.wakeUpKey = 0;

        // 对应C++ keypad_matrix: Uint8Array，每行一个字节，直接位运算
        this.keypadmatrix = new Uint8Array(8); // REPLACED_MARKER
        this.lcdoffshift0flag = 0;
        this.lcdbuffaddr = null;
        this.timer0started = false;
        this.timer0value = 0;
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
        this.clockRecords = new Uint8Array(80);
        this.mayClockFlags = 0;

        this.initLcd();
        this.initRom();
        this.initNor();
        this.initRam();
        this.initMemmap();
        this.initIo();
        this.resetCpu();
    }

    Wqx.prototype.initLcd = function (){
        _trace('initLcd');
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
        _trace('initRom');
        this.rom = new Uint8Array(0x8000 * 768);
        for (var i=0; i<256; i++) {
            this.volume0array[i] = getByteArray(this.rom, 0x8000 * i, 0x8000);
            this.volume1array[i] = getByteArray(this.rom, 0x8000 * (i + 256), 0x8000);
            this.volume2array[i] = getByteArray(this.rom, 0x8000 * (i + 512), 0x8000);
        }
    };

    Wqx.prototype.initNor = function (){
        _trace('initNor');
        this.nor = new Uint8Array(0x8000 * 32);
        this.norbankheader = [];
        for (var i=0; i<32; i++) {
            this.norbankheader[i] = getByteArray(this.nor, 0x8000 * i, 0x8000);
        }
    };

    Wqx.prototype.initRam = function (){
        _trace('initRam');
        this.ram = new Uint8Array(0x10000);
        this.ptr40 = getByteArray(this.ram, 0x40, 0x40);
        this.zp40cache = new Uint8Array(0x40);
    };

    Wqx.prototype.initMemmap = function (){
        _trace('initMemmap');
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
    };

    function hex(num, len){
        var str = num.toString(16).toUpperCase();
        return new Array(len - str.length + 1).join('0') + str;
    }

    Wqx.prototype.fillC000BIOSBank = function (volume_array){
        this.bbsbankheader[0] = getByteArray(volume_array[0], 0, 0x2000);
        this.bbsbankheader[1] = this.ramRomBank1;
        this.bbsbankheader[2] = getByteArray(volume_array[0], 0x4000, 0x2000);
        this.bbsbankheader[3] = getByteArray(volume_array[0], 0x6000, 0x2000);
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
    };

    Wqx.prototype.initIo = function (){
        _trace('initIo');
        this.io_read_map = new Array(0x10000);
        this.io_write_map = new Array(0x10000);
        for (var i=0; i<0x10000; i++) {
            this.io_read_map[i] = i < 0x40;
            this.io_write_map[i] = i < 0x40 || i >= 0x4000;
        }
        // 对应C++ Load()：0x045F读取时处理wakeUpPending
        this.io_read_map[0x045F] = true;
        this.io_read = this.readIO.bind(this);
        this.io_write = this.writeIO.bind(this);
        this._eraseBuff = new Uint8Array(256);
        this.ram[io0C_timer01_ctrl] = 0x28;
        this.ram[io1B_pwm_data] = 0;
        this.ram[io01_int_enable] = 0;
        this.ram[io04_general_ctrl] = 0;
        this.ram[io05_clock_ctrl] = 0;
        this.ram[io08_port0_data] = 0;
        this.ram[io00_bank_switch] = 0;
        this.ram[io09_port1_data] = 0;
    };

    Wqx.prototype.readIO = function (addr){
        // 对应C++ Load()：Flash编程/擦除完成后返回0x88，复位状态机
        if (addr >= 0x4000 && addr < 0xC000) {
            if ((this._eraseStep === 4 && this._eraseType === 2) ||
                (this._eraseStep === 6 && this._eraseType === 3)) {
                this._eraseStep = 0;
                this._eraseType = 0;
                for (var i = 0x4000; i < 0xC000; i++) this.io_read_map[i] = false;
                return 0x88;
            }
            return this.memmap[addr >> 13][addr & 0x1FFF];
        }
        switch (addr) {
            case 0x00: return this.read00BankSwitch();
            case 0x02: return this.read02Timer0Value();
            case 0x04: return this.read04StopTimer0();
            case 0x05: return this.read05StartTimer0;
            case 0x06: return this.read06StopTimer1();
            case 0x07: return this.read07StartTimer1();
            case 0x3B: return this.read3BUnknown();
            case 0x3F: return this.read3FClock();
            case 0x045F:
                // 对应C++ Load()：唤醒键值注入
                if (this.wakeUpPending) {
                    this.wakeUpPending = false;
                    this.ram[0x045F] = this.wakeUpKey;
                }
                return this.ram[0x045F];
            default:   return this.ram[addr];
        }
    };

    Wqx.prototype.read00BankSwitch = function (){
        return this.ram[io00_bank_switch];
    };

    Wqx.prototype.read04StopTimer0 = function (){
        if (this.timer0started) {
            this.timer0value = this.read02Timer0Value();
            this.timer0started = false;
        }
        return this.ram[io04_general_ctrl];
    };

    Wqx.prototype.read02Timer0Value = function (){
        if (this.timer0started) {
            this.timer0value = Math.floor((this.cpu.cycles - this.timer0startcycles) /
                SPDC1016Frequency) & 0xFF;
        }
        return this.timer0value;
    };

    Wqx.prototype.read05StartTimer0 = function (){
        this.timer0started = true;
        this.timer0startcycles = this.cpu.cycles;
        return this.ram[io05_clock_ctrl];
    };

    Wqx.prototype.read06StopTimer1 = function (){
        return this.ram[io06_lcd_config];
    };

    Wqx.prototype.read07StartTimer1 = function (){
        // todo
    };

    Wqx.prototype.read3BUnknown = function (){
        if (!(this.ram[0x3d] & 0x03)) {
            return this.clockRecords[0x3B] & 0xFE;
        }
        return this.ram[0x3B];
    };

    Wqx.prototype.read3FClock = function (){
        return this.clockRecords[this.ram[62]] || 0;
    };

    Wqx.prototype.writeIO = function (addr, value){
        switch (addr) {
        case 0x00: return this.write00BankSwitch(value);
        case 0x02: return this.write02Timer0Value(value);
        case 0x05: return this.write05ClockCtrl(value);
        case 0x06: return this.write06LCDStartAddr(value);
        case 0x08: return this.write08Port0(value);
        case 0x09: return this.write09Port1(value);
        case 0x0A: return this.write0AROABBS(value);
        case 0x0C: return this.writeTimer01Control(value);
        case 0x0D: return this.write0DVolumeIDLCDSegCtrl(value);
        case 0x0F: return this.write0FZeroPageBankswitch(value);
        case 0x20: return this.write20JG(value);
        case 0x23: return this.write23JGWav(value);
        case 0x3F: return this.write3FClock(value);
        }
        if (addr >= this.lcdbuffaddr && addr < this.lcdbuffaddr + 1600) {
            return this.updateLCD(addr, value);
        }
        if (addr >= 0x4000) {
            return this.writeGE4000(addr, value);
        }
        this.ram[addr] = value;
    };

    Wqx.prototype.write00BankSwitch = function (bank){
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
        if (this.timer0started) {
            this.timer0startcycles = (this.cpu.cycles -
                (value * SPDC1016Frequency / 10));
        } else {
            this.timer0value = value;
        }
    };

    // 修复：对应C++ Write05，bit3变化时控制睡眠状态
    Wqx.prototype.write05ClockCtrl = function (value){
        _trace('write05ClockCtrl');
        var oldValue = this.ram[io05_clock_ctrl];
        // bit3 变化控制睡眠（LCD on = 唤醒，LCD off = 睡眠）
        if ((oldValue ^ value) & 0x08) {
            this.slept = !(value & 0x08);
        }
        // 原有 lcdoffshift0flag 逻辑保留
        if (oldValue & 0x08) {
            if ((value & 0x0F) === 0) {
                this.lcdoffshift0flag = true;
            }
        }
        this.ram[io05_clock_ctrl] = value;
    };

    // 对应C++ SetKey：处理按键的睡眠/唤醒逻辑
    Wqx.prototype.setKey = function (keyId, downOrUp){
        var row = keyId & 0x07;
        var col = keyId >> 3;
        var bits = (keyId === 0x0F) ? 0xFE : (1 << col);
        var wakeUpKeyMap = {
            0x08: 0x00, 0x09: 0x0A, 0x0A: 0x08, 0x0B: 0x06,
            0x0C: 0x04, 0x0D: 0x02, 0x0E: 0x0C, 0x0F: 0x00
        };

        if (downOrUp) {
            this.keypadmatrix[row] |= bits;
            if (this.slept) {
                if (keyId >= 0x08 && keyId <= 0x0F && keyId !== 0x0E) {
                    this.wakeUpKey = wakeUpKeyMap[keyId];
                    this.shouldWakeUp = true;
                    this.wakeUpPending = true;
                    this.slept = false;
                }
            } else {
                if (keyId === 0x0F) {
                    this.slept = true;
                }
            }
        } else {
            this.keypadmatrix[row] &= ~bits;
        }
    };

    Wqx.prototype.setLcdStartAddr = function (addr){
        this.lcdbuffaddr = addr;
        for (var i=0; i<1600; i++) {
            this.io_write_map[this.lcdbuffaddr+i] = true;
        }
    };

    Wqx.prototype.write06LCDStartAddr = function (value){
        if (this.lcdbuffaddr == null) {
            this.setLcdStartAddr(((this.ram[io0C_lcd_config] & 0x03) << 12) | (value << 4));
        }
        this.ram[io06_lcd_config] = value;
        this.ram[io09_port1_data] &= 0xFE;
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
        case 0x01: this.ram[io08_port0_data] = this.keypadmatrix[0]; break;
        case 0x02: this.ram[io08_port0_data] = this.keypadmatrix[1]; break;
        case 0x04: this.ram[io08_port0_data] = this.keypadmatrix[2]; break;
        case 0x08: this.ram[io08_port0_data] = this.keypadmatrix[3]; break;
        case 0x10: this.ram[io08_port0_data] = this.keypadmatrix[4]; break;
        case 0x20: this.ram[io08_port0_data] = this.keypadmatrix[5]; break;
        case 0x40: this.ram[io08_port0_data] = this.keypadmatrix[6]; break;
        case 0x80: this.ram[io08_port0_data] = this.keypadmatrix[7]; break;
        case 0:
            this.ram[io0B_port3_data] |= 1;
            if (this.keypadmatrix[7] === 0xFE) {
                this.ram[io0B_port3_data] &= 0xFE;
            }
            break;
        case 0x7F:
            if (this.ram[io15_port1_dir] === 0x7F) {
                this.ram[io08_port0_data] = (
                    this.keypadmatrix[0] |
                    this.keypadmatrix[1] |
                    this.keypadmatrix[2] |
                    this.keypadmatrix[3] |
                    this.keypadmatrix[4] |
                    this.keypadmatrix[5] |
                    this.keypadmatrix[6] |
                    this.keypadmatrix[7]
                    );
                break;
            }
        }
        this.ram[io09_port1_data] = value;
    };

    // 修复：补充 map2000 切换
    // 对应C++ Write0A + SwitchVolume 里 memmap[1] = roa_bbs & 0x04 ? ram_page2 : ram_page1
    Wqx.prototype.write0AROABBS = function (value){
        if (value !== this.ram[io0A_roa]) {
            this.memmap[mapC000] = getByteArray(this.bbsbankheader[value & 0x0F], 0, 0x2000);
            this.memmap[map2000] = (value & 0x04) ? this.ram4000_6000 : this.ram2000_4000;
            this.ram[io0A_roa] = value;
        }
    };

    Wqx.prototype.writeTimer01Control = function (value){
        if (this.lcdbuffaddr === null) {
            this.lcdbuffaddr = ((value & 0x03) << 12) | (this.ram[io06_lcd_config] << 4);
        }
        this.ram[io0C_lcd_config] = value;
    };

    Wqx.prototype.write0DVolumeIDLCDSegCtrl = function (value){
        _trace('write0DVolumeIDLCDSegCtrl');
        if (value !== this.ram[io0D_volumeid]) {
            var bank = this.ram[io00_bank_switch];
            if ((value & 0x03) === 1) {
                this.fillC000BIOSBank(this.volume1array);
                this.may4000ptr = this.volume1array[bank];
                this.memmap[mapE000] = getByteArray(this.volume1array[0], 0x2000, 0x2000);
            } else if ((value & 0x03) === 3) {
                this.fillC000BIOSBank(this.volume2array);
                this.may4000ptr = this.volume2array[bank];
                this.memmap[mapE000] = getByteArray(this.volume2array[0], 0x2000, 0x2000);
            } else {
                this.fillC000BIOSBank(this.volume0array);
                this.may4000ptr = this.volume0array[bank];
                this.memmap[mapE000] = getByteArray(this.volume0array[0], 0x2000, 0x2000);
            }
            var roabbs = this.ram[io0A_roa];
            // 对应C++ SwitchVolume: memmap[1] 根据 roa_bbs bit2 决定
            this.memmap[map2000] = (roabbs & 0x04) ? this.ram4000_6000 : this.ram2000_4000;
            this.memmap[mapC000] = getByteArray(this.bbsbankheader[roabbs & 0x0F], 0, 0x2000);
            this.switch4000ToBFFF();
        }
        this.ram[io0D_volumeid] = value;
    };

    Wqx.prototype.write0FZeroPageBankswitch = function (value){
        var oldzpbank = this.ram[io0F_zp_bsw] & 0x07;
        var newzpbank = (value & 0x07);
        var newzpptr = this.getZeroPagePointer(newzpbank);
        if (oldzpbank !== newzpbank) {
            if (oldzpbank === 0) {
                memcpy(this.zp40cache, this.ptr40, 0x40);
                memcpy(this.ptr40, newzpptr, 0x40);
            } else {
                var oldzpptr = this.getZeroPagePointer(oldzpbank);
                memcpy(oldzpptr, this.ptr40, 0x40);
                if (newzpbank !== 0) {
                    memcpy(this.ptr40, newzpptr, 0x40);
                } else {
                    memcpy(this.ptr40, this.zp40cache, 0x40);
                }
            }
        }
        this.ram[io0F_zp_bsw] = value;
    };

    Wqx.prototype.getZeroPagePointer = function (bank){
        if (bank >= 4) {
            return getByteArray(this.ram, (bank + 4) << 6, 0x40);
        } else {
            return getByteArray(this.ram, 0, 0x40);
        }
    };

    Wqx.prototype.write20JG = function (value){
        this.ram[io20_JG] = value;
        if (value === 0x80 || value === 0x40) {
            this.ram[io20_JG] = 0;
        }
    };

    Wqx.prototype.write23JGWav = function (value){
        this.ram[io23_unknow] = value;
        if (value === 0xC2) {
            // todo
        } else if (value === 0xC4) {
            // todo
        } else if (value === 0x80) {
            this.ram[io20_JG] = 0x80;
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
            if (!(this.clockRecords[0x0B] & 0x80)) {
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

    // 严格对照C++ Store()逻辑，else-if链完全一致
    Wqx.prototype.writeGE4000 = function (addr, value){
        // 对应C++：ram_page2/ram_page3判断（普通RAM写，最常见路径优先）
        var seg = this.memmap[addr >> 13];
        if (seg.buffer === this.ram.buffer || seg === this.ramRomBank1) {
            seg[addr & 0x1FFF] = value;
            return;
        }

        if (addr >= 0xE000) {
            return;
        }

        var bank = this.ram[io00_bank_switch];
        if (bank >= 0x20) {
            return;
        }

        // ── Flash命令状态机，严格对照C++ else-if链 ──────────────────
        if (this._eraseStep === 0) {
            if (addr === 0x5555 && value === 0xAA) {
                this._eraseStep = 1;
                // 开启Flash读拦截，以便CPU能读到0x88完成状态
                for (var i = 0x4000; i < 0xC000; i++) this.io_read_map[i] = true;
            }
            return;
        }

        // C++: if(fp_step==1){...} else if(fp_step==2){...} — 互斥！
        if (this._eraseStep === 1) {
            if (addr === 0xAAAA && value === 0x55) {
                this._eraseStep = 2;
                return;
            }
            // step1不匹配：fall through到最后的0x8000/0xF0检查
        } else if (this._eraseStep === 2) {
            if (addr === 0x5555) {
                var newType = 0;
                switch (value) {
                    case 0x90: newType = 1; break;
                    case 0xA0: newType = 2; break;
                    case 0x80: newType = 3; break;
                    case 0xA8: newType = 4; break;
                    case 0x88: newType = 5; break;
                    case 0x78: newType = 6; break;
                }
                if (newType) {
                    this._eraseType = newType;
                    if (this._eraseType === 1) {
                        // ID读取：备份bank+0x4000处的两字节，写入识别码
                        this._eraseSelectedBank = bank;
                        this._eraseTemp1 = this.norbankheader[bank][0x4000];
                        this._eraseTemp2 = this.norbankheader[bank][0x4001];
                        // 对应C++：fp_step=3时才写识别码，这里只记录
                    }
                    this._eraseStep = 3;
                    return;
                }
            }
            // step2不匹配：fall through
        } else if (this._eraseStep === 3) {
            if (this._eraseType === 1) {
                if (value === 0xF0) {
                    // 恢复备份，退出ID模式
                    this.norbankheader[this._eraseSelectedBank][0x4000] = this._eraseTemp1;
                    this.norbankheader[this._eraseSelectedBank][0x4001] = this._eraseTemp2;
                    this._eraseStep = 0;
                    this._eraseType = 0;
                }
                return;
            } else if (this._eraseType === 2) {
                // 字节编程：bank基址 + (addr - 0x4000)，对应C++ bank + addr - 0x4000
                this.norbankheader[bank][addr - 0x4000] &= value;
                this._eraseStep = 4;
                return;
            } else if (this._eraseType === 4) {
                this._eraseBuff[addr & 0xFF] &= value;
                this._eraseStep = 4;
                return;
            } else if (this._eraseType === 3 || this._eraseType === 5) {
                if (addr === 0x5555 && value === 0xAA) {
                    this._eraseStep = 4;
                    return;
                }
            }
            // step3不匹配：fall through
        } else if (this._eraseStep === 4) {
            if (this._eraseType === 3 || this._eraseType === 5) {
                if (addr === 0xAAAA && value === 0x55) {
                    this._eraseStep = 5;
                    return;
                }
            }
            // step4不匹配：fall through
        } else if (this._eraseStep === 5) {
            if (addr === 0x5555 && value === 0x10) {
                // 全片擦除
                for (var i = 0; i < 32; i++) {
                    for (var j = 0; j < 0x8000; j++) {
                        this.norbankheader[i][j] = 0xFF;
                    }
                }
                if (this._eraseType === 5) {
                    for (var j = 0; j < 256; j++) this._eraseBuff[j] = 0xFF;
                }
                this._eraseStep = 6;
                return;
            }
            if (this._eraseType === 3 && value === 0x30) {
                // 扇区擦除：bank基址 + sector对齐偏移
                var offset = addr - 0x4000;
                var sectorBase = offset - (offset % 0x800);
                for (var j = 0; j < 0x800; j++) {
                    this.norbankheader[bank][sectorBase + j] = 0xFF;
                }
                this._eraseStep = 6;
                return;
            }
            if (this._eraseType === 5 && value === 0x48) {
                for (var j = 0; j < 256; j++) this._eraseBuff[j] = 0xFF;
                this._eraseStep = 6;
                return;
            }
            // step5不匹配：fall through
        }

        // 任意step下：0x8000写0xF0复位状态机（对应C++末尾检查）
        if (addr === 0x8000 && value === 0xF0) {
            this._eraseStep = 0;
            this._eraseType = 0;
        }
    };

    Wqx.prototype.resetCpu = function (){
        _trace('resetCpu');
        this.cpu = new M65C02Context();
        this.cpu.ram = this.ram;
        this.cpu.memmap = this.memmap;
        this.cpu.io_read_map = this.io_read_map;
        this.cpu.io_write_map = this.io_write_map;
        this.cpu.io_read = this.io_read;
        this.cpu.io_write = this.io_write;
        // RAM已就绪，在固件从复位向量启动前同步日期和时间
        this.syncCalendar();
        this.syncClock();
        this.cpu.cycles = 0;
        this.cpu.reg_a = 0;
        this.cpu.reg_x = 0;
        this.cpu.reg_y = 0;
        this.cpu.set_reg_ps(0x24);
        this.cpu.reg_pc = (this.memmap[7][0x1FFD] << 8) | this.memmap[7][0x1FFC];
        this.cpu.reg_sp = 0x01FF;
        this.cpu.irq = 1;
        this.cpu.nmi = 1;
        this.cpu.wai = 0;
        this.cpu.stp = 0;

        // 重置睡眠状态
        this.slept = false;
        this.shouldWakeUp = false;
        this.wakeUpPending = false;
        this.wakeUpKey = 0;
    };

    Wqx.prototype.loadBROM = function (buffer){
        _trace('loadBROM');
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
    };

    Wqx.prototype.loadNorFlash = function (buffer){
        _trace('loadNorFlash');
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
    };
    function uint8ArrayToBase64(bytes) {
        var binary = '';
        var len = bytes.byteLength;
        var chunk = 8192;
        for (var i = 0; i < len; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    function base64ToUint8Array(base64) {
        var binaryString = atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
    Wqx.prototype.updateLCD = function (addr, value){
        var offset = addr - this.lcdbuffaddr;
        var oldValue = this.ram[addr];
        var row = Math.floor(offset / 20);
        var col = offset % 20;
        var p = col * 8;
        var changed = oldValue ^ value;

        if (changed & 0x80) {
            if (value & 0x80) { if (col > 0) this.canvasCtx.fillRect(p + 0, row, 1, 1); }
            else              { if (col > 0) this.canvasCtx.clearRect(p + 0, row, 1, 1); }
        }
        if (changed & 0x40) {
            if (value & 0x40) this.canvasCtx.fillRect(p + 1, row, 1, 1);
            else              this.canvasCtx.clearRect(p + 1, row, 1, 1);
        }
        if (changed & 0x20) {
            if (value & 0x20) this.canvasCtx.fillRect(p + 2, row, 1, 1);
            else              this.canvasCtx.clearRect(p + 2, row, 1, 1);
        }
        if (changed & 0x10) {
            if (value & 0x10) this.canvasCtx.fillRect(p + 3, row, 1, 1);
            else              this.canvasCtx.clearRect(p + 3, row, 1, 1);
        }
        if (changed & 0x08) {
            if (value & 0x08) this.canvasCtx.fillRect(p + 4, row, 1, 1);
            else              this.canvasCtx.clearRect(p + 4, row, 1, 1);
        }
        if (changed & 0x04) {
            if (value & 0x04) this.canvasCtx.fillRect(p + 5, row, 1, 1);
            else              this.canvasCtx.clearRect(p + 5, row, 1, 1);
        }
        if (changed & 0x02) {
            if (value & 0x02) this.canvasCtx.fillRect(p + 6, row, 1, 1);
            else              this.canvasCtx.clearRect(p + 6, row, 1, 1);
        }
        if (changed & 0x01) {
            if (value & 0x01) this.canvasCtx.fillRect(p + 7, row, 1, 1);
            else              this.canvasCtx.clearRect(p + 7, row, 1, 1);
        }
        this.ram[addr] = value;
    };

    // 修复：小时进位用 &= 0xC0 保留高2位标志，对应C++ clock_buff[2] &= 0xC0
    Wqx.prototype.adjustTime = function (){
        _trace('adjustTime');
        if (++this.clockRecords[0] >= 60) {
            this.clockRecords[0] = 0;
            if (++this.clockRecords[1] >= 60) {
                this.clockRecords[1] = 0;
                // 小时只用低6位计数，高2位是标志位
                if ((this.clockRecords[2] & 0x3F) >= 23) {
                    this.clockRecords[2] &= 0xC0; // 保留高2位，清零小时计数
                    this.clockRecords[14] = (this.clockRecords[14] + 1) % 7;
                    if (++this.clockRecords[3] > 31) {
                        this.clockRecords[3] = 1;
                        if (++this.clockRecords[8] > 12) {
                            this.clockRecords[8] = 1;
                            this.clockRecords[9] = (this.clockRecords[9] + 1) % 100;
                        }
                    }
                } else {
                    this.clockRecords[2]++;
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
Wqx.prototype.saveState = function (){
    var state = {
        ram: uint8ArrayToBase64(this.ram),
        nor: uint8ArrayToBase64(this.nor),
        ramRomBank1: uint8ArrayToBase64(this.ramRomBank1),
        zp40cache: uint8ArrayToBase64(this.zp40cache),
        cpu: {
            reg_a: this.cpu.reg_a,
            reg_x: this.cpu.reg_x,
            reg_y: this.cpu.reg_y,
            reg_pc: this.cpu.reg_pc,
            reg_sp: this.cpu.reg_sp,
            cycles: this.cpu.cycles,
            flag_c: this.cpu.flag_c,
            flag_z: this.cpu.flag_z,
            flag_i: this.cpu.flag_i,
            flag_d: this.cpu.flag_d,
            flag_b: this.cpu.flag_b,
            flag_u: this.cpu.flag_u,
            flag_v: this.cpu.flag_v,
            flag_n: this.cpu.flag_n
        },
        timer0started: this.timer0started,
        timer0value: this.timer0value,
        timer0startcycles: this.timer0startcycles,  // ← 新增
        timer1started: this.timer1started,
        timer1value: this.timer1value,
        mayClockFlags: this.mayClockFlags,
        // 新增：保存 LCD 刷新所需的关键寄存器
        lcdbuffaddr: this.lcdbuffaddr,
        frameCounter: this.frameCounter,
        nmiCounter: this.nmiCounter,
        clockCounter: this.clockCounter,
        shouldIrq: this.shouldIrq
    };
    return state;  // 返回 state，不要在方法内写 localStorage，让调用者决定
};

Wqx.prototype.loadState = function (state){
    try {
        // 恢复 RAM
        this.ram.set(base64ToUint8Array(state.ram));
        this.nor.set(base64ToUint8Array(state.nor));
        this.ramRomBank1.set(base64ToUint8Array(state.ramRomBank1));
        this.zp40cache.set(base64ToUint8Array(state.zp40cache));
        
        // 重建 NOR 视图（重要！）
        for (var i = 0; i < 32; i++) {
            this.norbankheader[i] = getByteArray(this.nor, 0x8000 * i, 0x8000);
        }
        
        // 重建 RAM 分段视图
        this.ram2000_4000 = getByteArray(this.ram, 0x2000, 0x2000);
        this.ram4000_6000 = getByteArray(this.ram, 0x4000, 0x2000);
        this.memmap[map0000] = getByteArray(this.ram, 0, 0x2000);
        this.memmap[map2000] = this.ram2000_4000;
        this.memmap[map4000] = this.ram4000_6000;
        this.memmap[map6000] = getByteArray(this.ram, 0x6000, 0x2000);
        this.memmap[map8000] = getByteArray(this.ram, 0x8000, 0x2000);
        this.memmap[mapA000] = getByteArray(this.ram, 0xA000, 0x2000);
        this.memmap[mapC000] = getByteArray(this.ram, 0xC000, 0x2000);
        this.memmap[mapE000] = getByteArray(this.ram, 0xE000, 0x2000);
        
        // 恢复 CPU
        this.cpu.reg_a = state.cpu.reg_a;
        this.cpu.reg_x = state.cpu.reg_x;
        this.cpu.reg_y = state.cpu.reg_y;
        this.cpu.reg_pc = state.cpu.reg_pc;
        this.cpu.reg_sp = state.cpu.reg_sp;
        this.cpu.cycles = state.cpu.cycles;
        this.cpu.flag_c = state.cpu.flag_c;
        this.cpu.flag_z = state.cpu.flag_z;
        this.cpu.flag_i = state.cpu.flag_i;
        this.cpu.flag_d = state.cpu.flag_d;
        this.cpu.flag_b = state.cpu.flag_b;
        this.cpu.flag_u = state.cpu.flag_u;
        this.cpu.flag_v = state.cpu.flag_v;
        this.cpu.flag_n = state.cpu.flag_n;

        this.timer0started = state.timer0started;
        this.timer0value = state.timer0value;
        this.timer0startcycles = state.timer0startcycles || 0;  // ← 兼容旧存档
        this.timer1started = state.timer1started;
        this.timer1value = state.timer1value;
        this.mayClockFlags = state.mayClockFlags;
        
        // 恢复计数器
        if (state.frameCounter !== undefined) this.frameCounter = state.frameCounter;
        if (state.nmiCounter !== undefined) this.nmiCounter = state.nmiCounter;
        if (state.clockCounter !== undefined) this.clockCounter = state.clockCounter;
        if (state.shouldIrq !== undefined) this.shouldIrq = state.shouldIrq;

        // 重映射所有 bank（基于恢复后的寄存器值）
        var volumeid = this.ram[io0D_volumeid];
        var bank = this.ram[io00_bank_switch];
        var roabbs = this.ram[io0A_roa];
        
        // 重建 BIOS bank
        if ((volumeid & 0x03) === 1) {
            this.fillC000BIOSBank(this.volume1array);
            this.memmap[mapE000] = getByteArray(this.volume1array[0], 0x2000, 0x2000);
        } else if ((volumeid & 0x03) === 3) {
            this.fillC000BIOSBank(this.volume2array);
            this.memmap[mapE000] = getByteArray(this.volume2array[0], 0x2000, 0x2000);
        } else {
            this.fillC000BIOSBank(this.volume0array);
            this.memmap[mapE000] = getByteArray(this.volume0array[0], 0x2000, 0x2000);
        }
        
        // 重映射 4000-BFFF
        if (bank < 0x20) {
            this.may4000ptr = this.norbankheader[bank];
        } else if (bank >= 0x80) {
            if (volumeid & 0x01) {
                this.may4000ptr = this.volume1array[bank];
            } else if (volumeid & 0x02) {
                this.may4000ptr = this.volume2array[bank];
            } else {
                this.may4000ptr = this.volume0array[bank];
            }
        }
        this.switch4000ToBFFF();
        
        // 重映射 C000
        this.memmap[mapC000] = getByteArray(this.bbsbankheader[roabbs & 0x0F], 0, 0x2000);
        
        // 重映射 2000
        var page2000 = (roabbs & 0x04) ? this.ram4000_6000 : this.ram2000_4000;
        this.memmap[map2000] = page2000;
        
        // 恢复 LCD 缓冲区地址
        var lcdAddr = ((this.ram[io0C_lcd_config] & 0x03) << 12) | (this.ram[io06_lcd_config] << 4);
        this.setLcdStartAddr(lcdAddr);
        
        // 如果保存了 lcdbuffaddr，直接恢复
        if (state.lcdbuffaddr !== null && state.lcdbuffaddr !== undefined) {
            this.lcdbuffaddr = state.lcdbuffaddr;
            for (var i = 0; i < 1600; i++) {
                this.io_write_map[this.lcdbuffaddr + i] = true;
            }
        }
        
        // 重绘屏幕
        this.refreshLCD();
        
        console.log('State restored');
        return true;
    } catch (e) {
        console.error('Failed to load state:', e);
        return false;
    }
};

// 辅助方法：全屏重绘
Wqx.prototype.refreshLCD = function (){
    if (!this.lcdbuffaddr) return;
    for (var i = 0; i < 1600; i++) {
        var addr = this.lcdbuffaddr + i;
        this.updateLCD(addr, this.ram[addr]);
    }
};


    // 时间同步：仅同步 时、分、秒，保留 clockRecords[2] 高2位标志位
    Wqx.prototype.syncClock = function (){
        _trace('syncClock');
        var now = new Date();
        this.clockRecords[0] = now.getSeconds();
        this.clockRecords[1] = now.getMinutes();
        this.clockRecords[2] = (this.clockRecords[2] & 0xC0) | (now.getHours() & 0x3F);
    };

    // 日期同步：同步 年、月、日、星期
    Wqx.prototype.syncCalendar = function (){
        _trace('syncCalendar');
        var now = new Date();

        // 兼容某些固件使用的 RAM 备份
        this.ram[0x472] = now.getFullYear() - 1881; // 年份偏移1881
        this.ram[0x473] = now.getMonth();           // 月份0-based
        this.ram[0x474] = now.getDate() - 1;        // 日
    };

    // 从存档恢复后调用：只启动帧定时器，不resetCpu，保留已恢复的CPU状态
    Wqx.prototype.startFrame = function (){
        _trace('startFrame');
        if (!this.frameTimer) {
            this.frameTimer = setInterval(this.frame.bind(this), 1000 / FrameRate);
        }
    };

    Wqx.prototype.run = function (){
        _trace('run');
        this._timerCounter = 0;
        this._instCount = 0;
        this.resetCpu();
        if (!this.frameTimer) {
            this.frameTimer = setInterval(this.frame.bind(this), 1000 / FrameRate);
        }
    };

    Wqx.prototype.stop = function (){
        clearInterval(this.frameTimer);
        this.frameTimer = null;
    };

    Wqx.prototype.reset = function (){
        _trace('reset');
        this.resetCpu();
        this.frameCounter = 0;
        this.nmiCounter = 0;
        this.clockCounter = 0;
        this._eraseStep = 0;
        this._eraseType = 0;
    };

    Wqx.prototype.frame = function (){
        var frameCycles = CyclesPerFrame * (this.frameCounter + 1);
        var nmiCycles = CyclesPerNMI * (this.nmiCounter + 1);
        var clockCycles = CyclesPer4Ms * (this.clockCounter + 1);

        while (this.cpu.cycles < frameCycles) {

            this.cpu.execute();

            // NMI / timer0（每0.5秒触发一次）
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

            // IRQ 触发
            if (this.shouldIrq && !this.cpu.flag_i) {
                this.cpu.irq = 0;
                this.shouldIrq = false;
                this.cpu.doIrq();
            }

            this._instCount++;

            // timer1（每4ms）：含唤醒逻辑，对应C++ timer1_cycles 分支
            if (this.cpu.cycles >= clockCycles) {
                this.clockCounter++;
                clockCycles += CyclesPer4Ms;
                this.clockRecords[4]++;

                if (this.shouldWakeUp) {
                    // 唤醒：对应C++ should_wake_up 分支
                    this.shouldWakeUp = false;
                    this.ram[io01_int_enable] |= 0x01;
                    this.ram[0x02] |= 0x01;
                    // 跳回复位向量重新启动
                    this.cpu.reg_pc = (this.memmap[7][0x1FFD] << 8) | this.memmap[7][0x1FFC];
                } else {
                    this.ram[io01_int_enable] |= 0x08;
                    this.shouldIrq = true;
                }
            }

            this.totalInsts++;
        }

        //document.title = String(this.frameCounter);
        this.frameCounter++;
    };

    return Wqx;
})();
