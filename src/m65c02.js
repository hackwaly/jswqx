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
    this._counters = new Uint32Array(0x100);
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
M65C02Context.prototype.op_func_tbl = [
    function op00(this_) {
        this_.reg_pc++;
        this_.ram[this_.reg_sp] = (this_.reg_pc >> 8);
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.ram[this_.reg_sp] = (this_.reg_pc & 0xFF);
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.flag_b = 1;
        this_.ram[this_.reg_sp] = this_.get_reg_ps();
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.flag_i = 1;
        this_.reg_pc = (this_.memmap[7][0x1FFF] << 8) | (this_.memmap[7][0x1FFE]);
        this_.cycles += 7;
    },
    function op01(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    function op02(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    function op03(this_) {
        this_.cycles += 1;
    },
    function op04(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 | this_.reg_a));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 | this_.reg_a);
        }
        this_.cycles += 5;
    },
    function op05(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function op06(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 5;
    },
    function op07(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0xFE;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op08(this_) {
        this_.flag_u = 1;
        this_.ram[this_.reg_sp] = this_.get_reg_ps();
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    function op09(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op0A(this_) {
        this_._tmp1 = this_.reg_a << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.reg_a = (this_._tmp1 & 0xFF);
        this_.cycles += 2;
    },
    function op0B(this_) {
        this_.cycles += 1;
    },
    function op0C(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 | this_.reg_a));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 | this_.reg_a);
        }
        this_.cycles += 6;
    },
    function op0D(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op0E(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 6;
    },
    function op0F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x01)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op10(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_n) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function op11(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function op12(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function op13(this_) {
        this_.cycles += 1;
    },
    function op14(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & ~this_.reg_a));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & ~this_.reg_a);
        }
        this_.cycles += 5;
    },
    function op15(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op16(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 6;
    },
    function op17(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0xFD;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op18(this_) {
        this_.flag_c = 0;
        this_.cycles += 2;
    },
    function op19(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op1A(this_) {
        this_.reg_a = (++this_.reg_a & 0xFF);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op1B(this_) {
        this_.cycles += 1;
    },
    function op1C(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & ~this_.reg_a));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & ~this_.reg_a);
        }
        this_.cycles += 6;
    },
    function op1D(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a |= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op1E(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 6;
    },
    function op1F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x02)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op20(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc - 1) & 0xFFFF;
        this_.ram[this_.reg_sp] = (this_.reg_pc >> 8);
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.ram[this_.reg_sp] = (this_.reg_pc & 0xFF);
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.reg_pc = this_._addr;
        this_.cycles += 6;
    },
    function op21(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    function op22(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    function op23(this_) {
        this_.cycles += 1;
    },
    function op24(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 3;
    },
    function op25(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function op26(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 5;
    },
    function op27(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0xFB;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op28(this_) {
        this_.set_reg_ps(this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100]);
        this_.cycles += 4;
    },
    function op29(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op2A(this_) {
        this_._tmp1 = (this_.reg_a << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.reg_a = (this_._tmp1 & 0xFF);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op2B(this_) {
        this_.cycles += 1;
    },
    function op2C(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 4;
    },
    function op2D(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op2E(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 6;
    },
    function op2F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x04)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op30(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_n) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function op31(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function op32(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function op33(this_) {
        this_.cycles += 1;
    },
    function op34(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 4;
    },
    function op35(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op36(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 6;
    },
    function op37(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0xF7;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op38(this_) {
        this_.flag_c = 1;
        this_.cycles += 2;
    },
    function op39(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op3A(this_) {
        this_.reg_a = (--this_.reg_a & 0xFF);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op3B(this_) {
        this_.cycles += 1;
    },
    function op3C(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 4;
    },
    function op3D(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a &= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op3E(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, (this_._tmp1 & 0xFF));
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = (this_._tmp1 & 0xFF);
        }
        this_.cycles += 6;
    },
    function op3F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x08)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op40(this_) {
        this_.set_reg_ps(this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100]);
        this_.irq = 1;
        this_.reg_pc = this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100];
        this_.reg_pc |= (this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100] << 8);
        this_.cycles += 6;
    },
    function op41(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    function op42(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    function op43(this_) {
        this_.cycles += 1;
    },
    function op44(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 3;
    },
    function op45(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function op46(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 & 0x01;
        this_.flag_z = (this_._tmp1 ^ 0x01) ? 1 : 0;
        this_.flag_n = 0;
        this_._tmp1 >>= 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op47(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0xEF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op48(this_) {
        this_.ram[this_.reg_sp] = this_.reg_a;
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    function op49(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op4A(this_) {
        this_.flag_c = (this_.reg_a & 0x01);
        this_.flag_n = 0;
        this_.reg_a >>= 1;
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op4B(this_) {
        this_.cycles += 1;
    },
    function op4C(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = this_._addr;
        this_.cycles += 3;
    },
    function op4D(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op4E(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 & 0x01;
        this_.flag_z = (this_._tmp1 ^ 0x01) ? 1 : 0;
        this_.flag_n = 0;
        this_._tmp1 >>= 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function op4F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x10)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op50(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_v) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function op51(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function op52(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function op53(this_) {
        this_.cycles += 1;
    },
    function op54(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 4;
    },
    function op55(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op56(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 & 0x01;
        this_.flag_z = (this_._tmp1 ^ 0x01) ? 1 : 0;
        this_.flag_n = 0;
        this_._tmp1 >>= 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function op57(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0xDF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op58(this_) {
        this_.flag_i = 0;
        this_.cycles += 2;
    },
    function op59(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op5A(this_) {
        this_.ram[this_.reg_sp] = this_.reg_y;
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    function op5B(this_) {
        this_.cycles += 1;
    },
    function op5C(this_) {
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.cycles += 8;
    },
    function op5D(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a ^= (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op5E(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 & 0x01;
        this_.flag_z = (this_._tmp1 ^ 0x01) ? 1 : 0;
        this_.flag_n = 0;
        this_._tmp1 >>= 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function op5F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x20)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op60(this_) {
        this_.reg_pc = this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100];
        this_.reg_pc |= (this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100] << 8);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 6;
    },
    function op61(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 6;
    },
    function op62(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    function op63(this_) {
        this_.cycles += 1;
    },
    function op64(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, 0);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = 0;
        }
        this_.cycles += 3;
    },
    function op65(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 3;
    },
    function op66(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.tmp2 = this_.flag_c << 7;
        this_.flag_c = (this_._tmp1 & 0x01);
        this_._tmp2 = (this_._tmp1 >> 1) | this_.tmp2;
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp2);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp2;
        }
        this_.cycles += 5;
    },
    function op67(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0xBF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op68(this_) {
        this_.reg_a = this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100];
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op69(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 2;
    },
    function op6A(this_) {
        this_.tmp1 = this_.flag_c << 7;
        this_.flag_c = (this_.reg_a & 0x01);
        this_.reg_a = (this_.reg_a >> 1) | this_.tmp1;
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op6B(this_) {
        this_.cycles += 1;
    },
    function op6C(this_) {
        this_._tmp1 = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = this_._addr;
        this_.cycles += 6;
    },
    function op6D(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function op6E(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.tmp2 = this_.flag_c << 7;
        this_.flag_c = (this_._tmp1 & 0x01);
        this_._tmp2 = (this_._tmp1 >> 1) | this_.tmp2;
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp2);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp2;
        }
        this_.cycles += 6;
    },
    function op6F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x40)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op70(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_v) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function op71(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 5;
    },
    function op72(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 5;
    },
    function op73(this_) {
        this_.cycles += 1;
    },
    function op74(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, 0);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = 0;
        }
        this_.cycles += 4;
    },
    function op75(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function op76(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.tmp2 = this_.flag_c << 7;
        this_.flag_c = (this_._tmp1 & 0x01);
        this_._tmp2 = (this_._tmp1 >> 1) | this_.tmp2;
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp2);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp2;
        }
        this_.cycles += 6;
    },
    function op77(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x7F;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op78(this_) {
        this_.flag_i = 1;
        this_.cycles += 2;
    },
    function op79(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function op7A(this_) {
        this_.reg_y = this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100];
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function op7B(this_) {
        this_.cycles += 1;
    },
    function op7C(this_) {
        this_._tmp1 = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = this_._addr;
        this_.cycles += 6;
    },
    function op7D(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) + ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 99) ? 1 : 0;
            this_._tmp2 %= 100;
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a + this_._tmp1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 > 0xFF) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1 ^ 0x80) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function op7E(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.tmp2 = this_.flag_c << 7;
        this_.flag_c = (this_._tmp1 & 0x01);
        this_._tmp2 = (this_._tmp1 >> 1) | this_.tmp2;
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp2);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp2;
        }
        this_.cycles += 6;
    },
    function op7F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x80)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op80(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
        this_.cycles += 3;
    },
    function op81(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 6;
    },
    function op82(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    function op83(this_) {
        this_.cycles += 1;
    },
    function op84(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_y);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_y;
        }
        this_.cycles += 3;
    },
    function op85(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 3;
    },
    function op86(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_x);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_x;
        }
        this_.cycles += 3;
    },
    function op87(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x01;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op88(this_) {
        this_.reg_y = (--this_.reg_y & 0xFF);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op89(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.flag_z = !(this_.reg_a & (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF])) | 0;
        this_.cycles += 2;
    },
    function op8A(this_) {
        this_.reg_a = this_.reg_x;
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op8B(this_) {
        this_.cycles += 1;
    },
    function op8C(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_y);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_y;
        }
        this_.cycles += 4;
    },
    function op8D(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 4;
    },
    function op8E(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_x);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_x;
        }
        this_.cycles += 4;
    },
    function op8F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x01) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function op90(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_c) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function op91(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 6;
    },
    function op92(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 5;
    },
    function op93(this_) {
        this_.cycles += 1;
    },
    function op94(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_y);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_y;
        }
        this_.cycles += 4;
    },
    function op95(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 4;
    },
    function op96(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_y) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_x);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_x;
        }
        this_.cycles += 4;
    },
    function op97(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x02;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function op98(this_) {
        this_.reg_a = this_.reg_y;
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function op99(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 5;
    },
    function op9A(this_) {
        this_.reg_sp = (this_.reg_x | 0x100);
        this_.cycles += 2;
    },
    function op9B(this_) {
        this_.cycles += 1;
    },
    function op9C(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, 0);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = 0;
        }
        this_.cycles += 4;
    },
    function op9D(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_.reg_a);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_.reg_a;
        }
        this_.cycles += 5;
    },
    function op9E(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, 0);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = 0;
        }
        this_.cycles += 5;
    },
    function op9F(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x02) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function opA0(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_y = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opA1(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    function opA2(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_x = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opA3(this_) {
        this_.cycles += 1;
    },
    function opA4(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_y = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function opA5(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function opA6(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_x = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function opA7(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x04;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opA8(this_) {
        this_.reg_y = this_.reg_a;
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opA9(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opAA(this_) {
        this_.reg_x = this_.reg_a;
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opAB(this_) {
        this_.cycles += 1;
    },
    function opAC(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_y = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opAD(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opAE(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_x = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opAF(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x04) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function opB0(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_c) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function opB1(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function opB2(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function opB3(this_) {
        this_.cycles += 1;
    },
    function opB4(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_y = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opB5(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opB6(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_y) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_x = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opB7(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x08;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opB8(this_) {
        this_.flag_v = 0;
        this_.cycles += 2;
    },
    function opB9(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opBA(this_) {
        this_.reg_x = (this_.reg_sp & 0xFF);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opBB(this_) {
        this_.cycles += 1;
    },
    function opBC(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_y = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opBD(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opBE(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_x = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opBF(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x08) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function opC0(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_y - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opC1(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    function opC2(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    function opC3(this_) {
        this_.cycles += 1;
    },
    function opC4(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_y - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function opC5(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function opC6(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) - 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opC7(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x10;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opC8(this_) {
        this_.reg_y = (++this_.reg_y & 0xFF);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opC9(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opCA(this_) {
        this_.reg_x = (--this_.reg_x & 0xFF);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opCB(this_) {
        this_.reg_pc = (this_.reg_pc - 1) & 0xFFFF;
        this_.wai = 1;
        this_.cycles += 3;
    },
    function opCC(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_y - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opCD(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opCE(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) - 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function opCF(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x10) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function opD0(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_z) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function opD1(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function opD2(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    function opD3(this_) {
        this_.cycles += 1;
    },
    function opD4(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 4;
    },
    function opD5(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opD6(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) - 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function opD7(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x20;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opD8(this_) {
        this_.flag_d = 0;
        this_.cycles += 2;
    },
    function opD9(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opDA(this_) {
        this_.ram[this_.reg_sp] = this_.reg_x;
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    function opDB(this_) {
        this_.reg_pc = (this_.reg_pc - 1) & 0xFFFF;
        this_.stp = 1;
        this_.cycles += 3;
    },
    function opDC(this_) {
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.cycles += 4;
    },
    function opDD(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_a - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opDE(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) - 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function opDF(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x20) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function opE0(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_x - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opE1(this_) {
        this_._tmp1 = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_._addr = (((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 6;
    },
    function opE2(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    function opE3(this_) {
        this_.cycles += 1;
    },
    function opE4(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_x - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    function opE5(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 3;
    },
    function opE6(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) + 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opE7(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x40;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opE8(this_) {
        this_.reg_x = (++this_.reg_x & 0xFF);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    function opE9(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 2;
    },
    function opEA(this_) {
        this_.cycles += 2;
    },
    function opEB(this_) {
        this_.cycles += 1;
    },
    function opEC(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_x - (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        this_.flag_c = this_._tmp1 < 0 ? 0 : 1;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opED(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function opEE(this_) {
        this_._addr = (((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) + 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function opEF(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x40) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    function opF0(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_z) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    function opF1(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((((this_._tmp1 < 0xFFFF ? this_.memmap[(this_._tmp1 + 1) >> 13][(this_._tmp1 + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_._tmp1 >> 13][this_._tmp1 & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 5;
    },
    function opF2(this_) {
        this_._tmp1 = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_._addr = ((this_._tmp1 < 0xFF ? this_.ram[this_._tmp1 + 1] : this_.ram[0]) << 8) | this_.ram[this_._tmp1];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 5;
    },
    function opF3(this_) {
        this_.cycles += 1;
    },
    function opF4(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 4;
    },
    function opF5(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function opF6(this_) {
        this_._addr = (this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF] + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) + 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function opF7(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) | 0x80;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 5;
    },
    function opF8(this_) {
        this_.flag_d = 1;
        this_.cycles += 2;
    },
    function opF9(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function opFA(this_) {
        this_.reg_x = this_.ram[this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100];
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    function opFB(this_) {
        this_.cycles += 1;
    },
    function opFC(this_) {
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.cycles += 4;
    },
    function opFD(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]);
        if (this_.flag_d) {
            this_._tmp2 = ((this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F)) - ((this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F)) - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_._tmp2 %= 100;
            if (this_._tmp2 < 0) {
                this_._tmp2 += 100;
            }
            this_.reg_a = ((((this_._tmp2 / 10) % 10) << 4) | (this_._tmp2 % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 < 0) ? 0 : 1;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    function opFE(this_) {
        this_._addr = ((((this_.reg_pc < 0xFFFF ? this_.memmap[(this_.reg_pc + 1) >> 13][(this_.reg_pc + 1) & 0x1FFF] : this_.ram[0]) << 8) | this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF]) + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) + 1) & 0xFF;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        if (this_.io_write_map[this_._addr]) {
            this_.io_write(this_._addr, this_._tmp1);
        } else {
            this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF] = this_._tmp1;
        }
        this_.cycles += 6;
    },
    function opFF(this_) {
        this_._addr = this_.memmap[this_.reg_pc >> 13][this_.reg_pc & 0x1FFF];
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if ((this_.io_read_map[this_._addr] ? this_.io_read(this_._addr) : this_.memmap[this_._addr >> 13][this_._addr & 0x1FFF]) & 0x80) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    }
];
M65C02Context.prototype.execute = function() {
    this._code = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
    this.op_func_tbl[this._code](this);
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