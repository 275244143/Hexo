---
title: 向量IO的Slice赋值
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-16 09:26:22
---
#### IO端口切片选择方法
```scala
class Slicer extends Module {
  implicit class SeqHelper(val seq: Seq[Bits]) {
    /**
      * Promotes a Seq of Bits to a class that supports the connect operator
      */
    def := (other: Seq[Bits]): Unit = {
      seq.zip(other).foreach { case (a, b) => a := b}
    } 
}

  val io = IO(new Bundle {
    val in1  = Input(Vec(4, Bool()))
    val out1 = Output(Vec(4, Bool()))
  })

  io.out1 := DontCare
  io.out1.slice(0, 2) := io.in1.slice(0, 2)
}
```
您可以将SlicerHelper放在一个包对象中，这样就可以对它进行一般性的访问。

```scala
io.out1.slice(0, 2).zip(io.in1.slice(0, 2)).foreach { case (a, b) => a:= b }
```

 或者

```scala
io.out1.zip(io.in1).slice(0, 2).foreach { case (a, b) => a:= b }
```
#### 生成代码
```verilog
module Slicer( // @[:@3.2]
  input   clock, // @[:@4.4]
  input   reset, // @[:@5.4]
  input   io_in1_0, // @[:@6.4]
  input   io_in1_1, // @[:@6.4]
  input   io_in1_2, // @[:@6.4]
  input   io_in1_3, // @[:@6.4]
  output  io_out1_0, // @[:@6.4]
  output  io_out1_1, // @[:@6.4]
  output  io_out1_2, // @[:@6.4]
  output  io_out1_3 // @[:@6.4]
);
  assign io_out1_0 = io_in1_0; // @[TestDriver.scala 82:49:@12.4]
  assign io_out1_1 = io_in1_1; // @[TestDriver.scala 82:49:@13.4]
  assign io_out1_2 = 1'h0;
  assign io_out1_3 = 1'h0;
endmodule
```

#### 选择向量中第一个大于1的端口并输出到相应输出端口

```scala
  io.out1 := DontCare
  //io.out1.slice(0, 2) := io.in1.slice(0, 2)
  for((key,value) <- io.elements)
    println("%s --> %s".format(key,value))
    val index_num = io.in1.indexWhere{
      x:Bool =>  x > false.B
    }
  println(index_num)
  io.out1(index_num) := io.in1(index_num)
```

#### 生成代码

```verilog
module Slicer( // @[:@3.2]
  input   clock, // @[:@4.4]
  input   reset, // @[:@5.4]
  input   io_in1_0, // @[:@6.4]
  input   io_in1_1, // @[:@6.4]
  input   io_in1_2, // @[:@6.4]
  input   io_in1_3, // @[:@6.4]
  output  io_out1_0, // @[:@6.4]
  output  io_out1_1, // @[:@6.4]
  output  io_out1_2, // @[:@6.4]
  output  io_out1_3 // @[:@6.4]
);
  wire  _T_42; // @[TestDriver.scala 96:20:@12.4]
  wire  _T_44; // @[TestDriver.scala 96:20:@13.4]
  wire  _T_46; // @[TestDriver.scala 96:20:@14.4]
  wire [1:0] _T_53; // @[TestDriver.scala 95:38:@16.4]
  wire [1:0] _T_54; // @[TestDriver.scala 95:38:@17.4]
  wire [1:0] index_num; // @[TestDriver.scala 95:38:@18.4]
  wire  _GEN_5; // @[TestDriver.scala 99:22:@19.4]
  wire  _GEN_6; // @[TestDriver.scala 99:22:@19.4]
  assign _T_42 = io_in1_0 > 1'h0; // @[TestDriver.scala 96:20:@12.4]
  assign _T_44 = io_in1_1 > 1'h0; // @[TestDriver.scala 96:20:@13.4]
  assign _T_46 = io_in1_2 > 1'h0; // @[TestDriver.scala 96:20:@14.4]
  assign _T_53 = _T_46 ? 2'h2 : 2'h3; // @[TestDriver.scala 95:38:@16.4]
  assign _T_54 = _T_44 ? 2'h1 : _T_53; // @[TestDriver.scala 95:38:@17.4]
  assign index_num = _T_42 ? 2'h0 : _T_54; // @[TestDriver.scala 95:38:@18.4]
  assign _GEN_5 = 2'h1 == index_num ? io_in1_1 : io_in1_0; // @[TestDriver.scala 99:22:@19.4]
  assign _GEN_6 = 2'h2 == index_num ? io_in1_2 : _GEN_5; // @[TestDriver.scala 99:22:@19.4]
  assign io_out1_0 = 2'h3 == index_num ? io_in1_3 : _GEN_6; // @[TestDriver.scala 99:22:@19.4]
  assign io_out1_1 = 2'h3 == index_num ? io_in1_3 : _GEN_6; // @[TestDriver.scala 99:22:@19.4]
  assign io_out1_2 = 2'h3 == index_num ? io_in1_3 : _GEN_6; // @[TestDriver.scala 99:22:@19.4]
  assign io_out1_3 = 2'h3 == index_num ? io_in1_3 : _GEN_6; // @[TestDriver.scala 99:22:@19.4]
endmodule
```

