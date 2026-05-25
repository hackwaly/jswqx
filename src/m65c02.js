// m65c02.js - 修复版本
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

// 辅助函数：读取内存（带IO）
M65C02Context.prototype.readMem = function(addr) {
    if (this.io_read_map[addr]) {
        var value = this.io_read(addr);
        // 唤醒检测 - 注意这里需要能访问 wqx 实例的 wakeUpPending
        // 问题：M65C02Context 没有直接引用 Wqx 实例
        if (this.wakeUpPending && addr === 0x45F) {
            this.wakeUpPending = false;
            return this.wakeUpValue;
        }
        return value;
    }
    return this.memmap[addr >> 13][addr & 0x1FFF];
};

// 辅助函数：写入内存（带IO）
M65C02Context.prototype.writeMem = function(addr, value) {
    if (this.io_write_map[addr]) {
        this.io_write(addr, value);
    } else {
        this.memmap[addr >> 13][addr & 0x1FFF] = value;
    }
};

// 修复后的 op_func_tbl
M65C02Context.prototype.op_func_tbl = [
    // 0x00 BRK
    function op00(this_) {
        this_.reg_pc++;
        this_.writeMem(this_.reg_sp, (this_.reg_pc >> 8));
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.writeMem(this_.reg_sp, (this_.reg_pc & 0xFF));
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.flag_b = 1;
        this_.writeMem(this_.reg_sp, this_.get_reg_ps());
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.flag_i = 1;
        this_.reg_pc = (this_.memmap[7][0x1FFF] << 8) | (this_.memmap[7][0x1FFE]);
        this_.cycles += 7;
    },
    // 0x01 ORA (indirect,X)
    function op01(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x02 未使用
    function op02(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    // 0x03 未使用
    function op03(this_) {
        this_.cycles += 1;
    },
    // 0x04 TSB zp
    function op04(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        this_.writeMem(this_._addr, (this_._tmp1 | this_.reg_a));
        this_.cycles += 5;
    },
    // 0x05 ORA zp
    function op05(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0x06 ASL zp
    function op06(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x07 RMB0 zp
    function op07(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0xFE;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x08 PHP
    function op08(this_) {
        this_.flag_u = 1;
        this_.writeMem(this_.reg_sp, this_.get_reg_ps());
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    // 0x09 ORA imm
    function op09(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x0A ASL A
    function op0A(this_) {
        this_._tmp1 = this_.reg_a << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.reg_a = (this_._tmp1 & 0xFF);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x0B 未使用
    function op0B(this_) {
        this_.cycles += 1;
    },
    // 0x0C TSB abs
    function op0C(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        this_.writeMem(this_._addr, (this_._tmp1 | this_.reg_a));
        this_.cycles += 6;
    },
    // 0x0D ORA abs
    function op0D(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x0E ASL abs
    function op0E(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x0F BBR0
    function op0F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x01)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x10 BPL
    function op10(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_n) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0x11 ORA (indirect),Y
    function op11(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        // 跨页检测
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x12 ORA (indirect)
    function op12(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x13 未使用
    function op13(this_) {
        this_.cycles += 1;
    },
    // 0x14 TRB zp
    function op14(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        this_.writeMem(this_._addr, (this_._tmp1 & ~this_.reg_a));
        this_.cycles += 5;
    },
    // 0x15 ORA zp,X
    function op15(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x16 ASL zp,X
    function op16(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x17 RMB1 zp
    function op17(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0xFD;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x18 CLC
    function op18(this_) {
        this_.flag_c = 0;
        this_.cycles += 2;
    },
    // 0x19 ORA abs,Y
    function op19(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        // 跨页检测
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x1A INC A
    function op1A(this_) {
        this_.reg_a = (++this_.reg_a & 0xFF);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x1B 未使用
    function op1B(this_) {
        this_.cycles += 1;
    },
    // 0x1C TRB abs
    function op1C(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = (this_.reg_a & this_._tmp1) ? 0 : 1;
        this_.writeMem(this_._addr, (this_._tmp1 & ~this_.reg_a));
        this_.cycles += 6;
    },
    // 0x1D ORA abs,X
    function op1D(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        // 跨页检测
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_x) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_x) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a |= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x1E ASL abs,X
    function op1E(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) << 1;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x1F BBR1
    function op1F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x02)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x20 JSR
    function op20(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc - 1) & 0xFFFF;
        this_.writeMem(this_.reg_sp, (this_.reg_pc >> 8));
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.writeMem(this_.reg_sp, (this_.reg_pc & 0xFF));
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.reg_pc = this_._addr;
        this_.cycles += 6;
    },
    // 0x21 AND (indirect,X)
    function op21(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x22 未使用
    function op22(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    // 0x23 未使用
    function op23(this_) {
        this_.cycles += 1;
    },
    // 0x24 BIT zp
    function op24(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 3;
    },
    // 0x25 AND zp
    function op25(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0x26 ROL zp
    function op26(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x27 RMB2 zp
    function op27(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0xFB;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x28 PLP
    function op28(this_) {
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.set_reg_ps(this_.readMem(this_.reg_sp));
        this_.cycles += 4;
    },
    // 0x29 AND imm
    function op29(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x2A ROL A
    function op2A(this_) {
        this_._tmp1 = (this_.reg_a << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.reg_a = (this_._tmp1 & 0xFF);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x2B 未使用
    function op2B(this_) {
        this_.cycles += 1;
    },
    // 0x2C BIT abs
    function op2C(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 4;
    },
    // 0x2D AND abs
    function op2D(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x2E ROL abs
    function op2E(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x2F BBR2
    function op2F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x04)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x30 BMI
    function op30(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_n) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0x31 AND (indirect),Y
    function op31(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x32 AND (indirect)
    function op32(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x33 未使用
    function op33(this_) {
        this_.cycles += 1;
    },
    // 0x34 BIT zp,X
    function op34(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 4;
    },
    // 0x35 AND zp,X
    function op35(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x36 ROL zp,X
    function op36(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x37 RMB3 zp
    function op37(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0xF7;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x38 SEC
    function op38(this_) {
        this_.flag_c = 1;
        this_.cycles += 2;
    },
    // 0x39 AND abs,Y
    function op39(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x3A DEC A
    function op3A(this_) {
        this_.reg_a = (--this_.reg_a & 0xFF);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x3B 未使用
    function op3B(this_) {
        this_.cycles += 1;
    },
    // 0x3C BIT abs,X
    function op3C(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 4;
    },
    // 0x3D AND abs,X
    function op3D(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a &= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x3E ROL abs,X
    function op3E(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) << 1) | this_.flag_c;
        this_.flag_c = (this_._tmp1 > 0xFF) ? 1 : 0;
        this_.writeMem(this_._addr, (this_._tmp1 & 0xFF));
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x3F BBR3
    function op3F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x08)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x40 RTI
    function op40(this_) {
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.set_reg_ps(this_.readMem(this_.reg_sp));
        this_.irq = 1;
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.reg_pc = this_.readMem(this_.reg_sp);
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.reg_pc |= (this_.readMem(this_.reg_sp) << 8);
        this_.cycles += 6;
    },
    // 0x41 EOR (indirect,X)
    function op41(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x42 未使用
    function op42(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    // 0x43 未使用
    function op43(this_) {
        this_.cycles += 1;
    },
    // 0x44 未使用
    function op44(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 3;
    },
    // 0x45 EOR zp
    function op45(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0x46 LSR zp
    function op46(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_c = this_._tmp1 & 0x01;
        this_._tmp1 >>= 1;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = 0;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x47 RMB4 zp
    function op47(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0xEF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x48 PHA
    function op48(this_) {
        this_.writeMem(this_.reg_sp, this_.reg_a);
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    // 0x49 EOR imm
    function op49(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x4A LSR A
    function op4A(this_) {
        this_.flag_c = (this_.reg_a & 0x01);
        this_.reg_a >>= 1;
        this_.flag_n = 0;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x4B 未使用
    function op4B(this_) {
        this_.cycles += 1;
    },
    // 0x4C JMP abs
    function op4C(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = this_._addr;
        this_.cycles += 3;
    },
    // 0x4D EOR abs
    function op4D(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x4E LSR abs
    function op4E(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_c = this_._tmp1 & 0x01;
        this_._tmp1 >>= 1;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = 0;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x4F BBR4
    function op4F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x10)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x50 BVC
    function op50(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_v) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0x51 EOR (indirect),Y
    function op51(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x52 EOR (indirect)
    function op52(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x53 未使用
    function op53(this_) {
        this_.cycles += 1;
    },
    // 0x54 未使用
    function op54(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 4;
    },
    // 0x55 EOR zp,X
    function op55(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x56 LSR zp,X
    function op56(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_c = this_._tmp1 & 0x01;
        this_._tmp1 >>= 1;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = 0;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x57 RMB5 zp
    function op57(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0xDF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x58 CLI
    function op58(this_) {
        this_.flag_i = 0;
        this_.cycles += 2;
    },
    // 0x59 EOR abs,Y
    function op59(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x5A PHY
    function op5A(this_) {
        this_.writeMem(this_.reg_sp, this_.reg_y);
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    // 0x5B 未使用
    function op5B(this_) {
        this_.cycles += 1;
    },
    // 0x5C 未使用
    function op5C(this_) {
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.cycles += 8;
    },
    // 0x5D EOR abs,X
    function op5D(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a ^= this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x5E LSR abs,X
    function op5E(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_c = this_._tmp1 & 0x01;
        this_._tmp1 >>= 1;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = 0;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x5F BBR5
    function op5F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x20)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x60 RTS
    function op60(this_) {
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.reg_pc = this_.readMem(this_.reg_sp);
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.reg_pc |= (this_.readMem(this_.reg_sp) << 8);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 6;
    },
    // 0x61 ADC (indirect,X)
    function op61(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x62 未使用
    function op62(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    // 0x63 未使用
    function op63(this_) {
        this_.cycles += 1;
    },
    // 0x64 STZ zp
    function op64(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, 0);
        this_.cycles += 3;
    },
    // 0x65 ADC zp
    function op65(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x66 ROR zp
    function op66(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_._tmp2 = (this_.flag_c << 7) | (this_._tmp1 >> 1);
        this_.flag_c = (this_._tmp1 & 0x01);
        this_.writeMem(this_._addr, this_._tmp2);
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x67 RMB6 zp
    function op67(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0xBF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x68 PLA
    function op68(this_) {
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.reg_a = this_.readMem(this_.reg_sp);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x69 ADC imm
    function op69(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x6A ROR A
    function op6A(this_) {
        this_._tmp1 = this_.flag_c << 7;
        this_.flag_c = (this_.reg_a & 0x01);
        this_.reg_a = (this_.reg_a >> 1) | this_._tmp1;
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x6B 未使用
    function op6B(this_) {
        this_.cycles += 1;
    },
    // 0x6C JMP indirect
    function op6C(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        // 65C02 修正：间接跳转跨页时正确处理
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFFFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = this_._addr;
        this_.cycles += 6;
    },
    // 0x6D ADC abs
    function op6D(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x6E ROR abs
    function op6E(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_._tmp2 = (this_.flag_c << 7) | (this_._tmp1 >> 1);
        this_.flag_c = (this_._tmp1 & 0x01);
        this_.writeMem(this_._addr, this_._tmp2);
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x6F BBR6
    function op6F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x40)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x70 BVS
    function op70(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_v) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0x71 ADC (indirect),Y
    function op71(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x72 ADC (indirect)
    function op72(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x73 未使用
    function op73(this_) {
        this_.cycles += 1;
    },
    // 0x74 STZ zp,X
    function op74(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, 0);
        this_.cycles += 4;
    },
    // 0x75 ADC zp,X
    function op75(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x76 ROR zp,X
    function op76(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_._tmp2 = (this_.flag_c << 7) | (this_._tmp1 >> 1);
        this_.flag_c = (this_._tmp1 & 0x01);
        this_.writeMem(this_._addr, this_._tmp2);
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x77 RMB7 zp
    function op77(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) & 0x7F;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x78 SEI
    function op78(this_) {
        this_.flag_i = 1;
        this_.cycles += 2;
    },
    // 0x79 ADC abs,Y
    function op79(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x7A PLY
    function op7A(this_) {
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.reg_y = this_.readMem(this_.reg_sp);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0x7B 未使用
    function op7B(this_) {
        this_.cycles += 1;
    },
    // 0x7C JMP indirect,X
    function op7C(this_) {
        this_._tmp1 = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFFFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_pc = this_._addr;
        this_.cycles += 6;
    },
    // 0x7D ADC abs,X
    function op7D(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_lo = this_.reg_a & 0x0F;
            var a_hi = (this_.reg_a >> 4) & 0x0F;
            var m_lo = this_._tmp1 & 0x0F;
            var m_hi = (this_._tmp1 >> 4) & 0x0F;
            var sum = a_lo + m_lo + this_.flag_c;
            var carry = 0;
            if (sum >= 10) {
                sum -= 10;
                carry = 1;
            }
            sum += a_hi * 10 + m_hi * 10 + carry * 10;
            this_.flag_c = (sum >= 100) ? 1 : 0;
            sum = sum % 100;
            this_.reg_a = ((Math.floor(sum / 10) << 4) | (sum % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
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
    // 0x7E ROR abs,X
    function op7E(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_._tmp2 = (this_.flag_c << 7) | (this_._tmp1 >> 1);
        this_.flag_c = (this_._tmp1 & 0x01);
        this_.writeMem(this_._addr, this_._tmp2);
        this_.flag_n = (this_._tmp2 & 0x80) >> 7;
        this_.flag_z = (this_._tmp2 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0x7F BBR7
    function op7F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (!(this_.readMem(this_._addr) & 0x80)) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x80 BRA
    function op80(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
        this_.cycles += 3;
    },
    // 0x81 STA (indirect,X)
    function op81(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 6;
    },
    // 0x82 未使用
    function op82(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    // 0x83 未使用
    function op83(this_) {
        this_.cycles += 1;
    },
    // 0x84 STY zp
    function op84(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_y);
        this_.cycles += 3;
    },
    // 0x85 STA zp
    function op85(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 3;
    },
    // 0x86 STX zp
    function op86(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_x);
        this_.cycles += 3;
    },
    // 0x87 SMB0 zp
    function op87(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x01;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x88 DEY
    function op88(this_) {
        this_.reg_y = (--this_.reg_y & 0xFF);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x89 BIT imm
    function op89(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        this_.flag_z = !(this_.reg_a & this_._tmp1) | 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_v = (this_._tmp1 & 0x40) >> 6;
        this_.cycles += 2;
    },
    // 0x8A TXA
    function op8A(this_) {
        this_.reg_a = this_.reg_x;
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x8B 未使用
    function op8B(this_) {
        this_.cycles += 1;
    },
    // 0x8C STY abs
    function op8C(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_y);
        this_.cycles += 4;
    },
    // 0x8D STA abs
    function op8D(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 4;
    },
    // 0x8E STX abs
    function op8E(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_x);
        this_.cycles += 4;
    },
    // 0x8F SMB1 zp
    function op8F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x01) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0x90 BCC
    function op90(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_c) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0x91 STA (indirect),Y
    function op91(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 6;
    },
    // 0x92 STA (indirect)
    function op92(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 5;
    },
    // 0x93 未使用
    function op93(this_) {
        this_.cycles += 1;
    },
    // 0x94 STY zp,X
    function op94(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_y);
        this_.cycles += 4;
    },
    // 0x95 STA zp,X
    function op95(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 4;
    },
    // 0x96 STX zp,Y
    function op96(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_y) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_x);
        this_.cycles += 4;
    },
    // 0x97 SMB2 zp
    function op97(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x02;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0x98 TYA
    function op98(this_) {
        this_.reg_a = this_.reg_y;
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0x99 STA abs,Y
    function op99(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_y;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 5;
    },
    // 0x9A TXS
    function op9A(this_) {
        this_.reg_sp = (this_.reg_x | 0x100);
        this_.cycles += 2;
    },
    // 0x9B 未使用
    function op9B(this_) {
        this_.cycles += 1;
    },
    // 0x9C STZ abs
    function op9C(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.writeMem(this_._addr, 0);
        this_.cycles += 4;
    },
    // 0x9D STA abs,X
    function op9D(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.writeMem(this_._addr, this_.reg_a);
        this_.cycles += 5;
    },
    // 0x9E STZ abs,X
    function op9E(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.writeMem(this_._addr, 0);
        this_.cycles += 5;
    },
    // 0x9F SMB3 zp
    function op9F(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x02) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0xA0 LDY imm
    function opA0(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_y = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xA1 LDA (indirect,X)
    function opA1(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xA2 LDX imm
    function opA2(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_x = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xA3 未使用
    function opA3(this_) {
        this_.cycles += 1;
    },
    // 0xA4 LDY zp
    function opA4(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_y = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0xA5 LDA zp
    function opA5(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0xA6 LDX zp
    function opA6(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_x = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0xA7 SMB4 zp
    function opA7(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x04;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xA8 TAY
    function opA8(this_) {
        this_.reg_y = this_.reg_a;
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xA9 LDA imm
    function opA9(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xAA TAX
    function opAA(this_) {
        this_.reg_x = this_.reg_a;
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xAB 未使用
    function opAB(this_) {
        this_.cycles += 1;
    },
    // 0xAC LDY abs
    function opAC(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_y = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xAD LDA abs
    function opAD(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xAE LDX abs
    function opAE(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_x = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xAF SMB5 zp
    function opAF(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x04) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0xB0 BCS
    function opB0(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_c) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0xB1 LDA (indirect),Y
    function opB1(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xB2 LDA (indirect)
    function opB2(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xB3 未使用
    function opB3(this_) {
        this_.cycles += 1;
    },
    // 0xB4 LDY zp,X
    function opB4(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_y = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xB5 LDA zp,X
    function opB5(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xB6 LDX zp,Y
    function opB6(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_y) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.reg_x = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xB7 SMB6 zp
    function opB7(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x08;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xB8 CLV
    function opB8(this_) {
        this_.flag_v = 0;
        this_.cycles += 2;
    },
    // 0xB9 LDA abs,Y
    function opB9(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xBA TSX
    function opBA(this_) {
        this_.reg_x = (this_.reg_sp & 0xFF);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xBB 未使用
    function opBB(this_) {
        this_.cycles += 1;
    },
    // 0xBC LDY abs,X
    function opBC(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_y = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xBD LDA abs,X
    function opBD(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_a = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_a & 0x80) >> 7;
        this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xBE LDX abs,Y
    function opBE(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_y;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.reg_x = this_.readMem(this_._addr);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xBF SMB7 zp
    function opBF(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x08) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0xC0 CPY imm
    function opC0(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_y - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xC1 CMP (indirect,X)
    function opC1(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xC2 未使用
    function opC2(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    // 0xC3 未使用
    function opC3(this_) {
        this_.cycles += 1;
    },
    // 0xC4 CPY zp
    function opC4(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_y - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0xC5 CMP zp
    function opC5(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0xC6 DEC zp
    function opC6(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) - 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xC7 SMB0 (BBR0?) - 实际是 SMB0
    function opC7(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x10;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xC8 INY
    function opC8(this_) {
        this_.reg_y = (++this_.reg_y & 0xFF);
        this_.flag_n = (this_.reg_y & 0x80) >> 7;
        this_.flag_z = (this_.reg_y & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xC9 CMP imm
    function opC9(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xCA DEX
    function opCA(this_) {
        this_.reg_x = (--this_.reg_x & 0xFF);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xCB WAI
    function opCB(this_) {
        this_.reg_pc = (this_.reg_pc - 1) & 0xFFFF;
        this_.wai = 1;
        this_.cycles += 3;
    },
    // 0xCC CPY abs
    function opCC(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_y - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xCD CMP abs
    function opCD(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xCE DEC abs
    function opCE(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) - 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xCF SMB1 (BBR1?) - 实际是 SMB1
    function opCF(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x10) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0xD0 BNE
    function opD0(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (!this_.flag_z) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0xD1 CMP (indirect),Y
    function opD1(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xD2 CMP (indirect)
    function opD2(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xD3 未使用
    function opD3(this_) {
        this_.cycles += 1;
    },
    // 0xD4 未使用
    function opD4(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 4;
    },
    // 0xD5 CMP zp,X
    function opD5(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xD6 DEC zp,X
    function opD6(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) - 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xD7 SMB2 zp
    function opD7(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x20;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xD8 CLD
    function opD8(this_) {
        this_.flag_d = 0;
        this_.cycles += 2;
    },
    // 0xD9 CMP abs,Y
    function opD9(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xDA PHX
    function opDA(this_) {
        this_.writeMem(this_.reg_sp, this_.reg_x);
        this_.reg_sp = --this_.reg_sp & 0xFF | 0x100;
        this_.cycles += 3;
    },
    // 0xDB STP
    function opDB(this_) {
        this_.reg_pc = (this_.reg_pc - 1) & 0xFFFF;
        this_.stp = 1;
        this_.cycles += 3;
    },
    // 0xDC 未使用
    function opDC(this_) {
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.cycles += 4;
    },
    // 0xDD CMP abs,X
    function opDD(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_a - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xDE DEC abs,X
    function opDE(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) - 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xDF SMB3 zp
    function opDF(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x20) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0xE0 CPX imm
    function opE0(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_x - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xE1 SBC (indirect,X)
    function opE1(this_) {
        this_._tmp1 = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 6;
    },
    // 0xE2 未使用
    function opE2(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 2;
    },
    // 0xE3 未使用
    function opE3(this_) {
        this_.cycles += 1;
    },
    // 0xE4 CPX zp
    function opE4(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.reg_x - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 3;
    },
    // 0xE5 SBC zp
    function opE5(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 3;
    },
    // 0xE6 INC zp
    function opE6(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) + 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xE7 SMB4 zp
    function opE7(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x40;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xE8 INX
    function opE8(this_) {
        this_.reg_x = (++this_.reg_x & 0xFF);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 2;
    },
    // 0xE9 SBC imm
    function opE9(this_) {
        this_._addr = this_.reg_pc;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 2;
    },
    // 0xEA NOP
    function opEA(this_) {
        this_.cycles += 2;
    },
    // 0xEB 未使用
    function opEB(this_) {
        this_.cycles += 1;
    },
    // 0xEC CPX abs
    function opEC(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.reg_x - this_.readMem(this_._addr);
        this_.flag_c = (this_._tmp1 >= 0) ? 1 : 0;
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xED SBC abs
    function opED(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    // 0xEE INC abs
    function opEE(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) + 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xEF SMB5 zp
    function opEF(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x40) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 5;
    },
    // 0xF0 BEQ
    function opF0(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_._tmp1 - ((this_._tmp1 & 0x80) << 1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        if (this_.flag_z) {
            this_.reg_pc = (this_.reg_pc + this_._tmp2) & 0xFFFF;
            this_.cycles++;
        }
        this_.cycles += 2;
    },
    // 0xF1 SBC (indirect),Y
    function opF1(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 5;
    },
    // 0xF2 SBC (indirect)
    function opF2(this_) {
        this_._tmp1 = this_.readMem(this_.reg_pc);
        this_._addr = (this_.readMem((this_._tmp1 + 1) & 0xFF) << 8) | this_.readMem(this_._tmp1);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 5;
    },
    // 0xF3 未使用
    function opF3(this_) {
        this_.cycles += 1;
    },
    // 0xF4 未使用
    function opF4(this_) {
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_.cycles += 4;
    },
    // 0xF5 SBC zp,X
    function opF5(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    // 0xF6 INC zp,X
    function opF6(this_) {
        this_._addr = (this_.readMem(this_.reg_pc) + this_.reg_x) & 0xFF;
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) + 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xF7 SMB6 zp
    function opF7(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_.reg_pc = (this_.reg_pc + 1) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr) | 0x80;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 5;
    },
    // 0xF8 SED
    function opF8(this_) {
        this_.flag_d = 1;
        this_.cycles += 2;
    },
    // 0xF9 SBC abs,Y
    function opF9(this_) {
        this_._addr = (this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc);
        if ((this_._addr & 0xFF00) !== ((this_._addr + this_.reg_y) & 0xFF00)) {
            this_.cycles++;
        }
        this_._addr = (this_._addr + this_.reg_y) & 0xFFFF;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    // 0xFA PLX
    function opFA(this_) {
        this_.reg_sp = ++this_.reg_sp & 0xFF | 0x100;
        this_.reg_x = this_.readMem(this_.reg_sp);
        this_.flag_n = (this_.reg_x & 0x80) >> 7;
        this_.flag_z = (this_.reg_x & 0xFF) ? 0 : 1;
        this_.cycles += 4;
    },
    // 0xFB 未使用
    function opFB(this_) {
        this_.cycles += 1;
    },
    // 0xFC 未使用
    function opFC(this_) {
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_.cycles += 4;
    },
    // 0xFD SBC abs,X
    function opFD(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = this_.readMem(this_._addr);
        if (this_.flag_d) {
            var a_val = (this_.reg_a >> 4) * 10 + (this_.reg_a & 0x0F);
            var m_val = (this_._tmp1 >> 4) * 10 + (this_._tmp1 & 0x0F);
            var result = a_val - m_val - 1 + this_.flag_c;
            this_.flag_c = (result >= 0) ? 1 : 0;
            if (result < 0) result += 100;
            result = result % 100;
            this_.reg_a = ((Math.floor(result / 10) << 4) | (result % 10));
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
            this_.cycles++;
        } else {
            this_._tmp2 = this_.reg_a - this_._tmp1 - 1 + this_.flag_c;
            this_.flag_c = (this_._tmp2 >= 0) ? 1 : 0;
            this_.flag_v = ((this_.reg_a ^ this_._tmp1) & (this_.reg_a ^ this_._tmp2) & 0x80) >> 7;
            this_.reg_a = (this_._tmp2 & 0xFF);
            this_.flag_n = (this_.reg_a & 0x80) >> 7;
            this_.flag_z = (this_.reg_a & 0xFF) ? 0 : 1;
        }
        this_.cycles += 4;
    },
    // 0xFE INC abs,X
    function opFE(this_) {
        this_._addr = ((this_.readMem(this_.reg_pc + 1) << 8) | this_.readMem(this_.reg_pc)) + this_.reg_x;
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        this_._tmp1 = (this_.readMem(this_._addr) + 1) & 0xFF;
        this_.writeMem(this_._addr, this_._tmp1);
        this_.flag_n = (this_._tmp1 & 0x80) >> 7;
        this_.flag_z = (this_._tmp1 & 0xFF) ? 0 : 1;
        this_.cycles += 6;
    },
    // 0xFF SMB7 zp
    function opFF(this_) {
        this_._addr = this_.readMem(this_.reg_pc);
        this_._tmp2 = this_.readMem(this_.reg_pc + 1);
        this_.reg_pc = (this_.reg_pc + 2) & 0xFFFF;
        if (this_.readMem(this_._addr) & 0x80) {
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
            this.writeMem(this.reg_sp, (this.reg_pc >> 8));
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.writeMem(this.reg_sp, (this.reg_pc & 0xFF));
            this.reg_sp = --this.reg_sp & 0xFF | 0x100;
            this.flag_i = 1;
            this.writeMem(this.reg_sp, this.get_reg_ps());
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
                this.writeMem(this.reg_sp, (this.reg_pc >> 8));
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.writeMem(this.reg_sp, (this.reg_pc & 0xFF));
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.flag_b = 0;
                this.writeMem(this.reg_sp, this.get_reg_ps());
                this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                this.reg_pc = (this.memmap[7][0x1FFF] << 8) | (this.memmap[7][0x1FFE]);
                this.flag_i = 1;
                this.cycles += 7;
            }
        }
    }
};