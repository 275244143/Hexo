---
title: 'Queue,Valid等使用'
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-16 18:31:47
---

#### Queue等抽象类型使用

1. **Queue** is a hardware module that implements a first in, first out queue with DecoupledIO inputs and outputs
2. **DecoupledIO** is a ready/valid interface type with members ready, valid, and bits
3. **Decoupled** is a helper to construct DecoupledIO from some other type
4. **ValidIO** is similar to DecoupledIO except that it only has valid and bits
5. **Valid** is similar to Decoupled for constructing ValidIOs

2 DecoupledIO inputs and 1 DecoupledIO output. It buffers the inputs with queues and then connects the output to the sum of the inputs:

```scala
import chisel3._
import chisel3.util._

class QueueModule extends Module {
  val io = IO(new Bundle {
    val a = Flipped(Decoupled(UInt(32.W))) // valid and bits are inputs
    val b = Flipped(Decoupled(UInt(32.W)))
    val z = Decoupled(UInt(32.W)) // valid and bits are outputs
  })
  // Note that a, b, and z are all of type DecoupledIO

  // Buffer the inputs with queues
  val qa = Queue(io.a) // io.a is the input to the FIFO
                       // qa is DecoupledIO output from FIFO
  val qb = Queue(io.b)

  // We only dequeue when io.z is ready
  qa.nodeq() // equivalent to qa.ready := false.B
  qb.nodeq()

  // When qa and qb have valid inputs and io.z is ready for an output
  when (qa.valid && qb.valid && io.z.ready) {
    io.z.enq(qa.deq() + qb.deq())
    /* The above is short for
      io.z.valid := true.B
      io.z.bits := qa.bits + qb.bits
      qa.ready := true.B
      qb.ready := true.B
    */
  }
}
```