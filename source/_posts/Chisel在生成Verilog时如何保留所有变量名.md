---
title: Chisel在生成Verilog时如何保留所有变量名?
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-15 14:51:55
---

There are several reasons why a name may be disappearing.

## Constant Propagation

For many reasons, including interoperability with existing CAD tools, performance, and Verilog debug-ability, Chisel (actually the FIRRTL compiler underneath Chisel) will propagate constants and direct wire connections. For example:

```scala
class MyModule extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(8.W))
    val out = Output(UInt(8.W))
  })
  val wire = Wire(UInt(8.W))
  wire := io.in
  io.out := wire
}
```

In the above code, `wire` will be removed because it is simply connected to `io.in`, the Verilog will just show:

```verilog
assign io_out = io_in;
```

## Inability to name

Chisel Modules are implemented as Scala Classes. Due to implementation reasons, by default Chisel can only name "top-level" `vals` in the body of the Module, for example:

```scala
class MyModule extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(8.W))
    val in2 = Input(UInt(8.W))
    val out = Output(UInt(8.W))
  })
  val sum = io.in + io.in2 // this is a top-level val, will be named

  // A method, we can call to help generate code:
  def inc(x: UInt): UInt = {
    val incremented = x + 1.U // We cannot name this, it's inside a method
    incremented
  }

  io.out := inc(sum)
}
```

### suggestName

You can manually name any signal by calling `.suggestName("name")` on it, eg.

```scala
  def inc(x: UInt): UInt = {
    val incremented = x + 1.U // We cannot name this, it's inside a method
    incremented.suggestName("incremented") // Now it is named!
  } 
```

### Enter @chiselName

We can fix the above issue with an experimental feature called `@chiselName` like so:

```scala
import chisel3.experimental.chiselName

@chiselName
class MyModule extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(8.W))
    val in2 = Input(UInt(8.W))
    val out = Output(UInt(8.W))
  })
  val sum = io.in + io.in2 // this is a top-level val, will be named

  // A method, we can call to help generate code:
  def inc(x: UInt): UInt = {
    val incremented = x + 1.U // We cannot name this, it's inside a method
    incremented
  }

  io.out := inc(sum)
}
```

`@chiselName` is an *annotation* that can be used on any `class` or `object` definition and will ensure vals like `incremented` can get named. `@chiselName` effectively rewrites your code to put `.suggestName` all over the place.

I hope this helps!

## EDIT more info:

### Disabling Optimizations

I don't think it's in a release yet (most recent being `3.1.7`, this will be in `3.2.0`), but we do have an option to disable all optimizations. You can change the "compiler" used from `verilog` to `mverilog` (for "minimum" Verilog, ie. no optimizations). This can be done with the command-line argument `-X mverilog` either in Chisel or FIRRTL.

### Don't Touch

You can also use `chisel3.experimental.dontTouch` to mark a signal as something that shouldn't be deleted. This will prevent optimizations from removing the signal. For example:

```scala
import chisel3.experimental.dontTouch
class MyModule extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(8.W))
    val out = Output(UInt(8.W))
  })
  val wire = dontTouch(Wire(UInt(8.W)))
  wire := io.in
  io.out := wire
```