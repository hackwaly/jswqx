var js_beautify = require('./js_beautify.js');
var fs = require('fs');


var $CMOS = '';
function $CYC(v){
    return 'this.cycles += ' + v + ';';
}

var $POP = 'this.ram[this.reg_sp=++this.reg_sp&0xFF|0x100]';
function $PUSH(v){
    return 'this.ram[this.reg_sp] = ' + v + ';' +
        'this.reg_sp = --this.reg_sp&0xFF|0x100;';
}

function $BYTE(v){
    return 'this.memmap[' + v + '>>13][' + v + '&0x1FFF]';
}
function $WORD(v){
    return '(((' + v + '<0xFFFF ? ' + $BYTE('(' + v + '+1)') + ' : this.ram[0]) << 8) | ' + $BYTE(v) + ')';
}

var $READ = '(this.io_read_map[this._addr] ? ' +
        'this.io_read(this._addr) : ' +
        $BYTE('this._addr') + ')';
function $WRITE(v){
    return 'if (this.io_write_map[this._addr]) {' +
            'this.io_write(this._addr, ' + v + ');' +
        '} else {' +
            $BYTE('this._addr') + '=' + v + ';' +
        '}';
}

function $SETNZ(v){
    return 'this.flag_n = (' + v + ' & 0x80) >> 7;' +
        'this.flag_z = (' + v + ' & 0xFF) ? 0 : 1;';
}
function $TO_BCD(v){
    return '((((' + v + ' / 10) % 10) << 4) | (' + v + ' % 10))';
}
function $TO_BIN(v){
    return '((' + v + ' >> 4) * 10 + (' + v + ' & 0x0F))';
}

var $ABS = 'this._addr = ' +  $WORD('this.reg_pc') + ';' +
    'this.reg_pc = (this.reg_pc + 2) & 0xFFFF;';
var $ABSIINDX = 'this._tmp1 = ' + $WORD('this.reg_pc') + ' + this.reg_x;' +
    'this._addr = ' + $WORD('this._tmp1') + ';' +
    'this.reg_pc = (this.reg_pc + 2) & 0xFFFF;';
var $ABSX = 'this._addr = (' +  $WORD('this.reg_pc') + ' + this.reg_x) & 0xFFFF;' +
    'this.reg_pc = (this.reg_pc + 2) & 0xFFFF;';
var $ABSY = 'this._addr = (' +  $WORD('this.reg_pc') + ' + this.reg_y) & 0xFFFF;' +
    'this.reg_pc = (this.reg_pc + 2) & 0xFFFF;';
var $IABS = 'this._tmp1 = ' + $WORD('this.reg_pc') + ';' +
    'this._addr = ' + $WORD('this._tmp1') + ';' +
    'this.reg_pc = (this.reg_pc + 2) & 0xFFFF;';
var $AAC = '';
var $IMM = 'this._addr = this.reg_pc;' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $IMPLIED = '';
var $REL = 'this._tmp1 = ' + $BYTE('this.reg_pc') + ';' +
    'this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $ZPG = 'this._addr = ' + $BYTE('this.reg_pc') + ';' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $INDX = 'this._tmp1 = (' + $BYTE('this.reg_pc') + ' + this.reg_x) & 0xFF;' +
    'this._addr = ' + $WORD('this._tmp1') + ';' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $ZPGX = 'this._addr = (' + $BYTE('this.reg_pc') + ' + this.reg_x) & 0xFF;' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $ZPGY = 'this._addr = (' + $BYTE('this.reg_pc') + ' + this.reg_y) & 0xFF;' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $INDY = 'this._tmp1 = ' + $BYTE('this.reg_pc') + ';' +
    'this._addr = (' + $WORD('this._tmp1') + ' + this.reg_y) & 0xFFFF;' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $IZPG = 'this._tmp1 = ' + $BYTE('this.reg_pc') + ';' +
    'this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1+1] : this.ram[0]) << 8) | this.ram[this._tmp1];' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';

var $ADC = 'this._tmp1 = ' + $READ + ';' +
    'if (this.flag_d) {' +
        'this._tmp2 = ' + $TO_BIN('this.reg_a') + ' + ' + $TO_BIN('this._tmp1') + ' + this.flag_c;' +
        'this.flag_c = (this._tmp2 > 99) ? 1 : 0;' +
        'this._tmp2 %= 100;' +
        'this.reg_a = ' + $TO_BCD('this._tmp2') + ';' +
        $SETNZ('this.reg_a') +
        'this.cycles++' +
    '} else {' +
        'this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;' +
        'this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;' +
        'this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;' +
        'this.reg_a = (this._tmp2 & 0xFF);' +
        $SETNZ('this.reg_a') +
    '}';
var $SBC = 'this._tmp1 = ' + $READ + ';' +
    'if (this.flag_d) {' +
        'this._tmp2 = ' + $TO_BIN('this.reg_a') + ' - ' + $TO_BIN('this._tmp1') + ' - 1 + this.flag_c;' +
        'this.flag_c = (this._tmp2 < 0) ? 0 : 1;' +
        'this._tmp2 %= 100;' +
        'if (this._tmp2 < 0) { this._tmp2 += 100; }' +
        'this.reg_a = ' + $TO_BCD('this._tmp2') + ';' +
        $SETNZ('this.reg_a') +
        'this.cycles++' +
    '} else {' +
        'this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;' +
        'this.flag_c = (this._tmp2 < 0) ? 0 : 1;' +
        'this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;' +
        'this.reg_a = (this._tmp2 & 0xFF);' +
        $SETNZ('this.reg_a') +
    '}';


var $ASL = 'this._tmp1 = ' + $READ + ' << 1;' +
    'this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;' +
    $SETNZ('this._tmp1') +
    $WRITE('(this._tmp1 & 0xFF)');
var $ASLA = 'this._tmp1 = this.reg_a << 1;' +
    'this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;' +
    $SETNZ('this._tmp1') +
    'this.reg_a = (this._tmp1 & 0xFF);';
var $LSR = 'this._tmp1 = ' + $READ + ';' +
    'this.flag_c = this._tmp1 & 0x01;' +
    'this.flag_z = (this._tmp1 ^ 0x01) ? 1 : 0;' +
    'this.flag_n = 0;' +
    'this._tmp1 >>= 1;' +
    $WRITE('this._tmp1');
var $LSRA = 'this.flag_c = (this.reg_a & 0x01);' +
    'this.flag_n = 0;' +
    'this.reg_a >>= 1;' +
    $SETNZ('this.reg_a');
var $ROL = 'this._tmp1 = (' + $READ + ' << 1) | this.flag_c;' +
    'this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;' +
    $SETNZ('this._tmp1') +
    $WRITE('(this._tmp1 & 0xFF)');
var $ROLA = 'this._tmp1 = (this.reg_a << 1) | this.flag_c;' +
    'this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;' +
    'this.reg_a = (this._tmp1 & 0xFF);' +
    $SETNZ('this.reg_a');
var $ROR = 'this._tmp1 = ' + $READ + ';' +
    'this.tmp2 = this.flag_c << 7;' +
    'this.flag_c = (this._tmp1 & 0x01);' +
    'this._tmp2 = (this._tmp1 >> 1) | this.tmp2;' +
    $SETNZ('this._tmp2') +
    $WRITE('this._tmp2');
var $RORA = 'this.tmp1 = this.flag_c << 7;' +
    'this.flag_c = (this.reg_a & 0x01);' +
    'this.reg_a = (this.reg_a >> 1) | this.tmp1;' +
    $SETNZ('this.reg_a');

var $BIT = 'this._tmp1 = ' + $READ + ';' +
    'this.flag_z = !(this.reg_a & this._tmp1) | 0;' +
    'this.flag_n = (this._tmp1 & 0x80) >> 7;' +
    'this.flag_v = (this._tmp1 & 0x40) >> 6;';
var $BITI = 'this.flag_z = !(this.reg_a & ' + $READ + ') | 0;';

var $BBS0 = 'if (  ' + $READ +' & 0x01 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBS1 = 'if (  ' + $READ +' & 0x02 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBS2 = 'if (  ' + $READ +' & 0x04 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBS3 = 'if (  ' + $READ +' & 0x08 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBS4 = 'if (  ' + $READ +' & 0x10 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBS5 = 'if (  ' + $READ +' & 0x20 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBS6 = 'if (  ' + $READ +' & 0x40 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBS7 = 'if (  ' + $READ +' & 0x80 ) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';

var $BBR0 = 'if (!(' + $READ +' & 0x01)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBR1 = 'if (!(' + $READ +' & 0x02)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBR2 = 'if (!(' + $READ +' & 0x04)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBR3 = 'if (!(' + $READ +' & 0x08)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBR4 = 'if (!(' + $READ +' & 0x10)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBR5 = 'if (!(' + $READ +' & 0x20)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBR6 = 'if (!(' + $READ +' & 0x40)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BBR7 = 'if (!(' + $READ +' & 0x80)) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';

var $BCS = 'if ( this.flag_c) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BCC = 'if (!this.flag_c) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BVS = 'if ( this.flag_v) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BVC = 'if (!this.flag_v) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BMI = 'if ( this.flag_n) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BPL = 'if (!this.flag_n) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BEQ = 'if ( this.flag_z) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BNE = 'if (!this.flag_z) { this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF; this.cycles++; }';
var $BRA = 'this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;';

var $SEC = 'this.flag_c = 1;';
var $SED = 'this.flag_d = 1;';
var $SEI = 'this.flag_i = 1;';
var $CLC = 'this.flag_c = 0;';
var $CLD = 'this.flag_d = 0;';
var $CLI = 'this.flag_i = 0;';
var $CLV = 'this.flag_v = 0;';

var $CMP = 'this._tmp1 = this.reg_a - ' + $READ + ';' +
    'this.flag_c = this._tmp1 < 0 ? 0 : 1;' +
    $SETNZ('this._tmp1');
var $CPX = 'this._tmp1 = this.reg_x - ' + $READ + ';' +
    'this.flag_c = this._tmp1 < 0 ? 0 : 1;' +
    $SETNZ('this._tmp1');
var $CPY = 'this._tmp1 = this.reg_y - ' + $READ + ';' +
    'this.flag_c = this._tmp1 < 0 ? 0 : 1;' +
    $SETNZ('this._tmp1');

var $DEA = 'this.reg_a = (--this.reg_a & 0xFF);' + $SETNZ('this.reg_a');
var $DEX = 'this.reg_x = (--this.reg_x & 0xFF);' + $SETNZ('this.reg_x');
var $DEY = 'this.reg_y = (--this.reg_y & 0xFF);' + $SETNZ('this.reg_y');
var $DEC = 'this._tmp1 = (' + $READ + ' - 1) & 0xFF;' +
    $SETNZ('this._tmp1') +
    $WRITE('this._tmp1');

var $INA = 'this.reg_a = (++this.reg_a & 0xFF);' + $SETNZ('this.reg_a');
var $INX = 'this.reg_x = (++this.reg_x & 0xFF);' + $SETNZ('this.reg_x');
var $INY = 'this.reg_y = (++this.reg_y & 0xFF);' + $SETNZ('this.reg_y');
var $INC = 'this._tmp1 = (' + $READ + ' + 1) & 0xFF;' +
    $SETNZ('this._tmp1') +
    $WRITE('this._tmp1');

var $AND = 'this.reg_a &= ' + $READ + ';' + $SETNZ('this.reg_a');
var $EOR = 'this.reg_a ^= ' + $READ + ';' + $SETNZ('this.reg_a');
var $ORA = 'this.reg_a |= ' + $READ + ';' + $SETNZ('this.reg_a');

var $JMP = 'this.reg_pc = this._addr;';
var $JSR = 'this.reg_pc = (this.reg_pc - 1) & 0xFFFF;' +
    $PUSH('(this.reg_pc >> 8)') +
    $PUSH('(this.reg_pc & 0xFF)') +
    'this.reg_pc = this._addr;';

var $LDA = 'this.reg_a = ' + $READ + ';' + $SETNZ('this.reg_a');
var $LDX = 'this.reg_x = ' + $READ + ';' + $SETNZ('this.reg_x');
var $LDY = 'this.reg_y = ' + $READ + ';' + $SETNZ('this.reg_y');

var $NOP = '';

var $PHA = $PUSH('this.reg_a');
var $PHX = $PUSH('this.reg_x');
var $PHY = $PUSH('this.reg_y');
var $PHP = 'this.flag_u = 1;' +
    $PUSH('this.get_reg_ps()');
var $PLA = 'this.reg_a = ' + $POP + ';' + $SETNZ('this.reg_a');
var $PLX = 'this.reg_x = ' + $POP + ';' + $SETNZ('this.reg_x');
var $PLY = 'this.reg_y = ' + $POP + ';' + $SETNZ('this.reg_y');
// no necessary for PLP?
//regs.ps |= AF_BREAK;
var $PLP = 'this.set_reg_ps(' + $POP + ');';

var $RMB0 = 'this._tmp1 = ' + $READ + ' & 0xFE;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $RMB1 = 'this._tmp1 = ' + $READ + ' & 0xFD;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $RMB2 = 'this._tmp1 = ' + $READ + ' & 0xFB;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $RMB3 = 'this._tmp1 = ' + $READ + ' & 0xF7;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $RMB4 = 'this._tmp1 = ' + $READ + ' & 0xEF;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $RMB5 = 'this._tmp1 = ' + $READ + ' & 0xDF;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $RMB6 = 'this._tmp1 = ' + $READ + ' & 0xBF;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $RMB7 = 'this._tmp1 = ' + $READ + ' & 0x7F;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');

var $SMB0 = 'this._tmp1 = ' + $READ + ' | 0x01;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $SMB1 = 'this._tmp1 = ' + $READ + ' | 0x02;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $SMB2 = 'this._tmp1 = ' + $READ + ' | 0x04;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $SMB3 = 'this._tmp1 = ' + $READ + ' | 0x08;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $SMB4 = 'this._tmp1 = ' + $READ + ' | 0x10;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $SMB5 = 'this._tmp1 = ' + $READ + ' | 0x20;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $SMB6 = 'this._tmp1 = ' + $READ + ' | 0x40;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');
var $SMB7 = 'this._tmp1 = ' + $READ + ' | 0x80;' + $SETNZ('this._tmp1') + $WRITE('this._tmp1');

// AF_BREAK is not set on wqxsim
//regs.ps |= AF_BREAK;
// wqx has no CLI there.
var $RTI = $PLP + //$CLI +
    'this.irq = 1;' +
    'this.reg_pc = ' + $POP + ';' +
    'this.reg_pc |= (' + $POP + ' << 8);';
var $RTS = 'this.reg_pc = ' + $POP + ';' +
    'this.reg_pc |= (' + $POP + ' << 8);' +
    'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';

var $STA = $WRITE('this.reg_a');
var $STX = $WRITE('this.reg_x');
var $STY = $WRITE('this.reg_y');
var $STZ = $WRITE('0');

var $TAX = 'this.reg_x = this.reg_a;' + $SETNZ('this.reg_x');
var $TAY = 'this.reg_y = this.reg_a;' + $SETNZ('this.reg_y');
var $TXA = 'this.reg_a = this.reg_x;' + $SETNZ('this.reg_a');
var $TYA = 'this.reg_a = this.reg_y;' + $SETNZ('this.reg_a');
var $TSX = 'this.reg_x = (this.reg_sp & 0xFF);' + $SETNZ('this.reg_x');
var $TXS = 'this.reg_sp = (this.reg_x | 0x100);';


var $TRB = 'this._tmp1 = ' + $READ + ';' +
    'this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;' +
    $WRITE('(this._tmp1 & ~this.reg_a)');
var $TSB = 'this._tmp1 = ' + $READ + ';' +
    'this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;' +
    $WRITE('(this._tmp1 | this.reg_a)');

var $STP = 'this.reg_pc = (this.reg_pc - 1) & 0xFFFF; this.stp = 1;';
var $WAI = 'this.reg_pc = (this.reg_pc - 1) & 0xFFFF; this.wai = 1;';
var $INVALID1 = '';
var $INVALID2 = 'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;';
var $INVALID3 = 'this.reg_pc = (this.reg_pc + 2) & 0xFFFF;';

var $BRK = 'this.reg_pc++;' +
    $PUSH('(this.reg_pc >> 8)') +
    $PUSH('(this.reg_pc & 0xFF)') +
    'this.flag_b = 1;' +
    $PUSH('this.get_reg_ps()') +
    'this.flag_i = 1;' +
    'this.reg_pc = (this.memmap[7][0x1FFF]<<8)|(this.memmap[7][0x1FFE]);';

var $IRQ = '' +
    'if (this.wai) { this.reg_pc = (this.reg_pc + 1) & 0xFFFF; this.wai = 0; }' +
    'if (!this.flag_i) {' +
        $PUSH('(this.reg_pc >> 8)') +
        $PUSH('(this.reg_pc & 0xFF)') +
        'this.flag_b = 0;' +
        $PUSH('this.get_reg_ps()') +
        'this.reg_pc = (this.memmap[7][0x1FFF]<<8)|(this.memmap[7][0x1FFE]);' +
        'this.flag_i = 1;' +
        $CYC(7) +
    '}';
var $NMI = '' +
    'if (this.wai) { this.reg_pc = (this.reg_pc + 1) & 0xFFFF; this.wai = 0; }' +
    $PUSH('(this.reg_pc >> 8)') +
    $PUSH('(this.reg_pc & 0xFF)') +
    'this.flag_i = 1;' +
    $PUSH('this.get_reg_ps()') +
    'this.reg_pc = (this.memmap[7][0x1FFB]<<8)|(this.memmap[7][0x1FFA]);' +
    'this.nmi = 1;' +
    $CYC(7);


var INSTRUCTIONS = [];
INSTRUCTIONS[0x00] = [       $BRK,          $CYC(7)].join('');
INSTRUCTIONS[0x01] = [       $INDX,$ORA,    $CYC(6)].join('');
INSTRUCTIONS[0x02] = [       $INVALID2,     $CYC(2)].join('');
INSTRUCTIONS[0x03] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x04] = [$CMOS, $ZPG,$TSB,     $CYC(5)].join('');
INSTRUCTIONS[0x05] = [       $ZPG,$ORA,     $CYC(3)].join('');
INSTRUCTIONS[0x06] = [       $ZPG,$ASL,     $CYC(5)].join('');
INSTRUCTIONS[0x07] = [$CMOS, $ZPG,$RMB0,    $CYC(5)].join('');
INSTRUCTIONS[0x08] = [       $PHP,          $CYC(3)].join('');
INSTRUCTIONS[0x09] = [       $IMM,$ORA,     $CYC(2)].join('');
INSTRUCTIONS[0x0A] = [       $ASLA,         $CYC(2)].join('');
INSTRUCTIONS[0x0B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x0C] = [$CMOS, $ABS,$TSB,     $CYC(6)].join('');
INSTRUCTIONS[0x0D] = [       $ABS,$ORA,     $CYC(4)].join('');
INSTRUCTIONS[0x0E] = [       $ABS,$ASL,     $CYC(6)].join('');
INSTRUCTIONS[0x0F] = [$CMOS, $ZPG,$BBR0,    $CYC(5)].join('');
INSTRUCTIONS[0x10] = [       $REL,$BPL,     $CYC(2)].join('');
INSTRUCTIONS[0x11] = [       $INDY,$ORA,    $CYC(5)].join('');
INSTRUCTIONS[0x12] = [$CMOS, $IZPG,$ORA,    $CYC(5)].join('');
INSTRUCTIONS[0x13] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x14] = [$CMOS, $ZPG,$TRB,     $CYC(5)].join('');
INSTRUCTIONS[0x15] = [       $ZPGX,$ORA,    $CYC(4)].join('');
INSTRUCTIONS[0x16] = [       $ZPGX,$ASL,    $CYC(6)].join('');
INSTRUCTIONS[0x17] = [$CMOS, $ZPG,$RMB1,    $CYC(5)].join('');
INSTRUCTIONS[0x18] = [       $CLC,          $CYC(2)].join('');
INSTRUCTIONS[0x19] = [       $ABSY,$ORA,    $CYC(4)].join('');
INSTRUCTIONS[0x1A] = [$CMOS, $INA,          $CYC(2)].join('');
INSTRUCTIONS[0x1B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x1C] = [$CMOS, $ABS,$TRB,     $CYC(6)].join('');
INSTRUCTIONS[0x1D] = [       $ABSX,$ORA,    $CYC(4)].join('');
INSTRUCTIONS[0x1E] = [       $ABSX,$ASL,    $CYC(6)].join('');
INSTRUCTIONS[0x1F] = [$CMOS, $ZPG,$BBR1,    $CYC(5)].join('');
INSTRUCTIONS[0x20] = [       $ABS,$JSR,     $CYC(6)].join('');
INSTRUCTIONS[0x21] = [       $INDX,$AND,    $CYC(6)].join('');
INSTRUCTIONS[0x22] = [       $INVALID2,     $CYC(2)].join('');
INSTRUCTIONS[0x23] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x24] = [       $ZPG,$BIT,     $CYC(3)].join('');
INSTRUCTIONS[0x25] = [       $ZPG,$AND,     $CYC(3)].join('');
INSTRUCTIONS[0x26] = [       $ZPG,$ROL,     $CYC(5)].join('');
INSTRUCTIONS[0x27] = [$CMOS, $ZPG,$RMB2,    $CYC(5)].join('');
INSTRUCTIONS[0x28] = [       $PLP,          $CYC(4)].join('');
INSTRUCTIONS[0x29] = [       $IMM,$AND,     $CYC(2)].join('');
INSTRUCTIONS[0x2A] = [       $ROLA,         $CYC(2)].join('');
INSTRUCTIONS[0x2B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x2C] = [       $ABS,$BIT,     $CYC(4)].join('');
INSTRUCTIONS[0x2D] = [       $ABS,$AND,     $CYC(4)].join('');
INSTRUCTIONS[0x2E] = [       $ABS,$ROL,     $CYC(6)].join('');
INSTRUCTIONS[0x2F] = [$CMOS, $ZPG,$BBR2,    $CYC(5)].join('');
INSTRUCTIONS[0x30] = [       $REL,$BMI,     $CYC(2)].join('');
INSTRUCTIONS[0x31] = [       $INDY,$AND,    $CYC(5)].join('');
INSTRUCTIONS[0x32] = [$CMOS, $IZPG,$AND,    $CYC(5)].join('');
INSTRUCTIONS[0x33] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x34] = [$CMOS, $ZPGX,$BIT,    $CYC(4)].join('');
INSTRUCTIONS[0x35] = [       $ZPGX,$AND,    $CYC(4)].join('');
INSTRUCTIONS[0x36] = [       $ZPGX,$ROL,    $CYC(6)].join('');
INSTRUCTIONS[0x37] = [$CMOS, $ZPG,$RMB3,    $CYC(5)].join('');
INSTRUCTIONS[0x38] = [       $SEC,          $CYC(2)].join('');
INSTRUCTIONS[0x39] = [       $ABSY,$AND,    $CYC(4)].join('');
INSTRUCTIONS[0x3A] = [$CMOS, $DEA,          $CYC(2)].join('');
INSTRUCTIONS[0x3B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x3C] = [$CMOS, $ABSX,$BIT,    $CYC(4)].join('');
INSTRUCTIONS[0x3D] = [       $ABSX,$AND,    $CYC(4)].join('');
INSTRUCTIONS[0x3E] = [       $ABSX,$ROL,    $CYC(6)].join('');
INSTRUCTIONS[0x3F] = [$CMOS, $ZPG,$BBR3,    $CYC(5)].join('');
INSTRUCTIONS[0x40] = [       $RTI,          $CYC(6)].join('');
INSTRUCTIONS[0x41] = [       $INDX,$EOR,    $CYC(6)].join('');
INSTRUCTIONS[0x42] = [       $INVALID2,     $CYC(2)].join('');
INSTRUCTIONS[0x43] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x44] = [       $INVALID2,     $CYC(3)].join('');
INSTRUCTIONS[0x45] = [       $ZPG,$EOR,     $CYC(3)].join('');
INSTRUCTIONS[0x46] = [       $ZPG,$LSR,     $CYC(5)].join('');
INSTRUCTIONS[0x47] = [$CMOS, $ZPG,$RMB4,    $CYC(5)].join('');
INSTRUCTIONS[0x48] = [       $PHA,          $CYC(3)].join('');
INSTRUCTIONS[0x49] = [       $IMM,$EOR,     $CYC(2)].join('');
INSTRUCTIONS[0x4A] = [       $LSRA,         $CYC(2)].join('');
INSTRUCTIONS[0x4B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x4C] = [       $ABS,$JMP,     $CYC(3)].join('');
INSTRUCTIONS[0x4D] = [       $ABS,$EOR,     $CYC(4)].join('');
INSTRUCTIONS[0x4E] = [       $ABS,$LSR,     $CYC(6)].join('');
INSTRUCTIONS[0x4F] = [$CMOS, $ZPG,$BBR4,    $CYC(5)].join('');
INSTRUCTIONS[0x50] = [       $REL,$BVC,     $CYC(2)].join('');
INSTRUCTIONS[0x51] = [       $INDY,$EOR,    $CYC(5)].join('');
INSTRUCTIONS[0x52] = [$CMOS, $IZPG,$EOR,    $CYC(5)].join('');
INSTRUCTIONS[0x53] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x54] = [       $INVALID2,     $CYC(4)].join('');
INSTRUCTIONS[0x55] = [       $ZPGX,$EOR,    $CYC(4)].join('');
INSTRUCTIONS[0x56] = [       $ZPGX,$LSR,    $CYC(6)].join('');
INSTRUCTIONS[0x57] = [$CMOS, $ZPG,$RMB5,    $CYC(5)].join('');
INSTRUCTIONS[0x58] = [       $CLI,          $CYC(2)].join('');
INSTRUCTIONS[0x59] = [       $ABSY,$EOR,    $CYC(4)].join('');
INSTRUCTIONS[0x5A] = [$CMOS, $PHY,          $CYC(3)].join('');
INSTRUCTIONS[0x5B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x5C] = [       $INVALID3,     $CYC(8)].join('');
INSTRUCTIONS[0x5D] = [       $ABSX,$EOR,    $CYC(4)].join('');
INSTRUCTIONS[0x5E] = [       $ABSX,$LSR,    $CYC(6)].join('');
INSTRUCTIONS[0x5F] = [$CMOS, $ZPG,$BBR5,    $CYC(5)].join('');
INSTRUCTIONS[0x60] = [       $RTS,          $CYC(6)].join('');
INSTRUCTIONS[0x61] = [       $INDX,$ADC,    $CYC(6)].join('');
INSTRUCTIONS[0x62] = [       $INVALID2,     $CYC(2)].join('');
INSTRUCTIONS[0x63] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x64] = [$CMOS, $ZPG,$STZ,     $CYC(3)].join('');
INSTRUCTIONS[0x65] = [       $ZPG,$ADC,     $CYC(3)].join('');
INSTRUCTIONS[0x66] = [       $ZPG,$ROR,     $CYC(5)].join('');
INSTRUCTIONS[0x67] = [$CMOS, $ZPG,$RMB6,    $CYC(5)].join('');
INSTRUCTIONS[0x68] = [       $PLA,          $CYC(4)].join('');
INSTRUCTIONS[0x69] = [       $IMM,$ADC,     $CYC(2)].join('');
INSTRUCTIONS[0x6A] = [       $RORA,         $CYC(2)].join('');
INSTRUCTIONS[0x6B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x6C] = [       $IABS,$JMP,    $CYC(6)].join('');
INSTRUCTIONS[0x6D] = [       $ABS,$ADC,     $CYC(4)].join('');
INSTRUCTIONS[0x6E] = [       $ABS,$ROR,     $CYC(6)].join('');
INSTRUCTIONS[0x6F] = [$CMOS, $ZPG,$BBR6,    $CYC(5)].join('');
INSTRUCTIONS[0x70] = [       $REL,$BVS,     $CYC(2)].join('');
INSTRUCTIONS[0x71] = [       $INDY,$ADC,    $CYC(5)].join('');
INSTRUCTIONS[0x72] = [$CMOS, $IZPG,$ADC,    $CYC(5)].join('');
INSTRUCTIONS[0x73] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x74] = [$CMOS, $ZPGX,$STZ,    $CYC(4)].join('');
INSTRUCTIONS[0x75] = [       $ZPGX,$ADC,    $CYC(4)].join('');
INSTRUCTIONS[0x76] = [       $ZPGX,$ROR,    $CYC(6)].join('');
INSTRUCTIONS[0x77] = [$CMOS, $ZPG,$RMB7,    $CYC(5)].join('');
INSTRUCTIONS[0x78] = [       $SEI,          $CYC(2)].join('');
INSTRUCTIONS[0x79] = [       $ABSY,$ADC,    $CYC(4)].join('');
INSTRUCTIONS[0x7A] = [$CMOS, $PLY,          $CYC(4)].join('');
INSTRUCTIONS[0x7B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x7C] = [$CMOS, $ABSIINDX,$JMP,$CYC(6)].join('');
INSTRUCTIONS[0x7D] = [       $ABSX,$ADC,    $CYC(4)].join('');
INSTRUCTIONS[0x7E] = [       $ABSX,$ROR,    $CYC(6)].join('');
INSTRUCTIONS[0x7F] = [$CMOS, $ZPG,$BBR7,    $CYC(5)].join('');
INSTRUCTIONS[0x80] = [$CMOS, $REL,$BRA,     $CYC(3)].join('');
INSTRUCTIONS[0x81] = [       $INDX,$STA,    $CYC(6)].join('');
INSTRUCTIONS[0x82] = [       $INVALID2,     $CYC(2)].join('');
INSTRUCTIONS[0x83] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x84] = [       $ZPG,$STY,     $CYC(3)].join('');
INSTRUCTIONS[0x85] = [       $ZPG,$STA,     $CYC(3)].join('');
INSTRUCTIONS[0x86] = [       $ZPG,$STX,     $CYC(3)].join('');
INSTRUCTIONS[0x87] = [$CMOS, $ZPG,$SMB0,    $CYC(5)].join('');
INSTRUCTIONS[0x88] = [       $DEY,          $CYC(2)].join('');
INSTRUCTIONS[0x89] = [$CMOS, $IMM,$BITI,    $CYC(2)].join('');
INSTRUCTIONS[0x8A] = [       $TXA,          $CYC(2)].join('');
INSTRUCTIONS[0x8B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x8C] = [       $ABS,$STY,     $CYC(4)].join('');
INSTRUCTIONS[0x8D] = [       $ABS,$STA,     $CYC(4)].join('');
INSTRUCTIONS[0x8E] = [       $ABS,$STX,     $CYC(4)].join('');
INSTRUCTIONS[0x8F] = [$CMOS, $ZPG,$BBS0,    $CYC(5)].join('');
INSTRUCTIONS[0x90] = [       $REL,$BCC,     $CYC(2)].join('');
INSTRUCTIONS[0x91] = [       $INDY,$STA,    $CYC(6)].join('');
INSTRUCTIONS[0x92] = [$CMOS, $IZPG,$STA,    $CYC(5)].join('');
INSTRUCTIONS[0x93] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x94] = [       $ZPGX,$STY,    $CYC(4)].join('');
INSTRUCTIONS[0x95] = [       $ZPGX,$STA,    $CYC(4)].join('');
INSTRUCTIONS[0x96] = [       $ZPGY,$STX,    $CYC(4)].join('');
INSTRUCTIONS[0x97] = [$CMOS, $ZPG,$SMB1,    $CYC(5)].join('');
INSTRUCTIONS[0x98] = [       $TYA,          $CYC(2)].join('');
INSTRUCTIONS[0x99] = [       $ABSY,$STA,    $CYC(5)].join('');
INSTRUCTIONS[0x9A] = [       $TXS,          $CYC(2)].join('');
INSTRUCTIONS[0x9B] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0x9C] = [$CMOS, $ABS,$STZ,     $CYC(4)].join('');
INSTRUCTIONS[0x9D] = [       $ABSX,$STA,    $CYC(5)].join('');
INSTRUCTIONS[0x9E] = [$CMOS, $ABSX,$STZ,    $CYC(5)].join('');
INSTRUCTIONS[0x9F] = [$CMOS, $ZPG,$BBS1,    $CYC(5)].join('');
INSTRUCTIONS[0xA0] = [       $IMM,$LDY,     $CYC(2)].join('');
INSTRUCTIONS[0xA1] = [       $INDX,$LDA,    $CYC(6)].join('');
INSTRUCTIONS[0xA2] = [       $IMM,$LDX,     $CYC(2)].join('');
INSTRUCTIONS[0xA3] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xA4] = [       $ZPG,$LDY,     $CYC(3)].join('');
INSTRUCTIONS[0xA5] = [       $ZPG,$LDA,     $CYC(3)].join('');
INSTRUCTIONS[0xA6] = [       $ZPG,$LDX,     $CYC(3)].join('');
INSTRUCTIONS[0xA7] = [$CMOS, $ZPG,$SMB2,    $CYC(5)].join('');
INSTRUCTIONS[0xA8] = [       $TAY,          $CYC(2)].join('');
INSTRUCTIONS[0xA9] = [       $IMM,$LDA,     $CYC(2)].join('');
INSTRUCTIONS[0xAA] = [       $TAX,          $CYC(2)].join('');
INSTRUCTIONS[0xAB] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xAC] = [       $ABS,$LDY,     $CYC(4)].join('');
INSTRUCTIONS[0xAD] = [       $ABS,$LDA,     $CYC(4)].join('');
INSTRUCTIONS[0xAE] = [       $ABS,$LDX,     $CYC(4)].join('');
INSTRUCTIONS[0xAF] = [$CMOS, $ZPG,$BBS2,    $CYC(5)].join('');
INSTRUCTIONS[0xB0] = [       $REL,$BCS,     $CYC(2)].join('');
INSTRUCTIONS[0xB1] = [       $INDY,$LDA,    $CYC(5)].join('');
INSTRUCTIONS[0xB2] = [$CMOS, $IZPG,$LDA,    $CYC(5)].join('');
INSTRUCTIONS[0xB3] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xB4] = [       $ZPGX,$LDY,    $CYC(4)].join('');
INSTRUCTIONS[0xB5] = [       $ZPGX,$LDA,    $CYC(4)].join('');
INSTRUCTIONS[0xB6] = [       $ZPGY,$LDX,    $CYC(4)].join('');
INSTRUCTIONS[0xB7] = [$CMOS, $ZPG,$SMB3,    $CYC(5)].join('');
INSTRUCTIONS[0xB8] = [       $CLV,          $CYC(2)].join('');
INSTRUCTIONS[0xB9] = [       $ABSY,$LDA,    $CYC(4)].join('');
INSTRUCTIONS[0xBA] = [       $TSX,          $CYC(2)].join('');
INSTRUCTIONS[0xBB] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xBC] = [       $ABSX,$LDY,    $CYC(4)].join('');
INSTRUCTIONS[0xBD] = [       $ABSX,$LDA,    $CYC(4)].join('');
INSTRUCTIONS[0xBE] = [       $ABSY,$LDX,    $CYC(4)].join('');
INSTRUCTIONS[0xBF] = [$CMOS, $ZPG,$BBS3,    $CYC(5)].join('');
INSTRUCTIONS[0xC0] = [       $IMM,$CPY,     $CYC(2)].join('');
INSTRUCTIONS[0xC1] = [       $INDX,$CMP,    $CYC(6)].join('');
INSTRUCTIONS[0xC2] = [       $INVALID2,     $CYC(2)].join('');
INSTRUCTIONS[0xC3] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xC4] = [       $ZPG,$CPY,     $CYC(3)].join('');
INSTRUCTIONS[0xC5] = [       $ZPG,$CMP,     $CYC(3)].join('');
INSTRUCTIONS[0xC6] = [       $ZPG,$DEC,     $CYC(5)].join('');
INSTRUCTIONS[0xC7] = [$CMOS, $ZPG,$SMB4,    $CYC(5)].join('');
INSTRUCTIONS[0xC8] = [       $INY,          $CYC(2)].join('');
INSTRUCTIONS[0xC9] = [       $IMM,$CMP,     $CYC(2)].join('');
INSTRUCTIONS[0xCA] = [       $DEX,          $CYC(2)].join('');
INSTRUCTIONS[0xCB] = [$CMOS, $WAI,          $CYC(3)].join('');
INSTRUCTIONS[0xCC] = [       $ABS,$CPY,     $CYC(4)].join('');
INSTRUCTIONS[0xCD] = [       $ABS,$CMP,     $CYC(4)].join('');
INSTRUCTIONS[0xCE] = [       $ABS,$DEC,     $CYC(6)].join('');
INSTRUCTIONS[0xCF] = [$CMOS, $ZPG,$BBS4,    $CYC(5)].join('');
INSTRUCTIONS[0xD0] = [       $REL,$BNE,     $CYC(2)].join('');
INSTRUCTIONS[0xD1] = [       $INDY,$CMP,    $CYC(5)].join('');
INSTRUCTIONS[0xD2] = [$CMOS, $IZPG,$CMP,    $CYC(5)].join('');
INSTRUCTIONS[0xD3] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xD4] = [       $INVALID2,     $CYC(4)].join('');
INSTRUCTIONS[0xD5] = [       $ZPGX,$CMP,    $CYC(4)].join('');
INSTRUCTIONS[0xD6] = [       $ZPGX,$DEC,    $CYC(6)].join('');
INSTRUCTIONS[0xD7] = [$CMOS, $ZPG,$SMB5,    $CYC(5)].join('');
INSTRUCTIONS[0xD8] = [       $CLD,          $CYC(2)].join('');
INSTRUCTIONS[0xD9] = [       $ABSY,$CMP,    $CYC(4)].join('');
INSTRUCTIONS[0xDA] = [$CMOS, $PHX,          $CYC(3)].join('');
INSTRUCTIONS[0xDB] = [$CMOS, $STP,          $CYC(3)].join('');
INSTRUCTIONS[0xDC] = [       $INVALID3,     $CYC(4)].join('');
INSTRUCTIONS[0xDD] = [       $ABSX,$CMP,    $CYC(4)].join('');
INSTRUCTIONS[0xDE] = [       $ABSX,$DEC,    $CYC(6)].join('');
INSTRUCTIONS[0xDF] = [$CMOS, $ZPG,$BBS5,    $CYC(5)].join('');
INSTRUCTIONS[0xE0] = [       $IMM,$CPX,     $CYC(2)].join('');
INSTRUCTIONS[0xE1] = [       $INDX,$SBC,    $CYC(6)].join('');
INSTRUCTIONS[0xE2] = [       $INVALID2,     $CYC(2)].join('');
INSTRUCTIONS[0xE3] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xE4] = [       $ZPG,$CPX,     $CYC(3)].join('');
INSTRUCTIONS[0xE5] = [       $ZPG,$SBC,     $CYC(3)].join('');
INSTRUCTIONS[0xE6] = [       $ZPG,$INC,     $CYC(5)].join('');
INSTRUCTIONS[0xE7] = [$CMOS, $ZPG,$SMB6,    $CYC(5)].join('');
INSTRUCTIONS[0xE8] = [       $INX,          $CYC(2)].join('');
INSTRUCTIONS[0xE9] = [       $IMM,$SBC,     $CYC(2)].join('');
INSTRUCTIONS[0xEA] = [       $NOP,          $CYC(2)].join('');
INSTRUCTIONS[0xEB] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xEC] = [       $ABS,$CPX,     $CYC(4)].join('');
INSTRUCTIONS[0xED] = [       $ABS,$SBC,     $CYC(4)].join('');
INSTRUCTIONS[0xEE] = [       $ABS,$INC,     $CYC(6)].join('');
INSTRUCTIONS[0xEF] = [$CMOS, $ZPG,$BBS6,    $CYC(5)].join('');
INSTRUCTIONS[0xF0] = [       $REL,$BEQ,     $CYC(2)].join('');
INSTRUCTIONS[0xF1] = [       $INDY,$SBC,    $CYC(5)].join('');
INSTRUCTIONS[0xF2] = [$CMOS, $IZPG,$SBC,    $CYC(5)].join('');
INSTRUCTIONS[0xF3] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xF4] = [       $INVALID2,     $CYC(4)].join('');
INSTRUCTIONS[0xF5] = [       $ZPGX,$SBC,    $CYC(4)].join('');
INSTRUCTIONS[0xF6] = [       $ZPGX,$INC,    $CYC(6)].join('');
INSTRUCTIONS[0xF7] = [$CMOS, $ZPG,$SMB7,    $CYC(5)].join('');
INSTRUCTIONS[0xF8] = [       $SED,          $CYC(2)].join('');
INSTRUCTIONS[0xF9] = [       $ABSY,$SBC,    $CYC(4)].join('');
INSTRUCTIONS[0xFA] = [$CMOS, $PLX,          $CYC(4)].join('');
INSTRUCTIONS[0xFB] = [       $INVALID1,     $CYC(1)].join('');
INSTRUCTIONS[0xFC] = [       $INVALID3,     $CYC(4)].join('');
INSTRUCTIONS[0xFD] = [       $ABSX,$SBC,    $CYC(4)].join('');
INSTRUCTIONS[0xFE] = [       $ABSX,$INC,    $CYC(6)].join('');
INSTRUCTIONS[0xFF] = [$CMOS, $ZPG,$BBS7,    $CYC(5)].join('');
function $INSTRUCTION(code){
    return INSTRUCTIONS[code] || '';
}
function $HEX(num, len){
    var str = num.toString(16).toUpperCase();
    return '0x' + new Array(len - str.length + 1).join('0') + str;
}
function $BINARY_IF_INSTRUCTIONS(left, right){
    if (left === right - 1) {
        return $INSTRUCTION(left);
    }
    var middle = Math.ceil((left + right) / 2);
    return '' +
        'if (this._code <' + $HEX(middle, 2) + ') {' +
            $BINARY_IF_INSTRUCTIONS(left, middle) +
        '} else {' +
            $BINARY_IF_INSTRUCTIONS(middle, right) +
        '}';
}
function $SWITCH_INSTRUCTIONS(){
    var temp = INSTRUCTIONS.map(function (code, index){
        return 'case 0x' + index.toString(16) + ': ' + code + 'break;';
    });
    return '' +
        'switch (this._code) {' +
            temp.join('\n') +
        '}';
}

function $LOOKUP_TABLE_INSTRUCTIONS(){
    var temp = INSTRUCTIONS.map(function (code, op){
        return 'function op' + $HEX(op, 2).slice(2) + '(this_){' + code + '}'
    }).join(',');
    temp = temp.replace(/this\./g, 'this_.');
    return '' +
        'M65C02Context.prototype.op_func_tbl = [' + temp + '];';
}

function $M65C02(){
    return '' +
        'function M65C02Context(){' +
            'this.ram = null;' +
            'this.memmap = null;' +
            'this.io_read_map = null;' +
            'this.io_write_map = null;' +
            'this.io_read = null;' +
            'this.io_write = null;' +
            'this.cycles = 0;' +
            'this.reg_a = 0;' +
            'this.reg_x = 0;' +
            'this.reg_y = 0;' +
            'this.reg_pc = 0;' +
            'this.reg_sp = 0x100;' +
            '\n//this.reg_ps = 0;\n' +
            'this.flag_c = 0;' +
            'this.flag_z = 0;' +
            'this.flag_i = 0;' +
            'this.flag_d = 0;' +
            'this.flag_b = 0;' +
            'this.flag_u = 0;' +
            'this.flag_v = 0;' +
            'this.flag_n = 0;' +
            'this.irq = 0;' +
            'this.nmi = 0;' +
            'this.wai = 0;' +
            'this.stp = 0;' +
            'this._code = 0;' +
            'this._addr = 0;' +
            'this._tmp1 = 0;' +
            'this._tmp2 = 0;' +
            'this._counters = new Uint32Array(0x100);' +
        '}' +
        'M65C02Context.prototype.get_reg_ps = function (){' +
            'return (' +
            '(this.flag_c) | ' +
            '(this.flag_z << 1) |' +
            '(this.flag_i << 2) |' +
            '(this.flag_d << 3) |' +
            '(this.flag_b << 4) |' +
            '(this.flag_u << 5) |' +
            '(this.flag_v << 6) |' +
            '(this.flag_n << 7)' +
            ');' +
        '};' +
        'M65C02Context.prototype.set_reg_ps = function (ps){' +
            'this.flag_c = (ps & 0x01);' +
            'this.flag_z = (ps & 0x02) >> 1;' +
            'this.flag_i = (ps & 0x04) >> 2;' +
            'this.flag_d = (ps & 0x08) >> 3;' +
            'this.flag_b = (ps & 0x10) >> 4;' +
            'this.flag_u = (ps & 0x20) >> 5;' +
            'this.flag_v = (ps & 0x40) >> 6;' +
            'this.flag_n = (ps & 0x80) >> 7;' +
            'return ps;' +
        '};' +
        $LOOKUP_TABLE_INSTRUCTIONS() +
        'M65C02Context.prototype.execute = function (){' +
            'this._code = ' + $BYTE('this.reg_pc') + ';' +
            'this.reg_pc = (this.reg_pc + 1) & 0xFFFF;' +
            'this.op_func_tbl[this._code](this);' +
        '};' +
        'M65C02Context.prototype.doIrq = function (){' +
            'if (!this.stp) {' +
                'if (!this.nmi) { ' + $NMI + ' }' +
                'if (!this.irq) { ' + $IRQ + ' }' +
            '}' +
        '};';
}

function main(){
    var code = $M65C02();
    code = js_beautify.js_beautify(code);
    fs.writeFileSync(__dirname + '/../src/m65c02.js', code, 'utf-8');
}
main();