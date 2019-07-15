---
title: Chisel多Module级联
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-15 15:25:40
---
#### 多模块等可以通过各种map，reduce，fold方法实现~
```scala
package com.smr.rtlgenpkg

import chisel3._
import chisel3.util._
import chisel3.experimental._
import dsptools.numbers._
import scala.math._

class Element extends Module {
  val io = IO(new Bundle {
    val in0 = Input(UInt(8.W))
    val in1 = Input(UInt(8.W))
    val out0 = Output(UInt(8.W))
    val out1 = Output(UInt(8.W))
  })

  val reg0 = RegNext(io.in0, 0.U)
  val reg1 = RegNext(io.in1, 0.U)

  io.out0 := reg0
  io.out1 := reg1
}

/**
  * wire together a bunch of elements, into a basic queue
  * @param elementCount how big is the queue
    */
class ElementQueue(val elementCount: Int) extends Module {
    val io = IO(new Bundle {
    val in0 = Input(UInt(8.W))
    val in1 = Input(UInt(8.W))
    val out0 = Output(UInt(8.W))
    val out1 = Output(UInt(8.W))
    })

  // create a scala Seq of Elements
  val elements = Seq.fill(elementCount)(Module(new Element))

  // wire the head to the inputs
  elements.head.io.in0 := io.in0
  elements.head.io.in1 := io.in1

  // wire the elements of the queue
  val last = elements.tail.foldLeft(elements.head) { case (prior, next) =>
    next.io.in0 := prior.io.out0
    next.io.in1 := prior.io.out1
    next
  }

  // wire the end of the queue to the outputs
  io.out0 := last.io.out0
  io.out1 := last.io.out1
}

object ArrayArgs {
  def apply(obj:Any) = {
    Array("--target-dir","%s".format(obj.toString.split('$')(0)))
  }
}

object Driver extends App {
  chisel3.Driver.execute(ArrayArgs(this), () => new ElementQueue(8))
}
```
#### 生成的verilog代码
```verilog
module Element( // @[:@3.2]
  input        clock, // @[:@4.4]
  input        reset, // @[:@5.4]
  input  [7:0] io_in0, // @[:@6.4]
  input  [7:0] io_in1, // @[:@6.4]
  output [7:0] io_out0, // @[:@6.4]
  output [7:0] io_out1 // @[:@6.4]
);
  reg [7:0] reg0; // @[TestDriver.scala 17:21:@8.4]
  reg [31:0] _RAND_0;
  reg [7:0] reg1; // @[TestDriver.scala 18:21:@10.4]
  reg [31:0] _RAND_1;
  assign io_out0 = reg0; // @[TestDriver.scala 20:11:@12.4]
  assign io_out1 = reg1; // @[TestDriver.scala 21:11:@13.4]
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
  reg0 = _RAND_0[7:0];
  `endif // RANDOMIZE_REG_INIT
  `ifdef RANDOMIZE_REG_INIT
  _RAND_1 = {1{`RANDOM}};
  reg1 = _RAND_1[7:0];
  `endif // RANDOMIZE_REG_INIT
  end
`endif // RANDOMIZE
  always @(posedge clock) begin
    if (reset) begin
      reg0 <= 8'h0;
    end else begin
      reg0 <= io_in0;
    end
    if (reset) begin
      reg1 <= 8'h0;
    end else begin
      reg1 <= io_in1;
    end
  end
endmodule
module ElementQueue( // @[:@99.2]
  input        clock, // @[:@100.4]
  input        reset, // @[:@101.4]
  input  [7:0] io_in0, // @[:@102.4]
  input  [7:0] io_in1, // @[:@102.4]
  output [7:0] io_out0, // @[:@102.4]
  output [7:0] io_out1 // @[:@102.4]
);
  wire  elements_0_clock; // @[TestDriver.scala 37:47:@104.4]
  wire  elements_0_reset; // @[TestDriver.scala 37:47:@104.4]
  wire [7:0] elements_0_io_in0; // @[TestDriver.scala 37:47:@104.4]
  wire [7:0] elements_0_io_in1; // @[TestDriver.scala 37:47:@104.4]
  wire [7:0] elements_0_io_out0; // @[TestDriver.scala 37:47:@104.4]
  wire [7:0] elements_0_io_out1; // @[TestDriver.scala 37:47:@104.4]
  wire  elements_1_clock; // @[TestDriver.scala 37:47:@107.4]
  wire  elements_1_reset; // @[TestDriver.scala 37:47:@107.4]
  wire [7:0] elements_1_io_in0; // @[TestDriver.scala 37:47:@107.4]
  wire [7:0] elements_1_io_in1; // @[TestDriver.scala 37:47:@107.4]
  wire [7:0] elements_1_io_out0; // @[TestDriver.scala 37:47:@107.4]
  wire [7:0] elements_1_io_out1; // @[TestDriver.scala 37:47:@107.4]
  wire  elements_2_clock; // @[TestDriver.scala 37:47:@110.4]
  wire  elements_2_reset; // @[TestDriver.scala 37:47:@110.4]
  wire [7:0] elements_2_io_in0; // @[TestDriver.scala 37:47:@110.4]
  wire [7:0] elements_2_io_in1; // @[TestDriver.scala 37:47:@110.4]
  wire [7:0] elements_2_io_out0; // @[TestDriver.scala 37:47:@110.4]
  wire [7:0] elements_2_io_out1; // @[TestDriver.scala 37:47:@110.4]
  wire  elements_3_clock; // @[TestDriver.scala 37:47:@113.4]
  wire  elements_3_reset; // @[TestDriver.scala 37:47:@113.4]
  wire [7:0] elements_3_io_in0; // @[TestDriver.scala 37:47:@113.4]
  wire [7:0] elements_3_io_in1; // @[TestDriver.scala 37:47:@113.4]
  wire [7:0] elements_3_io_out0; // @[TestDriver.scala 37:47:@113.4]
  wire [7:0] elements_3_io_out1; // @[TestDriver.scala 37:47:@113.4]
  wire  elements_4_clock; // @[TestDriver.scala 37:47:@116.4]
  wire  elements_4_reset; // @[TestDriver.scala 37:47:@116.4]
  wire [7:0] elements_4_io_in0; // @[TestDriver.scala 37:47:@116.4]
  wire [7:0] elements_4_io_in1; // @[TestDriver.scala 37:47:@116.4]
  wire [7:0] elements_4_io_out0; // @[TestDriver.scala 37:47:@116.4]
  wire [7:0] elements_4_io_out1; // @[TestDriver.scala 37:47:@116.4]
  wire  elements_5_clock; // @[TestDriver.scala 37:47:@119.4]
  wire  elements_5_reset; // @[TestDriver.scala 37:47:@119.4]
  wire [7:0] elements_5_io_in0; // @[TestDriver.scala 37:47:@119.4]
  wire [7:0] elements_5_io_in1; // @[TestDriver.scala 37:47:@119.4]
  wire [7:0] elements_5_io_out0; // @[TestDriver.scala 37:47:@119.4]
  wire [7:0] elements_5_io_out1; // @[TestDriver.scala 37:47:@119.4]
  wire  elements_6_clock; // @[TestDriver.scala 37:47:@122.4]
  wire  elements_6_reset; // @[TestDriver.scala 37:47:@122.4]
  wire [7:0] elements_6_io_in0; // @[TestDriver.scala 37:47:@122.4]
  wire [7:0] elements_6_io_in1; // @[TestDriver.scala 37:47:@122.4]
  wire [7:0] elements_6_io_out0; // @[TestDriver.scala 37:47:@122.4]
  wire [7:0] elements_6_io_out1; // @[TestDriver.scala 37:47:@122.4]
  wire  elements_7_clock; // @[TestDriver.scala 37:47:@125.4]
  wire  elements_7_reset; // @[TestDriver.scala 37:47:@125.4]
  wire [7:0] elements_7_io_in0; // @[TestDriver.scala 37:47:@125.4]
  wire [7:0] elements_7_io_in1; // @[TestDriver.scala 37:47:@125.4]
  wire [7:0] elements_7_io_out0; // @[TestDriver.scala 37:47:@125.4]
  wire [7:0] elements_7_io_out1; // @[TestDriver.scala 37:47:@125.4]
  Element elements_0 ( // @[TestDriver.scala 37:47:@104.4]
    .clock(elements_0_clock),
    .reset(elements_0_reset),
    .io_in0(elements_0_io_in0),
    .io_in1(elements_0_io_in1),
    .io_out0(elements_0_io_out0),
    .io_out1(elements_0_io_out1)
  );
  Element elements_1 ( // @[TestDriver.scala 37:47:@107.4]
    .clock(elements_1_clock),
    .reset(elements_1_reset),
    .io_in0(elements_1_io_in0),
    .io_in1(elements_1_io_in1),
    .io_out0(elements_1_io_out0),
    .io_out1(elements_1_io_out1)
  );
  Element elements_2 ( // @[TestDriver.scala 37:47:@110.4]
    .clock(elements_2_clock),
    .reset(elements_2_reset),
    .io_in0(elements_2_io_in0),
    .io_in1(elements_2_io_in1),
    .io_out0(elements_2_io_out0),
    .io_out1(elements_2_io_out1)
  );
  Element elements_3 ( // @[TestDriver.scala 37:47:@113.4]
    .clock(elements_3_clock),
    .reset(elements_3_reset),
    .io_in0(elements_3_io_in0),
    .io_in1(elements_3_io_in1),
    .io_out0(elements_3_io_out0),
    .io_out1(elements_3_io_out1)
  );
  Element elements_4 ( // @[TestDriver.scala 37:47:@116.4]
    .clock(elements_4_clock),
    .reset(elements_4_reset),
    .io_in0(elements_4_io_in0),
    .io_in1(elements_4_io_in1),
    .io_out0(elements_4_io_out0),
    .io_out1(elements_4_io_out1)
  );
  Element elements_5 ( // @[TestDriver.scala 37:47:@119.4]
    .clock(elements_5_clock),
    .reset(elements_5_reset),
    .io_in0(elements_5_io_in0),
    .io_in1(elements_5_io_in1),
    .io_out0(elements_5_io_out0),
    .io_out1(elements_5_io_out1)
  );
  Element elements_6 ( // @[TestDriver.scala 37:47:@122.4]
    .clock(elements_6_clock),
    .reset(elements_6_reset),
    .io_in0(elements_6_io_in0),
    .io_in1(elements_6_io_in1),
    .io_out0(elements_6_io_out0),
    .io_out1(elements_6_io_out1)
  );
  Element elements_7 ( // @[TestDriver.scala 37:47:@125.4]
    .clock(elements_7_clock),
    .reset(elements_7_reset),
    .io_in0(elements_7_io_in0),
    .io_in1(elements_7_io_in1),
    .io_out0(elements_7_io_out0),
    .io_out1(elements_7_io_out1)
  );
  assign io_out0 = elements_7_io_out0; // @[TestDriver.scala 51:11:@144.4]
  assign io_out1 = elements_7_io_out1; // @[TestDriver.scala 52:11:@145.4]
  assign elements_0_clock = clock; // @[:@105.4]
  assign elements_0_reset = reset; // @[:@106.4]
  assign elements_0_io_in0 = io_in0; // @[TestDriver.scala 40:24:@128.4]
  assign elements_0_io_in1 = io_in1; // @[TestDriver.scala 41:24:@129.4]
  assign elements_1_clock = clock; // @[:@108.4]
  assign elements_1_reset = reset; // @[:@109.4]
  assign elements_1_io_in0 = elements_0_io_out0; // @[TestDriver.scala 45:17:@130.4]
  assign elements_1_io_in1 = elements_0_io_out1; // @[TestDriver.scala 46:17:@131.4]
  assign elements_2_clock = clock; // @[:@111.4]
  assign elements_2_reset = reset; // @[:@112.4]
  assign elements_2_io_in0 = elements_1_io_out0; // @[TestDriver.scala 45:17:@132.4]
  assign elements_2_io_in1 = elements_1_io_out1; // @[TestDriver.scala 46:17:@133.4]
  assign elements_3_clock = clock; // @[:@114.4]
  assign elements_3_reset = reset; // @[:@115.4]
  assign elements_3_io_in0 = elements_2_io_out0; // @[TestDriver.scala 45:17:@134.4]
  assign elements_3_io_in1 = elements_2_io_out1; // @[TestDriver.scala 46:17:@135.4]
  assign elements_4_clock = clock; // @[:@117.4]
  assign elements_4_reset = reset; // @[:@118.4]
  assign elements_4_io_in0 = elements_3_io_out0; // @[TestDriver.scala 45:17:@136.4]
  assign elements_4_io_in1 = elements_3_io_out1; // @[TestDriver.scala 46:17:@137.4]
  assign elements_5_clock = clock; // @[:@120.4]
  assign elements_5_reset = reset; // @[:@121.4]
  assign elements_5_io_in0 = elements_4_io_out0; // @[TestDriver.scala 45:17:@138.4]
  assign elements_5_io_in1 = elements_4_io_out1; // @[TestDriver.scala 46:17:@139.4]
  assign elements_6_clock = clock; // @[:@123.4]
  assign elements_6_reset = reset; // @[:@124.4]
  assign elements_6_io_in0 = elements_5_io_out0; // @[TestDriver.scala 45:17:@140.4]
  assign elements_6_io_in1 = elements_5_io_out1; // @[TestDriver.scala 46:17:@141.4]
  assign elements_7_clock = clock; // @[:@126.4]
  assign elements_7_reset = reset; // @[:@127.4]
  assign elements_7_io_in0 = elements_6_io_out0; // @[TestDriver.scala 45:17:@142.4]
  assign elements_7_io_in1 = elements_6_io_out1; // @[TestDriver.scala 46:17:@143.4]
endmodule
```