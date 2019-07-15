---
title: 实现Inout端口~
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-15 14:55:26
---
#### verilog的inout实现相对麻烦点，采用Analog~
```scala
class AnalogBlackBox extends BlackBox {
  val io = IO(new Bundle {
    val bus = Analog(32.W)
  })
}

class AnalogModule extends Module {
  val io = IO(new Bundle {
    val bus = Analog(32.W)
  })

  val inst = Module(new AnalogBlackBox)
  inst.io.bus <> io.bus
}
```


```verilog
module AnalogModule( // @[:@9.2]
  input         clock, // @[:@10.4]
  input         reset, // @[:@11.4]
  inout  [31:0] io_bus // @[:@12.4]
);
  initial begin end
  AnalogBlackBox inst ( // @[SPIDriver.scala 397:20:@14.4]
    .bus(io_bus)
  );
endmodule
```