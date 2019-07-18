---
title: RawModule定制化~
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-18 10:05:19
---
####  恼人的io_xx，定制化才是最好的~
```scala
class pipe extends RawModule {
  val clk   = IO(Input(Clock()))
  val rst_n = IO(Input(Bool()))
  val in0   = IO(Input(Valid(SInt(8.W))))
  val out0  = IO(Output(Valid(SInt(8.W))))

  withClockAndReset(clk, ~rst_n) {
    out0 <> Pipe(in0,4)
  }

}
```
#### 生成代码
```verilog
module pipe( // @[:@3.2]
  input        clk, // @[:@4.4]
  input        rst_n, // @[:@5.4]
  input        in0_valid, // @[:@6.4]
  input  [7:0] in0_bits, // @[:@6.4]
  output       out0_valid, // @[:@7.4]
  output [7:0] out0_bits // @[:@7.4]
);
  wire  _T_16; // @[TestDriver.scala 15:26:@9.4]
  reg  _T_19; // @[Valid.scala 48:22:@10.4]
  reg [31:0] _RAND_0;
  reg [7:0] _T_21; // @[Reg.scala 11:16:@12.4]
  reg [31:0] _RAND_1;
  reg  _T_24; // @[Valid.scala 48:22:@16.4]
  reg [31:0] _RAND_2;
  reg [7:0] _T_26; // @[Reg.scala 11:16:@18.4]
  reg [31:0] _RAND_3;
  reg  _T_29; // @[Valid.scala 48:22:@22.4]
  reg [31:0] _RAND_4;
  reg [7:0] _T_31; // @[Reg.scala 11:16:@24.4]
  reg [31:0] _RAND_5;
  reg  _T_34; // @[Valid.scala 48:22:@28.4]
  reg [31:0] _RAND_6;
  reg [7:0] _T_36; // @[Reg.scala 11:16:@30.4]
  reg [31:0] _RAND_7;
  assign _T_16 = ~ rst_n; // @[TestDriver.scala 15:26:@9.4]
  assign out0_valid = _T_34; // @[TestDriver.scala 16:10:@38.4]
  assign out0_bits = _T_36; // @[TestDriver.scala 16:10:@37.4]
`ifdef RANDOMIZE_GARBAGE_ASSIGN
`define RANDOMIZE
`endif
`ifdef RANDOMIZE_INVALID_ASSIGN
`define RANDOMIZE
`endif
`ifdef RANDOMIZE_REG_INIT
`define RANDOMIZE
`endif
`ifdef RANDOMIZE_MEM_INIT
`define RANDOMIZE
`endif
`ifndef RANDOM
`define RANDOM $random
`endif
`ifdef RANDOMIZE
  integer initvar;
  initial begin
    `ifdef INIT_RANDOM
      `INIT_RANDOM
    `endif
    `ifndef VERILATOR
      #0.002 begin end
    `endif
  `ifdef RANDOMIZE_REG_INIT
  _RAND_0 = {1{`RANDOM}};
  _T_19 = _RAND_0[0:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_1 = {1{`RANDOM}};
  _T_21 = _RAND_1[7:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_2 = {1{`RANDOM}};
  _T_24 = _RAND_2[0:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_3 = {1{`RANDOM}};
  _T_26 = _RAND_3[7:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_4 = {1{`RANDOM}};
  _T_29 = _RAND_4[0:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_5 = {1{`RANDOM}};
  _T_31 = _RAND_5[7:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_6 = {1{`RANDOM}};
  _T_34 = _RAND_6[0:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_7 = {1{`RANDOM}};
  _T_36 = _RAND_7[7:0];
  `endif // RANDOMIZE_REG_INIT
  end
`endif // RANDOMIZE
  always @(posedge clk) begin
    if (_T_16) begin
      _T_19 <= 1'h0;
    end else begin
      _T_19 <= in0_valid;
    end
    if (in0_valid) begin
      _T_21 <= in0_bits;
    end
    if (_T_16) begin
      _T_24 <= 1'h0;
    end else begin
      _T_24 <= _T_19;
    end
    if (_T_19) begin
      _T_26 <= _T_21;
    end
    if (_T_16) begin
      _T_29 <= 1'h0;
    end else begin
      _T_29 <= _T_24;
    end
    if (_T_24) begin
      _T_31 <= _T_26;
    end
    if (_T_16) begin
      _T_34 <= 1'h0;
    end else begin
      _T_34 <= _T_29;
    end
    if (_T_29) begin
      _T_36 <= _T_31;
    end
  end
endmodule
```