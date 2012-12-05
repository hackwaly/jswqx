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
        this.rom_buffer = null;
        this.rom = null;
        this.volume0_array = [];
        this.volume1_array = [];
        this.nor_buffer = null;
        this.nor = null;
        this.nor_bank_header = [];
        this.ram_buffer = null;
        this.ram = null;
        this.memmap = [];
        this.bbs_bank_header = [];
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
        this.rom_buffer = new ArrayBuffer(0x8000 * 512);
        this.rom = new Uint8Array(this.rom_buffer);
        for (var i=0; i<256; i++) {
            this.volume0_array[i] = getByteArray(this.rom, 0x8000 * i, 0x8000);
            this.volume1_array[i] = getByteArray(this.rom, 0x8000 * (i + 256), 0x8000);
        }
    };
    Wqx.prototype.initNor = function (){
        this.nor_buffer = new ArrayBuffer(0x8000 * 16);
        this.nor = getByteArray(this.nor_buffer);
        this.nor_bank_header = [];
        for (var i=0; i<16; i++) {
            this.nor_bank_header[i] = getByteArray(this.nor, 0x8000 * i, 0x8000);
        }
    };
    Wqx.prototype.initRam = function (){
        this.ram_buffer = new ArrayBuffer(0x10000);
        this.ram = getByteArray(this.ram_buffer);
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
        this.fillC000BiosBank(this.volume0_array);
        this.memmap[mapC000] = getByteArray(this.bbs_bank_header[0], 0, 0x2000);
        this.may4000ptr = this.volume0_array[0];
        this.memmap[mapE000] = getByteArray(this.volume0_array[0], 0x2000, 0x2000);
        this.switch4000ToBFFF(0);
    };
    Wqx.prototype.fillC000BiosBank = function (volume_array){
        this.bbs_bank_header[0] = getByteArray(volume_array[0], 0, 0x2000);
        if (this.ram[io0D_volumeid] & 1) {
            // Volume1,3
            this.bbs_bank_header[1] = getByteArray(this.nor_bank_header[0], 0x2000, 0x2000);
        } else {
            // Volume0,2
            this.bbs_bank_header[1] = getByteArray(this.ram, 0x4000, 0x2000);
        }
        this.bbs_bank_header[2] = getByteArray(volume_array[0], 0x4000, 0x2000);
        this.bbs_bank_header[3] = getByteArray(volume_array[0], 0x6000, 0x2000);
        // 4567, 89AB, CDEF take first 4page 0000~7FFF in BROM
        for (var i = 0; i < 3; i++) {
            this.bbs_bank_header[i * 4 + 4] = getByteArray(volume_array[0], 0x8000 * (i + 1), 0x2000);
            this.bbs_bank_header[i * 4 + 5] = getByteArray(volume_array[0], 0x8000 * (i + 1) + 0x2000, 0x2000);
            this.bbs_bank_header[i * 4 + 6] = getByteArray(volume_array[0], 0x8000 * (i + 1) + 0x4000, 0x2000);
            this.bbs_bank_header[i * 4 + 7] = getByteArray(volume_array[0], 0x8000 * (i + 1) + 0x6000, 0x2000);
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
                this.memmap[map4000] = getByteArray(this.nor_bank_header[0], 0, 0x2000);
                this.memmap[map6000] = getByteArray(this.nor_bank_header[0], 0x2000, 0x2000);
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
            case 0x07:
                return this.write07StartTimer1(value);
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
                return void(0);
        }
    };
    Wqx.prototype.write00BankSwitch = function (value){
        console.log('write00BankSwitch');
    };
    Wqx.prototype.write02Timer0Value = function (value){
        console.log('write02Timer0Value');
    };
    Wqx.prototype.write05ClockCtrl = function (value){
        console.log('write05ClockCtrl');
    };
    Wqx.prototype.write06LCDStartAddr = function (value){
        console.log('write06LCDStartAddr');
    };
    Wqx.prototype.write07StartTimer1 = function (value){
        console.log('write07StartTimer1');
    };
    Wqx.prototype.writePort0 = function (value){
        console.log('writePort0');
    };
    Wqx.prototype.writePort1 = function (value){
        console.log('writePort1');
    };
    Wqx.prototype.write0AROABBS = function (value){
        console.log('write0AROABBS');
    };
    Wqx.prototype.writeTimer01Control = function (value){
        console.log('writeTimer01Control');
    };
    Wqx.prototype.write0DVolumeIDLCDSegCtrl = function (value){
        console.log('write0DVolumeIDLCDSegCtrl');
    };
    Wqx.prototype.writeZeroPageBankswitch = function (value){
        console.log('writeZeroPageBankswitch');
    };
    Wqx.prototype.controlPort1 = function (value){
        console.log('controlPort1');
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
        var bufferView = getByteArray(buffer);
        var byteOffset = 0;
        while (byteOffset < buffer.byteLength) {
            for (var i=0; i<0x4000; i++) {
                this.rom[byteOffset+0x4000+i] = bufferView[byteOffset+i];
            }
            for (var j=0; j<0x4000; j++) {
                this.rom[byteOffset+j] = bufferView[byteOffset+0x4000+j];
            }
            byteOffset += 0x8000;
        }
    };

    Wqx.prototype.run = function (){
        this.initCpu();
        do {
            this.cpu.execute();
            console.log('reg_pc:' + this.cpu.reg_pc);
        } while (this.cpu.cycles < 200);
    };

    return Wqx;
})();