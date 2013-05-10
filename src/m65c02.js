function M65C02Context() {
    this.ram = null;
    this.memmap = null;
    this.io_read_map = null;
    this.io_write_map = null;
    this.io_read = null;
    this.io_write = null;
    this.cycles = 0;
    this.reg_a = 0;
    this.reg_x = 0;
    this.reg_y = 0;
    this.reg_pc = 0;
    this.reg_sp = 0x100;
    //this.reg_ps = 0;
    this.flag_c = 0;
    this.flag_z = 0;
    this.flag_i = 0;
    this.flag_d = 0;
    this.flag_b = 0;
    this.flag_u = 0;
    this.flag_v = 0;
    this.flag_n = 0;
    this.irq = 0;
    this.nmi = 0;
    this.wai = 0;
    this.stp = 0;
    this._code = 0;
    this._addr = 0;
    this._tmp1 = 0;
    this._tmp2 = 0;
}
M65C02Context.prototype.get_reg_ps = function() {
    return ((this.flag_c) | (this.flag_z << 1) | (this.flag_i << 2) | (this.flag_d << 3) | (this.flag_b << 4) | (this.flag_u << 5) | (this.flag_v << 6) | (this.flag_n << 7));
};
M65C02Context.prototype.set_reg_ps = function(ps) {
    this.flag_c = (ps & 0x01);
    this.flag_z = (ps & 0x02) >> 1;
    this.flag_i = (ps & 0x04) >> 2;
    this.flag_d = (ps & 0x08) >> 3;
    this.flag_b = (ps & 0x10) >> 4;
    this.flag_u = (ps & 0x20) >> 5;
    this.flag_v = (ps & 0x40) >> 6;
    this.flag_n = (ps & 0x80) >> 7;
    return ps;
};
M65C02Context.prototype.execute = function() {
    this._code = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
    switch (this._code) {
        case 0x0:
            this.reg_pc++;
            this.ram[this.reg_sp] = (this.reg_pc >> 8);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.ram[this.reg_sp] = (this.reg_pc & 0xFF);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.flag_b = 1;
            this.ram[this.reg_sp] = this.get_reg_ps();
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.flag_i = 1;
            this.reg_pc = (this.memmap[7][0x1FFF] << 8) | (this.memmap[7][0x1FFE]);
            this.cycles += 7;
            break;
        case 0x1:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 6;
            break;
        case 0x2:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 2;
            break;
        case 0x3:
            this.cycles += 1;
            break;
        case 0x4:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 | this.reg_a));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 | this.reg_a);
            }
            this.cycles += 5;
            break;
        case 0x5:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0x6:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 5;
            break;
        case 0x7:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0xFE;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x8:
            this.flag_u = 1;
            this.ram[this.reg_sp] = this.get_reg_ps();
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.cycles += 3;
            break;
        case 0x9:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xa:
            this._tmp1 = this.reg_a << 1;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.reg_a = (this._tmp1 & 0xFF);
            this.cycles += 2;
            break;
        case 0xb:
            this.cycles += 1;
            break;
        case 0xc:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 | this.reg_a));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 | this.reg_a);
            }
            this.cycles += 6;
            break;
        case 0xd:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xe:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 6;
            break;
        case 0xf:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x01)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x10:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!this.flag_n) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0x11:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0x12:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0x13:
            this.cycles += 1;
            break;
        case 0x14:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & ~this.reg_a));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & ~this.reg_a);
            }
            this.cycles += 5;
            break;
        case 0x15:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x16:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 6;
            break;
        case 0x17:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0xFD;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x18:
            this.flag_c = 0;
            this.cycles += 2;
            break;
        case 0x19:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x1a:
            this.reg_a = (++this.reg_a & 0xFF);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x1b:
            this.cycles += 1;
            break;
        case 0x1c:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & ~this.reg_a));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & ~this.reg_a);
            }
            this.cycles += 6;
            break;
        case 0x1d:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x1e:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 6;
            break;
        case 0x1f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x02)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x20:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_pc = (this.reg_pc - 1) & 0xFFFF;
            this.ram[this.reg_sp] = (this.reg_pc >> 8);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.ram[this.reg_sp] = (this.reg_pc & 0xFF);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.reg_pc = this._addr;
            this.cycles += 6;
            break;
        case 0x21:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 6;
            break;
        case 0x22:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 2;
            break;
        case 0x23:
            this.cycles += 1;
            break;
        case 0x24:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_v = (this._tmp1 & 0x40) >> 6;
            this.cycles += 3;
            break;
        case 0x25:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0x26:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1) | this.flag_c;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 5;
            break;
        case 0x27:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0xFB;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x28:
            this.set_reg_ps(this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100]);
            this.cycles += 4;
            break;
        case 0x29:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x2a:
            this._tmp1 = (this.reg_a << 1) | this.flag_c;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.reg_a = (this._tmp1 & 0xFF);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x2b:
            this.cycles += 1;
            break;
        case 0x2c:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_v = (this._tmp1 & 0x40) >> 6;
            this.cycles += 4;
            break;
        case 0x2d:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x2e:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1) | this.flag_c;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 6;
            break;
        case 0x2f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x04)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x30:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.flag_n) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0x31:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0x32:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0x33:
            this.cycles += 1;
            break;
        case 0x34:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_v = (this._tmp1 & 0x40) >> 6;
            this.cycles += 4;
            break;
        case 0x35:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x36:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1) | this.flag_c;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 6;
            break;
        case 0x37:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0xF7;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x38:
            this.flag_c = 1;
            this.cycles += 2;
            break;
        case 0x39:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x3a:
            this.reg_a = (--this.reg_a & 0xFF);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x3b:
            this.cycles += 1;
            break;
        case 0x3c:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_v = (this._tmp1 & 0x40) >> 6;
            this.cycles += 4;
            break;
        case 0x3d:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x3e:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) << 1) | this.flag_c;
            this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, (this._tmp1 & 0xFF));
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = (this._tmp1 & 0xFF);
            }
            this.cycles += 6;
            break;
        case 0x3f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x08)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x40:
            this.set_reg_ps(this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100]);
            this.irq = 1;
            this.reg_pc = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
            this.reg_pc |= (this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100] << 8);
            this.cycles += 6;
            break;
        case 0x41:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 6;
            break;
        case 0x42:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 2;
            break;
        case 0x43:
            this.cycles += 1;
            break;
        case 0x44:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 3;
            break;
        case 0x45:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0x46:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 & 0x01;
            this.flag_z = (this._tmp1 ^ 0x01) ? 1 : 0;
            this.flag_n = 0;
            this._tmp1 >>= 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x47:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0xEF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x48:
            this.ram[this.reg_sp] = this.reg_a;
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.cycles += 3;
            break;
        case 0x49:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x4a:
            this.flag_c = (this.reg_a & 0x01);
            this.flag_n = 0;
            this.reg_a >>= 1;
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x4b:
            this.cycles += 1;
            break;
        case 0x4c:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_pc = this._addr;
            this.cycles += 3;
            break;
        case 0x4d:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x4e:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 & 0x01;
            this.flag_z = (this._tmp1 ^ 0x01) ? 1 : 0;
            this.flag_n = 0;
            this._tmp1 >>= 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0x4f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x10)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x50:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!this.flag_v) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0x51:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0x52:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0x53:
            this.cycles += 1;
            break;
        case 0x54:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 4;
            break;
        case 0x55:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x56:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 & 0x01;
            this.flag_z = (this._tmp1 ^ 0x01) ? 1 : 0;
            this.flag_n = 0;
            this._tmp1 >>= 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0x57:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0xDF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x58:
            this.flag_i = 0;
            this.cycles += 2;
            break;
        case 0x59:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x5a:
            this.ram[this.reg_sp] = this.reg_y;
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.cycles += 3;
            break;
        case 0x5b:
            this.cycles += 1;
            break;
        case 0x5c:
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.cycles += 8;
            break;
        case 0x5d:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x5e:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 & 0x01;
            this.flag_z = (this._tmp1 ^ 0x01) ? 1 : 0;
            this.flag_n = 0;
            this._tmp1 >>= 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0x5f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x20)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x60:
            this.reg_pc = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
            this.reg_pc |= (this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100] << 8);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 6;
            break;
        case 0x61:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 6;
            break;
        case 0x62:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 2;
            break;
        case 0x63:
            this.cycles += 1;
            break;
        case 0x64:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, 0);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
            }
            this.cycles += 3;
            break;
        case 0x65:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 3;
            break;
        case 0x66:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.tmp2 = this.flag_c << 7;
            this.flag_c = (this._tmp1 & 0x01);
            this._tmp2 = (this._tmp1 >> 1) | this.tmp2;
            this.flag_n = (this._tmp2 & 0x80) >> 7;
            this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp2);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
            }
            this.cycles += 5;
            break;
        case 0x67:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0xBF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x68:
            this.reg_a = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x69:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 2;
            break;
        case 0x6a:
            this.tmp1 = this.flag_c << 7;
            this.flag_c = (this.reg_a & 0x01);
            this.reg_a = (this.reg_a >> 1) | this.tmp1;
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x6b:
            this.cycles += 1;
            break;
        case 0x6c:
            this._tmp1 = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_pc = this._addr;
            this.cycles += 6;
            break;
        case 0x6d:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0x6e:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.tmp2 = this.flag_c << 7;
            this.flag_c = (this._tmp1 & 0x01);
            this._tmp2 = (this._tmp1 >> 1) | this.tmp2;
            this.flag_n = (this._tmp2 & 0x80) >> 7;
            this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp2);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
            }
            this.cycles += 6;
            break;
        case 0x6f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x40)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x70:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.flag_v) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0x71:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 5;
            break;
        case 0x72:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 5;
            break;
        case 0x73:
            this.cycles += 1;
            break;
        case 0x74:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, 0);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
            }
            this.cycles += 4;
            break;
        case 0x75:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0x76:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.tmp2 = this.flag_c << 7;
            this.flag_c = (this._tmp1 & 0x01);
            this._tmp2 = (this._tmp1 >> 1) | this.tmp2;
            this.flag_n = (this._tmp2 & 0x80) >> 7;
            this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp2);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
            }
            this.cycles += 6;
            break;
        case 0x77:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x7F;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x78:
            this.flag_i = 1;
            this.cycles += 2;
            break;
        case 0x79:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0x7a:
            this.reg_y = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0x7b:
            this.cycles += 1;
            break;
        case 0x7c:
            this._tmp1 = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_pc = this._addr;
            this.cycles += 6;
            break;
        case 0x7d:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) + ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) + this.flag_c;
                this.flag_c = (this._tmp2 > 99) ? 1 : 0;
                this._tmp2 %= 100;
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0x7e:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.tmp2 = this.flag_c << 7;
            this.flag_c = (this._tmp1 & 0x01);
            this._tmp2 = (this._tmp1 >> 1) | this.tmp2;
            this.flag_n = (this._tmp2 & 0x80) >> 7;
            this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp2);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
            }
            this.cycles += 6;
            break;
        case 0x7f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x80)) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x80:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
            this.cycles += 3;
            break;
        case 0x81:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 6;
            break;
        case 0x82:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 2;
            break;
        case 0x83:
            this.cycles += 1;
            break;
        case 0x84:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_y);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_y;
            }
            this.cycles += 3;
            break;
        case 0x85:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 3;
            break;
        case 0x86:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_x);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_x;
            }
            this.cycles += 3;
            break;
        case 0x87:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x01;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x88:
            this.reg_y = (--this.reg_y & 0xFF);
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x89:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.flag_z = (this.reg_a & (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF])) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x8a:
            this.reg_a = this.reg_x;
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x8b:
            this.cycles += 1;
            break;
        case 0x8c:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_y);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_y;
            }
            this.cycles += 4;
            break;
        case 0x8d:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 4;
            break;
        case 0x8e:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_x);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_x;
            }
            this.cycles += 4;
            break;
        case 0x8f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x01) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0x90:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!this.flag_c) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0x91:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 6;
            break;
        case 0x92:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 5;
            break;
        case 0x93:
            this.cycles += 1;
            break;
        case 0x94:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_y);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_y;
            }
            this.cycles += 4;
            break;
        case 0x95:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 4;
            break;
        case 0x96:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_y) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_x);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_x;
            }
            this.cycles += 4;
            break;
        case 0x97:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x02;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0x98:
            this.reg_a = this.reg_y;
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0x99:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 5;
            break;
        case 0x9a:
            this.reg_sp = (this.reg_x | 0x100);
            this.cycles += 2;
            break;
        case 0x9b:
            this.cycles += 1;
            break;
        case 0x9c:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, 0);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
            }
            this.cycles += 4;
            break;
        case 0x9d:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this.reg_a);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
            }
            this.cycles += 5;
            break;
        case 0x9e:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, 0);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
            }
            this.cycles += 5;
            break;
        case 0x9f:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x02) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0xa0:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xa1:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 6;
            break;
        case 0xa2:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xa3:
            this.cycles += 1;
            break;
        case 0xa4:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0xa5:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0xa6:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0xa7:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x04;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xa8:
            this.reg_y = this.reg_a;
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xa9:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xaa:
            this.reg_x = this.reg_a;
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xab:
            this.cycles += 1;
            break;
        case 0xac:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xad:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xae:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xaf:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x04) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0xb0:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.flag_c) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0xb1:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0xb2:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0xb3:
            this.cycles += 1;
            break;
        case 0xb4:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xb5:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xb6:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_y) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xb7:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x08;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xb8:
            this.flag_v = 0;
            this.cycles += 2;
            break;
        case 0xb9:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xba:
            this.reg_x = (this.reg_sp & 0xFF);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xbb:
            this.cycles += 1;
            break;
        case 0xbc:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xbd:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_a & 0x80) >> 7;
            this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xbe:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xbf:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x08) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0xc0:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_y - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xc1:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 6;
            break;
        case 0xc2:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 2;
            break;
        case 0xc3:
            this.cycles += 1;
            break;
        case 0xc4:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_y - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0xc5:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0xc6:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) - 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xc7:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x10;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xc8:
            this.reg_y = (++this.reg_y & 0xFF);
            this.flag_n = (this.reg_y & 0x80) >> 7;
            this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xc9:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xca:
            this.reg_x = (--this.reg_x & 0xFF);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xcb:
            this.reg_pc = (this.reg_pc - 1) & 0xFFFF;
            this.wai = 1;
            this.cycles += 3;
            break;
        case 0xcc:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = this.reg_y - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xcd:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xce:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) - 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0xcf:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x10) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0xd0:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (!this.flag_z) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0xd1:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0xd2:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 5;
            break;
        case 0xd3:
            this.cycles += 1;
            break;
        case 0xd4:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 4;
            break;
        case 0xd5:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xd6:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) - 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0xd7:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x20;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xd8:
            this.flag_d = 0;
            this.cycles += 2;
            break;
        case 0xd9:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xda:
            this.ram[this.reg_sp] = this.reg_x;
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.cycles += 3;
            break;
        case 0xdb:
            this.reg_pc = (this.reg_pc - 1) & 0xFFFF;
            this.stp = 1;
            this.cycles += 3;
            break;
        case 0xdc:
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.cycles += 4;
            break;
        case 0xdd:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xde:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) - 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0xdf:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x20) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0xe0:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_x - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xe1:
            this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 6;
            break;
        case 0xe2:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 2;
            break;
        case 0xe3:
            this.cycles += 1;
            break;
        case 0xe4:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = this.reg_x - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 3;
            break;
        case 0xe5:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 3;
            break;
        case 0xe6:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) + 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xe7:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x40;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xe8:
            this.reg_x = (++this.reg_x & 0xFF);
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 2;
            break;
        case 0xe9:
            this._addr = this.reg_pc;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 2;
            break;
        case 0xea:
            this.cycles += 2;
            break;
        case 0xeb:
            this.cycles += 1;
            break;
        case 0xec:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = this.reg_x - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            this.flag_c = this._tmp1 < 0 ? 0 : 1;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xed:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0xee:
            this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) + 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0xef:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x40) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
        case 0xf0:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if (this.flag_z) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 2;
            break;
        case 0xf1:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 5;
            break;
        case 0xf2:
            this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 5;
            break;
        case 0xf3:
            this.cycles += 1;
            break;
        case 0xf4:
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this.cycles += 4;
            break;
        case 0xf5:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0xf6:
            this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) + 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0xf7:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) | 0x80;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 5;
            break;
        case 0xf8:
            this.flag_d = 1;
            this.cycles += 2;
            break;
        case 0xf9:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0xfa:
            this.reg_x = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
            this.flag_n = (this.reg_x & 0x80) >> 7;
            this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
            this.cycles += 4;
            break;
        case 0xfb:
            this.cycles += 1;
            break;
        case 0xfc:
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this.cycles += 4;
            break;
        case 0xfd:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
            if (this.flag_d) {
                this._tmp2 = ((this.reg_a >> 4) * 10 + (this.reg_a & 0x0F)) - ((this._tmp1 >> 4) * 10 + (this._tmp1 & 0x0F)) - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this._tmp2 %= 100;
                if (this._tmp2 < 0) {
                    this._tmp2 += 100;
                }
                this.reg_a = ((((this._tmp2 / 10) % 10) << 4) | (this._tmp2 % 10));
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                this.cycles++
            } else {
                this._tmp2 = this.reg_a - this._tmp1 - 1 + this.flag_c;
                this.flag_c = (this._tmp2 < 0) ? 0 : 1;
                this.flag_v = ((this.reg_a ^ this._tmp1) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                this.reg_a = (this._tmp2 & 0xFF);
                this.flag_n = (this.reg_a & 0x80) >> 7;
                this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
            }
            this.cycles += 4;
            break;
        case 0xfe:
            this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
            this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
            this._tmp1 = ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) + 1) & 0xFF;
            this.flag_n = (this._tmp1 & 0x80) >> 7;
            this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
            if (this.io_write_map[this._addr]) {
                this.io_write(this._addr, this._tmp1);
            } else {
                this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
            }
            this.cycles += 6;
            break;
        case 0xff:
            this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
            this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
            if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x80) {
                this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                this.cycles++;
            }
            this.cycles += 5;
            break;
    }
    if (!this.stp) {
        if (!this.nmi) {
            if (this.wai) {
                this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                this.wai = 0;
            }
            this.ram[this.reg_sp] = (this.reg_pc >> 8);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.ram[this.reg_sp] = (this.reg_pc & 0xFF);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.flag_i = 1;
            this.ram[this.reg_sp] = this.get_reg_ps();
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.reg_pc = (this.memmap[7][0x1FFB] << 8) | (this.memmap[7][0x1FFA]);
            this.nmi = 1;
            this.cycles += 7;
        }
        if (!this.irq) {
            if (this.wai) {
                this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                this.wai = 0;
            }
            if (!this.flag_i) {
                this.ram[this.reg_sp] = (this.reg_pc >> 8);
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.ram[this.reg_sp] = (this.reg_pc & 0xFF);
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.flag_b = 0;
                this.ram[this.reg_sp] = this.get_reg_ps();
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.reg_pc = (this.memmap[7][0x1FFF] << 8) | (this.memmap[7][0x1FFE]);
                this.flag_i = 1;
                this.cycles += 7;
            }
        }
    }
};
M65C02Context.prototype.doIrq = function() {
    if (!this.stp) {
        if (!this.nmi) {
            if (this.wai) {
                this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                this.wai = 0;
            }
            this.ram[this.reg_sp] = (this.reg_pc >> 8);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.ram[this.reg_sp] = (this.reg_pc & 0xFF);
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.flag_i = 1;
            this.ram[this.reg_sp] = this.get_reg_ps();
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.reg_pc = (this.memmap[7][0x1FFB] << 8) | (this.memmap[7][0x1FFA]);
            this.nmi = 1;
            this.cycles += 7;
        }
        if (!this.irq) {
            if (this.wai) {
                this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                this.wai = 0;
            }
            if (!this.flag_i) {
                this.ram[this.reg_sp] = (this.reg_pc >> 8);
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.ram[this.reg_sp] = (this.reg_pc & 0xFF);
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.flag_b = 0;
                this.ram[this.reg_sp] = this.get_reg_ps();
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.reg_pc = (this.memmap[7][0x1FFF] << 8) | (this.memmap[7][0x1FFE]);
                this.flag_i = 1;
                this.cycles += 7;
            }
        }
    }
};