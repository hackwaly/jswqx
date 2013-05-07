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
    if (this._code < 0x80) {
        if (this._code < 0x40) {
            if (this._code < 0x20) {
                if (this._code < 0x10) {
                    if (this._code < 0x08) {
                        if (this._code < 0x04) {
                            if (this._code < 0x02) {
                                if (this._code < 0x01) {
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
                                } else {
                                    this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0x03) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x06) {
                                if (this._code < 0x05) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                }
                            } else {
                                if (this._code < 0x07) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x0C) {
                            if (this._code < 0x0A) {
                                if (this._code < 0x09) {
                                    this.flag_u = 1;
                                    this.ram[this.reg_sp] = this.get_reg_ps();
                                    this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                                    this.cycles += 3;
                                } else {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                }
                            } else {
                                if (this._code < 0x0B) {
                                    this._tmp1 = this.reg_a << 1;
                                    this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.reg_a = (this._tmp1 & 0xFF);
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x0E) {
                                if (this._code < 0x0D) {
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
                                } else {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x0F) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x01)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0x18) {
                        if (this._code < 0x14) {
                            if (this._code < 0x12) {
                                if (this._code < 0x11) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!this.flag_n) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0x13) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x16) {
                                if (this._code < 0x15) {
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
                                } else {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x17) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x1C) {
                            if (this._code < 0x1A) {
                                if (this._code < 0x19) {
                                    this.flag_c = 0;
                                    this.cycles += 2;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x1B) {
                                    this.reg_a = (++this.reg_a & 0xFF);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x1E) {
                                if (this._code < 0x1D) {
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
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a |= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x1F) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x02)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                }
            } else {
                if (this._code < 0x30) {
                    if (this._code < 0x28) {
                        if (this._code < 0x24) {
                            if (this._code < 0x22) {
                                if (this._code < 0x21) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc - 1) & 0xFFFF;
                                    this.ram[this.reg_sp] = (this.reg_pc >> 8);
                                    this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                                    this.ram[this.reg_sp] = (this.reg_pc & 0xFF);
                                    this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                                    this.reg_pc = this._addr;
                                    this.cycles += 6;
                                } else {
                                    this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0x23) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x26) {
                                if (this._code < 0x25) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_v = (this._tmp1 & 0x40) >> 6;
                                    this.cycles += 3;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                }
                            } else {
                                if (this._code < 0x27) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x2C) {
                            if (this._code < 0x2A) {
                                if (this._code < 0x29) {
                                    this.set_reg_ps(this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100]);
                                    this.cycles += 4;
                                } else {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                }
                            } else {
                                if (this._code < 0x2B) {
                                    this._tmp1 = (this.reg_a << 1) | this.flag_c;
                                    this.flag_c = (this._tmp1 > 0xFF) ? 1 : 0;
                                    this.reg_a = (this._tmp1 & 0xFF);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x2E) {
                                if (this._code < 0x2D) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_v = (this._tmp1 & 0x40) >> 6;
                                    this.cycles += 4;
                                } else {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x2F) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x04)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0x38) {
                        if (this._code < 0x34) {
                            if (this._code < 0x32) {
                                if (this._code < 0x31) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.flag_n) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0x33) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x36) {
                                if (this._code < 0x35) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_v = (this._tmp1 & 0x40) >> 6;
                                    this.cycles += 4;
                                } else {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x37) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x3C) {
                            if (this._code < 0x3A) {
                                if (this._code < 0x39) {
                                    this.flag_c = 1;
                                    this.cycles += 2;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x3B) {
                                    this.reg_a = (--this.reg_a & 0xFF);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x3E) {
                                if (this._code < 0x3D) {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_z = (this.reg_a & this._tmp1) ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_v = (this._tmp1 & 0x40) >> 6;
                                    this.cycles += 4;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a &= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x3F) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x08)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            if (this._code < 0x60) {
                if (this._code < 0x50) {
                    if (this._code < 0x48) {
                        if (this._code < 0x44) {
                            if (this._code < 0x42) {
                                if (this._code < 0x41) {
                                    this.set_reg_ps(this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100]);
                                    this.irq = 1;
                                    this.reg_pc = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
                                    this.reg_pc |= (this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100] << 8);
                                    this.cycles += 6;
                                } else {
                                    this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0x43) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x46) {
                                if (this._code < 0x45) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 3;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                }
                            } else {
                                if (this._code < 0x47) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 & 0x01;
                                    this.flag_n = 0;
                                    this._tmp1 >>= 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp1);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
                                    }
                                    this.cycles += 5;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x4C) {
                            if (this._code < 0x4A) {
                                if (this._code < 0x49) {
                                    this.ram[this.reg_sp] = this.reg_a;
                                    this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                                    this.cycles += 3;
                                } else {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                }
                            } else {
                                if (this._code < 0x4B) {
                                    this.flag_c = (this.reg_a & 0x01);
                                    this.flag_n = 0;
                                    this.reg_a >>= 1;
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x4E) {
                                if (this._code < 0x4D) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_pc = this._addr;
                                    this.cycles += 3;
                                } else {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x4F) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 & 0x01;
                                    this.flag_n = 0;
                                    this._tmp1 >>= 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp1);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
                                    }
                                    this.cycles += 6;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x10)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0x58) {
                        if (this._code < 0x54) {
                            if (this._code < 0x52) {
                                if (this._code < 0x51) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!this.flag_v) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0x53) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x56) {
                                if (this._code < 0x55) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 4;
                                } else {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x57) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 & 0x01;
                                    this.flag_n = 0;
                                    this._tmp1 >>= 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp1);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
                                    }
                                    this.cycles += 6;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x5C) {
                            if (this._code < 0x5A) {
                                if (this._code < 0x59) {
                                    this.flag_i = 0;
                                    this.cycles += 2;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x5B) {
                                    this.ram[this.reg_sp] = this.reg_y;
                                    this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                                    this.cycles += 3;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x5E) {
                                if (this._code < 0x5D) {
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.cycles += 8;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a ^= (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x5F) {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 & 0x01;
                                    this.flag_n = 0;
                                    this._tmp1 >>= 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp1);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp1;
                                    }
                                    this.cycles += 6;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x20)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                }
            } else {
                if (this._code < 0x70) {
                    if (this._code < 0x68) {
                        if (this._code < 0x64) {
                            if (this._code < 0x62) {
                                if (this._code < 0x61) {
                                    this.reg_pc = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
                                    this.reg_pc |= (this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100] << 8);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 6;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0x63) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x66) {
                                if (this._code < 0x65) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, 0);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
                                    }
                                    this.cycles += 3;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 3;
                                }
                            } else {
                                if (this._code < 0x67) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this._tmp2 = (this._tmp1 >> 1) | (this.flag_c << 7);
                                    this.flag_c = (this._tmp1 & 0x01);
                                    this.flag_n = (this._tmp2 & 0x80) >> 7;
                                    this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp2);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
                                    }
                                    this.cycles += 5;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x6C) {
                            if (this._code < 0x6A) {
                                if (this._code < 0x69) {
                                    this.reg_a = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 2;
                                }
                            } else {
                                if (this._code < 0x6B) {
                                    this._tmp1 = (this.reg_a >> 1) | (this.flag_c << 7);
                                    this.flag_c = (this.reg_a & 0x01);
                                    this.reg_a = this._tmp1;
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x6E) {
                                if (this._code < 0x6D) {
                                    this._tmp1 = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_pc = this._addr;
                                    this.cycles += 6;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x6F) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this._tmp2 = (this._tmp1 >> 1) | (this.flag_c << 7);
                                    this.flag_c = (this._tmp1 & 0x01);
                                    this.flag_n = (this._tmp2 & 0x80) >> 7;
                                    this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp2);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
                                    }
                                    this.cycles += 6;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x40)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0x78) {
                        if (this._code < 0x74) {
                            if (this._code < 0x72) {
                                if (this._code < 0x71) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.flag_v) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0x73) {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 5;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x76) {
                                if (this._code < 0x75) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, 0);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
                                    }
                                    this.cycles += 4;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x77) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this._tmp2 = (this._tmp1 >> 1) | (this.flag_c << 7);
                                    this.flag_c = (this._tmp1 & 0x01);
                                    this.flag_n = (this._tmp2 & 0x80) >> 7;
                                    this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp2);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
                                    }
                                    this.cycles += 6;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x7C) {
                            if (this._code < 0x7A) {
                                if (this._code < 0x79) {
                                    this.flag_i = 1;
                                    this.cycles += 2;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x7B) {
                                    this.reg_y = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x7E) {
                                if (this._code < 0x7D) {
                                    this._tmp1 = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x;
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_pc = this._addr;
                                    this.cycles += 6;
                                } else {
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
                                    } else {
                                        this._tmp2 = this.reg_a + this._tmp1 + this.flag_c;
                                        this.flag_c = (this._tmp2 > 0xFF) ? 1 : 0;
                                        this.flag_v = ((this.reg_a ^ this._tmp1 ^ 0x80) & (this.reg_a ^ this._tmp2) & 0x80) >> 7;
                                        this.reg_a = (this._tmp2 & 0xFF);
                                        this.flag_n = (this.reg_a & 0x80) >> 7;
                                        this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    }
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x7F) {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this._tmp2 = (this._tmp1 >> 1) | (this.flag_c << 7);
                                    this.flag_c = (this._tmp1 & 0x01);
                                    this.flag_n = (this._tmp2 & 0x80) >> 7;
                                    this.flag_z = (this._tmp2 & 0xFF) ? 0 : 1;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this._tmp2);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this._tmp2;
                                    }
                                    this.cycles += 6;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x80)) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        if (this._code < 0xC0) {
            if (this._code < 0xA0) {
                if (this._code < 0x90) {
                    if (this._code < 0x88) {
                        if (this._code < 0x84) {
                            if (this._code < 0x82) {
                                if (this._code < 0x81) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                    this.cycles += 3;
                                } else {
                                    this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0x83) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x86) {
                                if (this._code < 0x85) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_y);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_y;
                                    }
                                    this.cycles += 3;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 3;
                                }
                            } else {
                                if (this._code < 0x87) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_x);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_x;
                                    }
                                    this.cycles += 3;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x8C) {
                            if (this._code < 0x8A) {
                                if (this._code < 0x89) {
                                    this.reg_y = (--this.reg_y & 0xFF);
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.flag_z = (this.reg_a & (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF])) ? 0 : 1;
                                    this.cycles += 2;
                                }
                            } else {
                                if (this._code < 0x8B) {
                                    this.reg_a = this.reg_x;
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x8E) {
                                if (this._code < 0x8D) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_y);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_y;
                                    }
                                    this.cycles += 4;
                                } else {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x8F) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_x);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_x;
                                    }
                                    this.cycles += 4;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x01) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0x98) {
                        if (this._code < 0x94) {
                            if (this._code < 0x92) {
                                if (this._code < 0x91) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!this.flag_c) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0x93) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 5;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x96) {
                                if (this._code < 0x95) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_y);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_y;
                                    }
                                    this.cycles += 4;
                                } else {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0x97) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_y) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_x);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_x;
                                    }
                                    this.cycles += 4;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0x9C) {
                            if (this._code < 0x9A) {
                                if (this._code < 0x99) {
                                    this.reg_a = this.reg_y;
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0x9B) {
                                    this.reg_sp = (this.reg_x | 0x100);
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0x9E) {
                                if (this._code < 0x9D) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, 0);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
                                    }
                                    this.cycles += 4;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, this.reg_a);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = this.reg_a;
                                    }
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0x9F) {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    if (this.io_write_map[this._addr]) {
                                        this.io_write(this._addr, 0);
                                    } else {
                                        this.memmap[this._addr >> 13][this._addr & 0x1FFF] = 0;
                                    }
                                    this.cycles += 5;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x02) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                }
            } else {
                if (this._code < 0xB0) {
                    if (this._code < 0xA8) {
                        if (this._code < 0xA4) {
                            if (this._code < 0xA2) {
                                if (this._code < 0xA1) {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0xA3) {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xA6) {
                                if (this._code < 0xA5) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                }
                            } else {
                                if (this._code < 0xA7) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0xAC) {
                            if (this._code < 0xAA) {
                                if (this._code < 0xA9) {
                                    this.reg_y = this.reg_a;
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                }
                            } else {
                                if (this._code < 0xAB) {
                                    this.reg_x = this.reg_a;
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xAE) {
                                if (this._code < 0xAD) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xAF) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x04) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0xB8) {
                        if (this._code < 0xB4) {
                            if (this._code < 0xB2) {
                                if (this._code < 0xB1) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.flag_c) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0xB3) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xB6) {
                                if (this._code < 0xB5) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xB7) {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_y) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0xBC) {
                            if (this._code < 0xBA) {
                                if (this._code < 0xB9) {
                                    this.flag_v = 0;
                                    this.cycles += 2;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xBB) {
                                    this.reg_x = (this.reg_sp & 0xFF);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xBE) {
                                if (this._code < 0xBD) {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_y = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_a = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_a & 0x80) >> 7;
                                    this.flag_z = (this.reg_a & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xBF) {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.reg_x = (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x08) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            if (this._code < 0xE0) {
                if (this._code < 0xD0) {
                    if (this._code < 0xC8) {
                        if (this._code < 0xC4) {
                            if (this._code < 0xC2) {
                                if (this._code < 0xC1) {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_y - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this._addr = (((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 6;
                                }
                            } else {
                                if (this._code < 0xC3) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xC6) {
                                if (this._code < 0xC5) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_y - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                }
                            } else {
                                if (this._code < 0xC7) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0xCC) {
                            if (this._code < 0xCA) {
                                if (this._code < 0xC9) {
                                    this.reg_y = (++this.reg_y & 0xFF);
                                    this.flag_n = (this.reg_y & 0x80) >> 7;
                                    this.flag_z = (this.reg_y & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                }
                            } else {
                                if (this._code < 0xCB) {
                                    this.reg_x = (--this.reg_x & 0xFF);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
                                    this.reg_pc = (this.reg_pc - 1) & 0xFFFF;
                                    this.wai = 1;
                                    this.cycles += 3;
                                }
                            }
                        } else {
                            if (this._code < 0xCE) {
                                if (this._code < 0xCD) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = this.reg_y - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xCF) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x10) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0xD8) {
                        if (this._code < 0xD4) {
                            if (this._code < 0xD2) {
                                if (this._code < 0xD1) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (!this.flag_z) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((((this._tmp1 < 0xFFFF ? this.memmap[(this._tmp1 + 1) >> 13][(this._tmp1 + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this._tmp1 >> 13][this._tmp1 & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                }
                            } else {
                                if (this._code < 0xD3) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._addr = ((this._tmp1 < 0xFF ? this.ram[this._tmp1 + 1] : this.ram[0]) << 8) | this.ram[this._tmp1];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 5;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xD6) {
                                if (this._code < 0xD5) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 4;
                                } else {
                                    this._addr = (this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF] + this.reg_x) & 0xFF;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xD7) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0xDC) {
                            if (this._code < 0xDA) {
                                if (this._code < 0xD9) {
                                    this.flag_d = 0;
                                    this.cycles += 2;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_y) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xDB) {
                                    this.ram[this.reg_sp] = this.reg_x;
                                    this.reg_sp = --this.reg_sp & 0xFF | 0x100;
                                    this.cycles += 3;
                                } else {
                                    this.reg_pc = (this.reg_pc - 1) & 0xFFFF;
                                    this.stp = 1;
                                    this.cycles += 3;
                                }
                            }
                        } else {
                            if (this._code < 0xDE) {
                                if (this._code < 0xDD) {
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.cycles += 4;
                                } else {
                                    this._addr = ((((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]) + this.reg_x) & 0xFFFF;
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = this.reg_a - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                }
                            } else {
                                if (this._code < 0xDF) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x20) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                }
            } else {
                if (this._code < 0xF0) {
                    if (this._code < 0xE8) {
                        if (this._code < 0xE4) {
                            if (this._code < 0xE2) {
                                if (this._code < 0xE1) {
                                    this._addr = this.reg_pc;
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_x - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
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
                                }
                            } else {
                                if (this._code < 0xE3) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xE6) {
                                if (this._code < 0xE5) {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this._tmp1 = this.reg_x - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 3;
                                } else {
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
                                }
                            } else {
                                if (this._code < 0xE7) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0xEC) {
                            if (this._code < 0xEA) {
                                if (this._code < 0xE9) {
                                    this.reg_x = (++this.reg_x & 0xFF);
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 2;
                                } else {
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
                                }
                            } else {
                                if (this._code < 0xEB) {
                                    this.cycles += 2;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xEE) {
                                if (this._code < 0xED) {
                                    this._addr = (((this.reg_pc < 0xFFFF ? this.memmap[(this.reg_pc + 1) >> 13][(this.reg_pc + 1) & 0x1FFF] : this.ram[0]) << 8) | this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF]);
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this._tmp1 = this.reg_x - (this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]);
                                    this.flag_c = this._tmp1 < 0 ? 0 : 1;
                                    this.flag_n = (this._tmp1 & 0x80) >> 7;
                                    this.flag_z = (this._tmp1 & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
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
                                }
                            } else {
                                if (this._code < 0xEF) {
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
                                } else {
                                    this._addr = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if ((this.io_read_map[this._addr] ? this.io_read(this._addr) : this.memmap[this._addr >> 13][this._addr & 0x1FFF]) & 0x40) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 5;
                                }
                            }
                        }
                    }
                } else {
                    if (this._code < 0xF8) {
                        if (this._code < 0xF4) {
                            if (this._code < 0xF2) {
                                if (this._code < 0xF1) {
                                    this._tmp1 = this.memmap[this.reg_pc >> 13][this.reg_pc & 0x1FFF];
                                    this._tmp2 = this._tmp1 - ((this._tmp1 & 0x80) << 1);
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    if (this.flag_z) {
                                        this.reg_pc = (this.reg_pc + this._tmp2) & 0xFFFF;
                                        this.cycles++;
                                    }
                                    this.cycles += 2;
                                } else {
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
                                }
                            } else {
                                if (this._code < 0xF3) {
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
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xF6) {
                                if (this._code < 0xF5) {
                                    this.reg_pc = (this.reg_pc + 1) & 0xFFFF;
                                    this.cycles += 4;
                                } else {
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
                                }
                            } else {
                                if (this._code < 0xF7) {
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
                                } else {
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
                                }
                            }
                        }
                    } else {
                        if (this._code < 0xFC) {
                            if (this._code < 0xFA) {
                                if (this._code < 0xF9) {
                                    this.flag_d = 1;
                                    this.cycles += 2;
                                } else {
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
                                }
                            } else {
                                if (this._code < 0xFB) {
                                    this.reg_x = this.ram[this.reg_sp = ++this.reg_sp & 0xFF | 0x100];
                                    this.flag_n = (this.reg_x & 0x80) >> 7;
                                    this.flag_z = (this.reg_x & 0xFF) ? 0 : 1;
                                    this.cycles += 4;
                                } else {
                                    this.cycles += 1;
                                }
                            }
                        } else {
                            if (this._code < 0xFE) {
                                if (this._code < 0xFD) {
                                    this.reg_pc = (this.reg_pc + 2) & 0xFFFF;
                                    this.cycles += 4;
                                } else {
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
                                }
                            } else {
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
                            }
                        }
                    }
                }
            }
        }
    } if (!this.stp) {
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