---
title: Chisel引入敏捷迭代测试~
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-17 14:48:41
---

#### 引入多种高级语言的测试套件功能~

```scala
package test.smr

import chisel3.iotesters.{ChiselFlatSpec, Driver, PeekPokeTester}

class AccumulatorTests(c: Accumulator) extends PeekPokeTester(c) {
  var tot = 0
  for (t <- 0 until 16) {
    val in = rnd.nextInt(2)
    poke(c.io.in, in)
    step(1)
    if (in == 1) tot += 2//wrong here
    expect(c.io.out, tot)
  }
}

class AccumulatorTester extends ChiselFlatSpec {
  behavior of "Accumulator"
  backends foreach {backend =>
    it should s"correctly accumulate randomly generated numbers in $backend" in {
      Driver(() => new Accumulator, backend)(c => new AccumulatorTests(c)) should be (true)
    }
  }
}

object TBTOP {
  def main(args: Array[String]): Unit = {
    Driver.execute(Array("--backend-name","vcs"),() => new Accumulator()) {
        (c) => new AccumulatorTests(c)
      }
  }
}
```
#### 生成多个测试套件以及测试脚本
```shell
vcs -full64 -quiet -timescale=1ns/1ps -debug_pp -Mdir=Accumulator.csrc +v2k +vpi +vcs+lic+wait +vcs+initreg+random +define+CLOCK_PERIOD=1 -P vpi.tab -cpp g++ -O2 -LDFLAGS -lstdc++ -CFLAGS "-I$VCS_HOME/include -I$dir -fPIC -std=c++11" -o Accumulator Accumulator.v Accumulator-harness.v vpi.cpp
```
```verilog
module test;
  reg clock = 1;
  reg reset = 1;
  reg[0:0] io_in = 0;
  wire[0:0] io_in_delay;
  assign  io_in_delay = io_in;
  wire[7:0] io_out_delay;
  wire[7:0] io_out;
  assign  io_out = io_out_delay;
  always #`CLOCK_PERIOD clock = ~clock;
  reg vcdon = 0;
  reg [1023:0] vcdfile = 0;
  reg [1023:0] vpdfile = 0;

  /*** DUT instantiation ***/
  Accumulator Accumulator(
    .clock(clock),
    .reset(reset),
    .io_in(io_in_delay),
    .io_out(io_out_delay)  );

  initial begin
    $init_rsts(reset);
    $init_ins(clock, reset, io_in);
    $init_outs(io_out);
    $init_sigs(Accumulator);
    /*** VCD dump ***/
    if ($value$plusargs("vcdfile=%s", vcdfile)) begin
      $dumpfile(vcdfile);
      $dumpvars(0, Accumulator);
      $dumpoff;
      vcdon = 0;
    end
  end

  always @(negedge clock) begin
    if (vcdfile && reset) begin
      $dumpoff;
      vcdon = 0;
    end
    else if (vcdfile && !vcdon) begin
      $dumpon;
      vcdon = 1;
    end
     $tick();
  end

endmodule
```
#### UnitTest快速验证迭代，测试输出
```bash
[info] [0.001] SEED 1563344502236
[info] [0.002] EXPECT AT 1   io_out got 1 expected 2 FAIL
[info] [0.003] EXPECT AT 2   io_out got 1 expected 2 FAIL
[info] [0.003] EXPECT AT 3   io_out got 2 expected 4 FAIL
[info] [0.003] EXPECT AT 4   io_out got 3 expected 6 FAIL
[info] [0.004] EXPECT AT 5   io_out got 3 expected 6 FAIL
[info] [0.004] EXPECT AT 6   io_out got 4 expected 8 FAIL
[info] [0.004] EXPECT AT 7   io_out got 4 expected 8 FAIL
[info] [0.005] EXPECT AT 8   io_out got 5 expected 10 FAIL
[info] [0.005] EXPECT AT 9   io_out got 5 expected 10 FAIL
[info] [0.005] EXPECT AT 10   io_out got 5 expected 10 FAIL
[info] [0.005] EXPECT AT 11   io_out got 5 expected 10 FAIL
[info] [0.006] EXPECT AT 12   io_out got 6 expected 12 FAIL
[info] [0.006] EXPECT AT 13   io_out got 6 expected 12 FAIL
[info] [0.007] EXPECT AT 14   io_out got 7 expected 14 FAIL
[info] [0.007] EXPECT AT 15   io_out got 7 expected 14 FAIL
[info] [0.007] EXPECT AT 16   io_out got 8 expected 16 FAIL
test Accumulator Success: 0 tests passed in 21 cycles in 0.021712 seconds 967.23 Hz
[info] [0.008] RAN 16 CYCLES FAILED FIRST AT CYCLE 1
```