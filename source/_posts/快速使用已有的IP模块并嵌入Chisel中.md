---
title: 快速使用已有的IP模块并嵌入Chisel中
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-15 09:52:30
---
#### 在ASIC/FPGA中有很多现成的IP，快速调用方法~
+ 例子afifo(也可以通过引入文件的方法setResource和特质HasBlackBoxResource)
```scala
class afifo(DW:Int = 32)  extends BlackBox(Map("D_WIDTH" -> DW)) with HasBlackBoxInline {
  val io = IO(new Bundle() {
    val wr_clk   = Input(Clock())
    val rd_clk   = Input(Clock())
    val wr_rst_n = Input(Bool())
    val rd_rst_n = Input(Bool())
    val i_data   = Input(UInt(DW.W))
    val o_data   = Output(UInt(DW.W))
    val i_push   = Input(Bool())
    val i_pop    = Input(Bool())
    val o_full   = Output(Bool())
    val o_empty  = Output(Bool())
  })
  setInline("afifo.v",
    s"""
      |module afifo
      |#(
      |parameter D_WIDTH = 32
      |)
      |(
      |input                       wr_clk,
      |input                       rd_clk,
      |input                       wr_rst_n,
      |input                       rd_rst_n,
      |
      |input   [D_WIDTH-1:0]       i_data,
      |output  [D_WIDTH-1:0]       o_data,
      |input                       i_push,
      |input                       i_pop,
      |
      |output                      o_full,
      |output                      o_empty
      |);
      |
      |reg  [2:0] wr_pointer = 'd0, rd_pointer = 'd0;
      |reg  [2:0] wr_pointer_d1 = 'd0, rd_pointer_d1 = 'd0;
      |reg  [2:0] wr_pointer_d2 = 'd0, rd_pointer_d2 = 'd0;
      |wire [2:0] wr_pointer_rd, rd_pointer_wr;
      |
      |
      |reg [D_WIDTH-1:0] data [3:0];
      |
      |//Write pointer and memory
      |//The memory won't be reseted
      |always @( posedge wr_clk, negedge wr_rst_n)
      |    if (~wr_rst_n)
      |        begin
      |        wr_pointer <= {D_WIDTH{1'b0}};
      |        end
      |    else if ( i_push && !o_full )
      |        begin
      |        wr_pointer <= wr_pointer + 1'd1;
      |        data[wr_pointer[1:0]] <= i_data;
      |        end
      |
      |//Read pointer synchronizer
      |wire [2:0] gray8_rd_pointer;
      |assign gray8_rd_pointer = gray8(rd_pointer);
      |always @( posedge wr_clk, negedge wr_rst_n)
      |    if (~wr_rst_n)
      |        begin
      |        rd_pointer_d1 <= {D_WIDTH{1'b0}};
      |        rd_pointer_d2 <= {D_WIDTH{1'b0}};
      |        end
      |    else
      |        begin
      |        rd_pointer_d1 <= gray8_rd_pointer;
      |        rd_pointer_d2 <= rd_pointer_d1;
      |        end
      |
      |//Read pointer
      |always @( posedge rd_clk, negedge rd_rst_n)
      |    if (~rd_rst_n)
      |        rd_pointer <= {D_WIDTH{1'b0}};
      |    else if ( i_pop && !o_empty )
      |        rd_pointer <= rd_pointer + 1'd1;
      |
      |//Write pointer synchronizer
      |wire [2:0] gray8_wr_pointer;
      |assign gray8_wr_pointer = gray8(wr_pointer);
      |
      |always @( posedge rd_clk,negedge rd_rst_n )
      |    if (~rd_rst_n)
      |        begin
      |        wr_pointer_d1 <= {D_WIDTH{1'b0}};
      |        wr_pointer_d2 <= {D_WIDTH{1'b0}};
      |        end
      |    else
      |        begin
      |        wr_pointer_d1 <= gray8_wr_pointer;
      |        wr_pointer_d2 <= wr_pointer_d1;
      |        end
      |
      |
      |assign wr_pointer_rd = ungray8(wr_pointer_d2);
      |assign rd_pointer_wr = ungray8(rd_pointer_d2);
      |
      |reg [D_WIDTH-1:0] buffer_data;
      |always @ (posedge rd_clk, negedge rd_rst_n)
      |    if (~rd_rst_n)
      |        buffer_data <= {D_WIDTH{1'b0}};
      |    else
      |        buffer_data <= data[rd_pointer[1:0]];
      |
      |assign o_data  = buffer_data;
      |assign o_full  = {~wr_pointer[2], wr_pointer[1:0]} == rd_pointer_wr;
      |assign o_empty = wr_pointer_rd == rd_pointer;
      |
      |
      |function [2:0] gray8;
      |input [2:0] binary;
      |begin
      |    case(binary)
      |        3'b000 : gray8 = 3'b000;
      |        3'b001 : gray8 = 3'b001;
      |        3'b010 : gray8 = 3'b011;
      |        3'b011 : gray8 = 3'b010;
      |        3'b100 : gray8 = 3'b110;
      |        3'b101 : gray8 = 3'b111;
      |        3'b110 : gray8 = 3'b101;
      |        3'b111 : gray8 = 3'b100;
      |    endcase
      |end
      |endfunction
      |
      |
      |function [2:0] ungray8;
      |input [2:0] gray;
      |begin
      |    case(gray)
      |        3'b000 : ungray8 = 3'b000;
      |        3'b001 : ungray8 = 3'b001;
      |        3'b011 : ungray8 = 3'b010;
      |        3'b010 : ungray8 = 3'b011;
      |        3'b110 : ungray8 = 3'b100;
      |        3'b111 : ungray8 = 3'b101;
      |        3'b101 : ungray8 = 3'b110;
      |        3'b100 : ungray8 = 3'b111;
      |    endcase
      |end
      |endfunction
      |
      |endmodule
      """.stripMargin)
}

class UseAfifo(DW:Int)  extends  MultiIOModule{
  val io = IO(new Bundle() {
    val wr_clk   = Input(Clock())
    val rd_clk   = Input(Clock())
    val wr_rst_n = Input(Bool())
    val rd_rst_n = Input(Bool())
    val i_data   = Input(UInt(DW.W))
    val o_data   = Output(UInt(DW.W))
    val i_push   = Input(Bool())
    val i_pop    = Input(Bool())
    val o_full   = Output(Bool())
    val o_empty  = Output(Bool())
  })

  val bb_inst = Module(new afifo(DW))
  io <> bb_inst.io
}
```
+ 生成2个文件一个afifo.v，另一个实例化数据端口位宽为64如下：
```verilog 
module UseAfifo( // @[:@18.2]
  input         clock, // @[:@19.4]
  input         reset, // @[:@20.4]
  input         io_wr_clk, // @[:@21.4]
  input         io_rd_clk, // @[:@21.4]
  input         io_wr_rst_n, // @[:@21.4]
  input         io_rd_rst_n, // @[:@21.4]
  input  [63:0] io_i_data, // @[:@21.4]
  output [63:0] io_o_data, // @[:@21.4]
  input         io_i_push, // @[:@21.4]
  input         io_i_pop, // @[:@21.4]
  output        io_o_full, // @[:@21.4]
  output        io_o_empty // @[:@21.4]
);
  wire  bb_inst_o_empty; // @[SPIDriver.scala 381:23:@23.4]
  wire  bb_inst_o_full; // @[SPIDriver.scala 381:23:@23.4]
  wire  bb_inst_i_pop; // @[SPIDriver.scala 381:23:@23.4]
  wire  bb_inst_i_push; // @[SPIDriver.scala 381:23:@23.4]
  wire [63:0] bb_inst_o_data; // @[SPIDriver.scala 381:23:@23.4]
  wire [63:0] bb_inst_i_data; // @[SPIDriver.scala 381:23:@23.4]
  wire  bb_inst_rd_rst_n; // @[SPIDriver.scala 381:23:@23.4]
  wire  bb_inst_wr_rst_n; // @[SPIDriver.scala 381:23:@23.4]
  wire  bb_inst_rd_clk; // @[SPIDriver.scala 381:23:@23.4]
  wire  bb_inst_wr_clk; // @[SPIDriver.scala 381:23:@23.4]
  afifo #(.D_WIDTH(64)) bb_inst ( // @[SPIDriver.scala 381:23:@23.4]
    .o_empty(bb_inst_o_empty),
    .o_full(bb_inst_o_full),
    .i_pop(bb_inst_i_pop),
    .i_push(bb_inst_i_push),
    .o_data(bb_inst_o_data),
    .i_data(bb_inst_i_data),
    .rd_rst_n(bb_inst_rd_rst_n),
    .wr_rst_n(bb_inst_wr_rst_n),
    .rd_clk(bb_inst_rd_clk),
    .wr_clk(bb_inst_wr_clk)
  );
  assign io_o_data = bb_inst_o_data; // @[SPIDriver.scala 382:6:@38.4]
  assign io_o_full = bb_inst_o_full; // @[SPIDriver.scala 382:6:@35.4]
  assign io_o_empty = bb_inst_o_empty; // @[SPIDriver.scala 382:6:@34.4]
  assign bb_inst_i_pop = io_i_pop; // @[SPIDriver.scala 382:6:@36.4]
  assign bb_inst_i_push = io_i_push; // @[SPIDriver.scala 382:6:@37.4]
  assign bb_inst_i_data = io_i_data; // @[SPIDriver.scala 382:6:@39.4]
  assign bb_inst_rd_rst_n = io_rd_rst_n; // @[SPIDriver.scala 382:6:@40.4]
  assign bb_inst_wr_rst_n = io_wr_rst_n; // @[SPIDriver.scala 382:6:@41.4]
  assign bb_inst_rd_clk = io_rd_clk; // @[SPIDriver.scala 382:6:@42.4]
  assign bb_inst_wr_clk = io_wr_clk; // @[SPIDriver.scala 382:6:@43.4]
endmodule
```