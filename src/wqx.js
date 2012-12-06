// cc800
// http://bbs.emsky.net/viewthread.php?tid=33474

var Wqx = (function (){
    var io00_bank_switch = 0x00;
    var io01_int_enable = 0x01;
    var io01_int_status = 0x01;
    var io02_timer0_val = 0x02;
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

    function Wqx(opts){
        opts = opts || {};
        this.lcdoffshift0flag = 0;
        this.lcdbuffaddr = 0;
        this.timer0started = false;
        this.timer0waveoutstart = false;
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
    };
    Wqx.prototype.fillC000BIOSBank = function (volume_array){
        this.bbsbankheader[0] = getByteArray(volume_array[0], 0, 0x2000);
        if (this.ram[io0D_volumeid] & 1) {
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
            this.bbsbankheader[i * 4 + 4] = getByteArray(volume_array[0], 0x8000 * (i + 1), 0x2000);
            this.bbsbankheader[i * 4 + 5] = getByteArray(volume_array[0], 0x8000 * (i + 1) + 0x2000, 0x2000);
            this.bbsbankheader[i * 4 + 6] = getByteArray(volume_array[0], 0x8000 * (i + 1) + 0x4000, 0x2000);
            this.bbsbankheader[i * 4 + 7] = getByteArray(volume_array[0], 0x8000 * (i + 1) + 0x6000, 0x2000);
        }
    };
    Wqx.prototype.switch4000ToBFFF = function (bank){
        if (bank != 0 || this.ram[io0A_roa] & 0x80) {
            // bank != 0 || ROA == RAM
            this.memmap[map4000] = getByteArray(this.may4000ptr, 0x2000);
            this.memmap[map6000] = getByteArray(this.may4000ptr, 0x2000);
        } else {
            // bank == 0 && ROA == ROM
            if (this.ram[io0D_volumeid] & 0x1) {
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
            case 0x04:
                return this.read04StopTimer0();
            case 0x05:
                return this.read05StartTimer0;
            case 0x06:
                return this.read06StopTimer1();
            case 0x07:
                return this.read07StartTimer1();
            case 0x08:
                return this.readPort0();
            case 0x09:
                return this.readPort1();
            default:
                return this.ram[addr];
        }
    };
    Wqx.prototype.read00BankSwitch = function (){
        console.log('read00BankSwitch');
    };
    Wqx.prototype.read04StopTimer0 = function (){
        console.log('read04StopTimer0');
        this.timer0started = false;
        if (this.timer0waveoutstart) {
            this.timer0waveoutstart = false;
        }
        return this.ram[io04_general_ctrl];
    };
    Wqx.prototype.read05StartTimer0 = function (){
        console.log('read05StartTimer0');

    };
    Wqx.prototype.read06StopTimer1 = function (){
        console.log('read06StopTimer1');

    };
    Wqx.prototype.read07StartTimer1 = function (){
        console.log('read06StopTimer1');
    };
    Wqx.prototype.readPort0 = function (){
        console.log('readPort0');
    };
    Wqx.prototype.readPort1 = function (){
        console.log('readPort1');
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
                return this.writePort0(value);
            case 0x09:
                return this.writePort1(value);
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
            default:
                this.ram[addr] = value;
                break;
        }
    };
    Wqx.prototype.write00BankSwitch = function (bank){
        console.log('write00BankSwitch: ' + bank);
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
    };
    Wqx.prototype.write02Timer0Value = function (value){
        console.log('write02Timer0Value');
    };
    Wqx.prototype.write05ClockCtrl = function (value){
        console.log('write05ClockCtrl: ' + value);
        // FROM WQXSIM
        // SPDC1016
        if (this.ram[io05_clock_ctrl] & 0x08) {
            // old bit3, LCDON
            if ((value & 0x0F) == 0) {
                // new bit0~bit3 is 0
                this.lcdoffshift0flag = 1;
            }
        }
        this.ram[io05_clock_ctrl] = value;
    };
    Wqx.prototype.write06LCDStartAddr = function (value){
        console.log('write06LCDStartAddr');
        this.lcdbuffaddr = ((this.ram[io0C_lcd_config] & 0x3) << 12) | (value << 4);
        this.ram[io06_lcd_config] = value;
        // SPDC1016
        // don't know how wqxsim works.
        this.ram[io09_port1_data] &= 0xFE; // remove bit0 of port1 (keypad)
    };
    Wqx.prototype.writePort0 = function (value){
        console.log('writePort0');
    };
    Wqx.prototype.writePort1 = function (value){
        console.log('writePort1');
    };
    Wqx.prototype.write0AROABBS = function (value){
        console.log('write0AROABBS: ' + value);
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
    };
    Wqx.prototype.writeTimer01Control = function (value){
        console.log('writeTimer01Control');
        this.lcdbuffaddr = ((value & 0x3) << 12) | (this.ram[io06_lcd_config] << 4);
        this.ram[io0C_lcd_config] = value;
    };
    Wqx.prototype.write0DVolumeIDLCDSegCtrl = function (value){
        console.log('write0DVolumeIDLCDSegCtrl');
        if (value ^ this.ram[io0D_volumeid] & 0x01) {
            // bit0 changed.
            // volume1,3 != volume0,2
            var bank = this.ram[io00_bank_switch];
            if (value & 0x01) {
                // Volume1,3
                this.fillC000BIOSBank(this.volume1array);
                this.may4000ptr = this.volume1array[bank];
                this.memmap[mapE000] = getByteArray(this.volume1array, 0x2000, 0x2000);
            } else {
                // Volume0,2
                this.fillC000BIOSBank(this.volume0array);
                this.may4000ptr = this.volume0array[bank];
                this.memmap[mapE000] = getByteArray(this.volume0array, 0x2000, 0x2000);
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
    };
    Wqx.prototype.writeZeroPageBankswitch = function (value){
        console.log('writeZeroPageBankswitch: ' + value);
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
        console.log('controlPort1: ' + value);
        this.ram[io15_port1_dir] = value;
        this.updateKeypadRegisters();
    };
    Wqx.prototype.updateKeypadRegisters = function (){
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

    Wqx.prototype.run = function (){
        this.initCpu();
        do {
            this.cpu.execute();
        } while (this.cpu.cycles < 100000);
    };

    return Wqx;
})();