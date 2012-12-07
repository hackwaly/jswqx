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

    var SPDC1016Frequency = 3686400;
    var FrameRate = 20;
    var NMIFrameIndex = FrameRate / 2;
    var CyclesPerFrame = SPDC1016Frequency / FrameRate;

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

        var doc = div.ownerDocument;
        var canvas = doc.createElement('canvas');
        this.width = div.offsetWidth;
        this.height = div.offsetHeight;
        canvas.width = this.width;
        canvas.height = this.height;
        div.appendChild(canvas);
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');

        this.frameCounter = 0;
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
        this.nor = null;
        this.norbankheader = [];
        this.ram = null;
        this.memmap = [];
        this.bbsbankheader = [];
        this.may4000ptr = null;
        this.cpu = null;
        this.initRom();
        this.initNor();
        this.initRam();
        this.initMemmap();
        this.initIo();
        this.initCpu();
    }


    Wqx.prototype.initRom = function (){
        this.rom = new Uint8Array(0x8000 * 512);
        for (var i=0; i<256; i++) {
            this.volume0array[i] = getByteArray(this.rom, 0x8000 * i, 0x8000);
            this.volume1array[i] = getByteArray(this.rom, 0x8000 * (i + 256), 0x8000);
        }
    };
    Wqx.prototype.initNor = function (){
        this.nor = new Uint8Array(0x8000 * 16);
        this.norbankheader = [];
        for (var i=0; i<16; i++) {
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
        this.memmap[map2000] = getByteArray(this.ram, 0x2000, 0x2000);
        this.memmap[map4000] = getByteArray(this.ram, 0x4000, 0x2000);
        this.memmap[map6000] = getByteArray(this.ram, 0x6000, 0x2000);
        this.memmap[map8000] = getByteArray(this.ram, 0x8000, 0x2000);
        this.memmap[mapA000] = getByteArray(this.ram, 0xA000, 0x2000);
        this.memmap[mapC000] = getByteArray(this.ram, 0xC000, 0x2000);
        this.memmap[mapE000] = getByteArray(this.ram, 0xE000, 0x2000);
        this.fillC000BIOSBank(this.volume0array);
        this.memmap[mapC000] = getByteArray(this.bbsbankheader[0], 0, 0x2000);
        this.may4000ptr = this.volume0array[0];
        this.memmap[mapE000] = getByteArray(this.volume0array[0], 0x2000, 0x2000);
        this.switch4000ToBFFF(0);
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
        if (this.ram[io0D_volumeid] & 0x01) {
            // Volume1,3
            this.bbsbankheader[1] = getByteArray(this.norbankheader[0], 0x2000, 0x2000);
        } else {
            // Volume0,2
            this.bbsbankheader[1] = getByteArray(this.ram, 0x4000, 0x2000);
        }
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
    Wqx.prototype.switch4000ToBFFF = function (bank){
        if (bank !== 0 || (this.ram[io0A_roa] & 0x80)) {
            // bank != 0 || ROA == RAM
            this.memmap[map4000] = getByteArray(this.may4000ptr, 0, 0x2000);
            this.memmap[map6000] = getByteArray(this.may4000ptr, 0x2000, 0x2000);
        } else {
            // bank == 0 && ROA == ROM
            if (this.ram[io0D_volumeid] & 0x01) {
                // Volume1,3
                // 4000~7FFF is 0 page of Nor.
                // 8000~BFFF is relative to may4000ptr
                this.memmap[map4000] = getByteArray(this.norbankheader[0], 0, 0x2000);
                this.memmap[map6000] = getByteArray(this.norbankheader[0], 0x2000, 0x2000);
            } else {
                // Volume0,2
                // 4000~5FFF is RAM
                // 6000~7FFF is mirror of 4000~5FFF
                this.memmap[map4000] = getByteArray(this.ram, 0x4000, 0x2000);
                this.memmap[map6000] = getByteArray(this.ram, 0x4000, 0x2000);
            }
        }
        this.memmap[map8000] = getByteArray(this.may4000ptr, 0x4000, 0x2000);
        this.memmap[mapA000] = getByteArray(this.may4000ptr, 0x6000, 0x2000);
//        this._dbg_logMemmap();
    };

    Wqx.prototype.initIo = function (){
        this.io_map = new Array(0x10000);
        for (var i=0; i<0x10000; i++) {
            this.io_map[i] = i < 0x40;
        }
        this.io_read = this.readIO.bind(this);
        this.io_write = this.writeIO.bind(this);
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
            case 0x08:
                return this.read08Port0();
            case 0x09:
                return this.read09Port1();
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
        console.log('read04StopTimer0: ' + this.ram[io04_general_ctrl]);
        return this.ram[io04_general_ctrl];
    };
    Wqx.prototype.getCpuCycles = function (){
        return (this.frameCounter * CyclesPerFrame) + this.cpu.cycles;
    };
    Wqx.prototype.read02Timer0Value = function (){
        if (this.timer0started) {
            this.timer0value = Math.floor((this.getCpuCycles() - this.timer0startcycles) /
                SPDC1016Frequency) & 0xFF;
        }
        console.log('read02Timer0Value: ' + this.timer0value);
        return this.timer0value;
    };
    Wqx.prototype.read05StartTimer0 = function (){
        console.log('read05StartTimer0');
        this.timer0started = true;
        this.timer0startcycles = this.getCpuCycles();
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
        console.log('read06StopTimer1');
        //todo
        return this.ram[io06_lcd_config];
    };
    Wqx.prototype.read07StartTimer1 = function (){
        console.log('read06StopTimer1');
    };
    Wqx.prototype.read08Port0 = function (){
//        console.log('readPort0');
        this.updateKeypadRegisters();
        return this.ram[io08_port0_data];
    };
    Wqx.prototype.read09Port1 = function (){
//        console.log('readPort1');
        this.updateKeypadRegisters();
        return this.ram[io09_port1_data];
    };
    Wqx.prototype.writeIO = function (addr, value){
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
                return this.writeZeroPageBankswitch(value);
            case 0x15:
                return this.controlPort1(value);
            case 0x20:
                return this.write20JG(value);
        }
        this.ram[addr] = value;
    };

    Wqx.prototype.write00BankSwitch = function (bank){
//        console.log('write00BankSwitch: ' + bank);
        if (this.ram[io0A_roa] & 0x80) {
            // ROA == 1
            // RAM (norflash?!)
            var norbank = bank & 0x0F; // nor only have 0~F page
            this.may4000ptr = this.norbankheader[norbank];
            this.switch4000ToBFFF(norbank);
        } else {
            // ROA == 0
            // BROM
            if (this.ram[io0D_volumeid] & 0x01) {
                // VolumeID == 1, 3
                this.may4000ptr = this.volume1array[bank];
                this.switch4000ToBFFF(bank);
            } else {
                // VolumeID == 0, 2
                this.may4000ptr = this.volume0array[bank];
                this.switch4000ToBFFF(bank);
            }
        }
        // update at last
        this.ram[io00_bank_switch] = bank;
//        console.log(this.cpu.cycles);
    };
    Wqx.prototype.write02Timer0Value = function (value){
        console.log('write02Timer0Value: ' + value);
        if (this.timer0started) {
            this.timer0startcycles = (this.getCpuCycles() -
                (value * SPDC1016Frequency / 10));
        } else {
            this.timer0value = value;
        }
    };
    Wqx.prototype.write05ClockCtrl = function (value){
        console.log('write05ClockCtrl: ' + value);
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
    Wqx.prototype.write06LCDStartAddr = function (value){
        console.log('write06LCDStartAddr: ' + value);
        if (this.lcdbuffaddr == null) {
            this.lcdbuffaddr = ((this.ram[io0C_lcd_config] & 0x03) << 12) | (value << 4);
            console.log('lcdAddr: ' + this.lcdbuffaddr);
        }
        this.ram[io06_lcd_config] = value;
        // SPDC1016
        // don't know how wqxsim works.
        this.ram[io09_port1_data] &= 0xFE; // remove bit0 of port1 (keypad)
    };
    Wqx.prototype.write08Port0 = function (value){
//        console.log('write08Port0: ' + value);
        this.ram[io08_port0_data] = value;
        var row6data = 0;
        var row7data = 0;
        var xbit = 1;
        for (var x = 0; x < 8; x++) {
            if ((this.keypadmatrix[1][x] != 1)) {
                row6data |= xbit;
            }
            if ((this.keypadmatrix[0][x] != 1)) {
                row7data |= xbit;
            }
            xbit = xbit << 1;
        }
        // workaround?
        if (row6data == 0xFF) {
            row6data = 0;
        }
        if (row7data == 0xFF) {
            row7data = 0;
        }
        if (row6data == value || value == 0 || row7data == 0xFB) {
            // newvalue fit to some hotkey in row6
            // or newvalue is 0 (all colume is 0)
            // or row7 == FB (ON/OFF)
            this.ram[io0B_lcd_ctrl] &= 0xFE; // Remove LCDIR1
        } else {
            this.ram[io0B_lcd_ctrl] |= 0x01; // Add LCDIR1 |= 0x1
        }
        this.updateKeypadRegisters();
    };
    Wqx.prototype.write09Port1 = function (value){
//        console.log('write09Port1: ' + value);
        this.ram[io09_port1_data] = value;
        var row6data = 0;
        var row7data = 0;
        var xbit = 1;
        for (var x = 0; x < 8; x++) {
            if ((this.keypadmatrix[1][x] != 1)) {
                row6data |= xbit;
            }
            if ((this.keypadmatrix[0][x] != 1)) {
                row7data |= xbit;
            }
            xbit = xbit << 1;
        }
        // workaround
        if (row6data == 0xFF) {
            row6data = 0;
        }
        if (row7data == 0xFF) {
            row7data = 0;
        }
        var port0bit01 = this.ram[io08_port0_data] & 0x03;
        if (value == 0) {
            //case 0u:
            //    // none of P10~P17 is set.
            //    io0b_2 = io0B_port3;
            //    port0bit01_ = gFixedRAM0[io08_port0_real] & 3;// 00 01 10 11
            //    row6iszero = keypadmatrix1[6] == 0;     // no hotkey
            //    row7data = keypadmatrix1[7];        // ON/OFF
            //    gFixedRAM0[io0B_port3] = port0bit01_;// remove b2~b7
            //    if ( !row6iszero || row7data )
            //        // have hotkey, or have on/off
            //        gFixedRAM0[io0b_2] = port0bit01_ ^ 3;// 00 -> 11 01 -> 10 10 -> 01 11 -> 00
            //    if ( row7data == 0xFD )
            //        // row7 is record/play
            //        gFixedRAM0[io0b_2] &= 0xFEu;    // Remove LCDIR1
            //    break;
            this.ram[io0B_lcd_ctrl] = port0bit01; // remove b2~b7
            if ((row6data != 0xFF) || (row7data != 0xFF)) {
                // hotkey or on/off
                this.ram[io0B_lcd_ctrl] = port0bit01 ^ 0x03; // remove b2~b7, reverse b0,b1
            }
            if (row7data == 0xFD) {
                // record/play
                this.ram[io0B_lcd_ctrl] &= 0xFE;
            }
        }
        if ((value == 0xFD) || (value == 0xFE)) {
            //case 0xFDu:
            //case 0xFEu:
            //    // ~P16 ~P17
            //    io0b_1 = io0B_port3;
            //    port0bit01 = gFixedRAM0[io08_port0_real] & 3;// 00 01 10 11
            //    issame = keypadmatrix1[7] == tmpAXYValue;
            //    gFixedRAM0[io0B_port3] = port0bit01;// remove b2~b7
            //    if ( issame )
            //        // row7 is same as [09]
            //        gFixedRAM0[io0b_1] = port0bit01 ^ 3;// remove b2~b7, reverse b0,b1
            //    break;
            this.ram[io0B_lcd_ctrl] = port0bit01; // remove b2~b7
            if (row7data == value) {
                // row7 is same as [09]
                this.ram[io0B_lcd_ctrl] = port0bit01 ^ 0x3; // remove b2~b7, reverse b0,b1
            }
        }
        if (value == 0x03) {
            //case 3u:
            //    // both P11 P10, used for p00~p07 send and all 1, p10-p11 send and all 1
            //    io0b = io0B_port3;
            //    io08valuebit01 = gFixedRAM0[io08_port0_real] & 3;
            //    gFixedRAM0[io0B_port3] = io08valuebit01;// remove b2~b7
            //    if ( row7data_ == 0xFB )
            //        gFixedRAM0[io0b] = io08valuebit01 ^ 3;// remove b2~b7, reverse b0,b1
            //    goto LABEL_19;
            this.ram[io0B_lcd_ctrl] = port0bit01; // remove b2~b7
            if (row7data == 0xFB) {
                // on/off
                this.ram[io0B_lcd_ctrl] = port0bit01 ^ 0x3; // remove b2~b7, reverse b0,b1
            }
        }
        // FIXME: 02, 01 Emulator rulz
        if (value == 0x02) {
            this.ram[io08_port0_data] = row6data;
        }
        if (value == 0x01) {
            this.ram[io08_port0_data] = row7data;
        }
        if (((value != 0xFD) && (value != 0xFE) &&
            (value != 0x00) && (value != 0x02) && (value != 0x01) && (value != 0x03)) ||
            ((value == 0x03) && (this.ram[io15_port1_dir] == 0xFC))) {
            this.updateKeypadRegisters();
        }
    };
    Wqx.prototype.write0AROABBS = function (value){
//        console.log('write0AROABBS: ' + value);
        if (value !== this.ram[io0A_roa]) {
            // Update memory pointers only on value changed
            var bank;
            if (value & 0x80) {
                // ROA == 1
                // RAM (norflash)
                bank = (this.ram[io00_bank_switch] & 0x0F); // bank = 0~F
                this.may4000ptr = this.norbankheader[bank];
            } else {
                // ROA == 0
                // ROM (nor or ROM?)
                bank = this.ram[io00_bank_switch];
                if (this.ram[io0D_volumeid] & 0x01) {
                    // Volume1,3
                    this.may4000ptr = this.volume1array[bank];
                } else {
                    // Volume0,2
                    this.may4000ptr = this.volume0array[bank];
                }
            }
            this.ram[io0A_roa] = value;
            this.switch4000ToBFFF(bank);
            this.memmap[mapC000] = getByteArray(this.bbsbankheader[value & 0x0F], 0, 0x2000);
        }
        // in simulator destination memory is updated before call WriteIO0A_ROA_BBS
        //fixedram0000[io0A_roa] = value;
//        this._dbg_logMemmap();
    };
    Wqx.prototype.writeTimer01Control = function (value){
        console.log('writeTimer01Control: ' + value);
        if (this.lcdbuffaddr === null) {
            this.lcdbuffaddr = ((value & 0x03) << 12) | (this.ram[io06_lcd_config] << 4);
            console.log('lcdAddr: ' + this.lcdbuffaddr);
        }
        this.ram[io0C_lcd_config] = value;
    };
    Wqx.prototype.write0DVolumeIDLCDSegCtrl = function (value){
//        console.log('write0DVolumeIDLCDSegCtrl: ' + value);
        if (value ^ this.ram[io0D_volumeid] & 0x01) {
            // bit0 changed.
            // volume1,3 != volume0,2
            var bank = this.ram[io00_bank_switch];
            if (value & 0x01) {
                // Volume1,3
                this.fillC000BIOSBank(this.volume1array);
                this.may4000ptr = this.volume1array[bank];
                this.memmap[mapE000] = getByteArray(this.volume1array[0], 0x2000, 0x2000);
            } else {
                // Volume0,2
                this.fillC000BIOSBank(this.volume0array);
                this.may4000ptr = this.volume0array[bank];
                this.memmap[mapE000] = getByteArray(this.volume0array[0], 0x2000, 0x2000);
            }
            var roabbs = this.ram[io0A_roa];
            if (roabbs & 0x80) {
                // ROA == 1
                // RAM(nor)
                bank = bank & 0x0F;
                this.may4000ptr = this.norbankheader[bank];
            }
            this.memmap[mapC000] = this.bbsbankheader[roabbs & 0x0F];
            this.switch4000ToBFFF(bank);
        }
        this.ram[io0D_volumeid] = value;
//        this._dbg_logMemmap();
    };
    Wqx.prototype.writeZeroPageBankswitch = function (value){
//        console.log('writeZeroPageBankswitch: ' + value);
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
    Wqx.prototype.controlPort1 = function (value){
//        console.log('controlPort1: ' + value);
        this.ram[io15_port1_dir] = value;
        this.updateKeypadRegisters();
    };
    Wqx.prototype.updateKeypadRegisters = function (){
        // TODO: 2pass check
        //qDebug("old [0015]:%02x [0009]:%02x [0008]:%02x", mem[0x15], mem[0x9], mem[0x8]);
        //var up = 0, down = 0;
        var port1control = this.ram[io15_port1_dir];
        var port0control = this.ram[io0F_port0_dir] & 0xF0; // b4~b7
        var port1controlbit = 1; // aka, y control bit
        var tmpdest0 = 0;
        var tmpdest1 = 0;
        var port1data = this.ram[io09_port1_data];
        var port0data = this.ram[io08_port0_data];
        for (var y = 0; y < 8; y++) {
            // y = Port10~Port17
            var ysend = ((port1control & port1controlbit) != 0);
            var xbit = 1;
            for (var x = 0; x < 8; x++) {
                // x = Port00~Port07
                var port0controlbit;
                if (x < 2) {
                    // 0, 1 = b4 b5
                    port0controlbit = xbit << 4;
                } else if (x < 4) {
                    // 2, 3 = b6
                    port0controlbit = 0x40;
                } else {
                    // 4, 5, 6, 7 = b7
                    port0controlbit = 0x80;
                }
                if (y < 2 && (port1data == 0x02 || port1data == 0x01)) {
                    // Emulator rulz, only for port1 is single 0x02 0x01
                    // TODO: invert when y < 2 (row 6,7)
                    // 0,2 is both high
                    if (ysend) {
                        // port1y-> port0x
                        // port1y is send but only set bit to high when port0 xbit is receive too
                        if ((this.keypadmatrix[y][x] != 1) && ((port1data & port1controlbit) != 0) && ((port0control & port0controlbit) == 0)) {
                            tmpdest0 |= xbit;
                        }
                    } else {
                        // port0x -> port1y
                        // port1y should be receive, only set bit to high when port0 xbit is send
                        if ((this.keypadmatrix[y][x] != 1) && ((port0data & xbit) != 0) && ((port0control & port0controlbit) != 0)) {
                            tmpdest1 |= xbit;
                        }
                    }
                } else if (this.keypadmatrix[y][x] != 2) {
                    if (ysend) {
                        // port1y-> port0x
                        // port1y is send but only set bit to high when port0 xbit is receive too
                        if ((this.keypadmatrix[y][x]) && ((port1data & port1controlbit) != 0) && ((port0control & port0controlbit) == 0)) {
                            tmpdest0 |= xbit;
                        }
                    } else {
                        // port0x -> port1y
                        // port1y should be receive, only set bit to high when port0 xbit is send
                        if ((this.keypadmatrix[y][x]) && ((port0data & xbit) != 0) && ((port0control & port0controlbit) != 0)) {
                            tmpdest1 |= xbit;
                        }
                    }
                }
                xbit = xbit << 1;
            }
            port1controlbit = port1controlbit << 1;
        }
        if (port1control != 0xFF) {
            // port1 should clean some bits
            // using port1control as port1mask
            // sometimes port10,11 should clean here 
            port1data &= port1control; // pre set receive bits to 0
        }
        if (port1control != 0xF0) {
            // clean port0
            // calculate port0 mask
            // in most case port0 will be set to 0
            var port0mask = (port0control >> 4) & 0x3; // bit4->0 bit5->1
            if (port0control & 0x40) {
                // bit6->2,3
                port0mask |= 0x0C; // 00001100
            }
            if (port0control & 0x80) {
                // bit7->4,5,6,7
                port0mask |= 0xF0; // 11110000
            }
            port0data &= port0mask;
        }
        port0data |= tmpdest0;
        port1data |= tmpdest1;
        this.ram[io09_port1_data] = port1data;
        this.ram[io08_port0_data] = port0data;
    };
    Wqx.prototype.write20JG = function (value){
        console.log('write20JG');
    };

    Wqx.prototype.initCpu = function (){
        this.cpu = new M65C02Context();
        this.cpu.ram = this.ram;
        this.cpu.memmap = this.memmap;
        this.cpu.io_map = this.io_map;
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
    };

    Wqx.prototype.updateLCD = function (){
        var lcdBuffer = getByteArray(this.ram, this.lcdbuffaddr, 160*80/8);
        var imageData = this.canvasCtx.createImageData(160, 80);
        for (var i=0; i<80; i++) {
            for (var j=0; j<20; j++) {
                var p = (160 * i + 8 * j) * 4;
                var pixelsByte = lcdBuffer[20*i+j];
                var pixel1 = (pixelsByte & 0x01) ? 255 : 0;
                var pixel2 = (pixelsByte & 0x02) ? 255 : 0;
                var pixel3 = (pixelsByte & 0x04) ? 255 : 0;
                var pixel4 = (pixelsByte & 0x08) ? 255 : 0;
                var pixel5 = (pixelsByte & 0x10) ? 255 : 0;
                var pixel6 = (pixelsByte & 0x20) ? 255 : 0;
                var pixel7 = (pixelsByte & 0x40) ? 255 : 0;
                var pixel8 = (pixelsByte & 0x80) ? 255 : 0;
                imageData.data[p+0] = pixel1;
                imageData.data[p+1] = pixel1;
                imageData.data[p+2] = pixel1;
                imageData.data[p+4] = pixel2;
                imageData.data[p+5] = pixel2;
                imageData.data[p+6] = pixel2;
                imageData.data[p+8] = pixel3;
                imageData.data[p+9] = pixel3;
                imageData.data[p+10] = pixel3;
                imageData.data[p+12] = pixel4;
                imageData.data[p+13] = pixel4;
                imageData.data[p+14] = pixel4;
                imageData.data[p+16] = pixel5;
                imageData.data[p+17] = pixel5;
                imageData.data[p+18] = pixel5;
                imageData.data[p+20] = pixel6;
                imageData.data[p+21] = pixel6;
                imageData.data[p+22] = pixel6;
                imageData.data[p+24] = pixel7;
                imageData.data[p+25] = pixel7;
                imageData.data[p+26] = pixel7;
                imageData.data[p+28] = pixel8;
                imageData.data[p+29] = pixel8;
                imageData.data[p+30] = pixel8;
            }
        }
        this.canvasCtx.putImageData(imageData, 0, 0);
    };

    Wqx.prototype.checkTimebaseAndEnableIRQnEXIE1 = function (){
        //if ( gFixedRAM0_04_general_ctrl & 0xF )
        //{
        //    // TimeBase Clock Select bit0~3
        //    LOBYTE(gThreadFlags) = gThreadFlags | 0x10; // add 0x10 to gThreadFlags
        //    gFixedRAM0[(unsigned __int8)io01_int_ctrl] |= 8u;// EXTERNAL INTERRUPT SELECT1
        //}
        if (this.ram[io04_general_ctrl] & 0x0F) {
            this.shouldIrq = true;
            this.ram[io01_int_enable] |= 0x08; // EXTERNAL INTERRUPT SELECT1
        }
    };

    Wqx.prototype.turnoff2HzNMIMaskAddIRQFlag = function (){
        if (this.ram[io04_general_ctrl] & 0x0F) {
            this.shouldIrq = true;
            // 2Hz NMI Mask off
            this.ram[io01_int_enable] |= 0x10;
        }
    };

    Wqx.prototype.run = function (){
        this.initCpu();
        clearInterval(this.frameTimer);
        this.__deadlockCounter = 0;
        this.frameTimer = setInterval(this.frame.bind(this), 1000 / FrameRate);
    };

    Wqx.prototype.stop = function (){
        clearInterval(this.frameTimer);
    };

    Wqx.prototype.frame = function (){
        var deadlockCounter = 0;
        this.cpu.cycles = 0;
        do {

//            if (this.totalInsts === 594013) {
//                debugger;
//            }
            if ((this.totalInsts & 0x7FFFF) === 0x7FFFF) {
                this.shouldNmi = true;
            }
            if (this.shouldNmi) {
                this.cpu.nmi = 0;
                this.shouldNmi = false;
                this.__deadlockCounter--;
                console.log('nmi');
            } else if (this.shouldIrq && !this.cpu.flag_i) {
                this.cpu.irq = 0;
                this.shouldIrq = false;
                this.__deadlockCounter--;
//                console.log('irq');
            }
            this.__deadlockCounter++;
            if (this.__deadlockCounter === 3000) {
                this.__deadlockCounter = 0;
                if (this.ram[io04_general_ctrl] & 0x0F) {
                    this.ram[io01_int_enable] |= 0x08;
                    this.shouldIrq = true;
                }
                if (this.timer0started) {
                    debugger;
                    this.shouldIrq = true;
                }
            }
            this.cpu.execute();
            if (typeof DebugCpuRegsRecords !== 'undefined' &&
                this.totalInsts >= 739999) {
                var logRow = DebugCpuRegsRecords[this.totalInsts-739999];
                if (!(logRow.reg_a === this.cpu.reg_a &&
                    logRow.reg_x === this.cpu.reg_x &&
                    logRow.reg_y === this.cpu.reg_y &&
                    logRow.reg_pc === this.cpu.reg_pc &&
                    logRow.reg_sp === this.cpu.reg_sp &&
                    logRow.reg_ps === this.cpu.get_reg_ps())) {
                    debugger;
                }
            }
            this.totalInsts++;
        } while (this.cpu.cycles < CyclesPerFrame);
        this.frameCounter++;
        this.cpu.cycles -= CyclesPerFrame;
//        if ((this.frameCounter % FrameRate) === NMIFrameIndex) {
//            this.shouldNmi = true;
//        }
        document.title = (this.frameCounter);
        this.updateLCD();
    };

    return Wqx;
})();