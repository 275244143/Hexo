---
title: Chisel模块多端口扩展
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-14 09:55:58
---
####  端口可以继承也可以通过实验性的MultiIOModule进行扩展~

```scala

class SpiMaster(val param:SpiParam) extends MultiIOModule {
    ...
}

class SpiMasterExt(val delay:Int = 1) extends {
  override val param:SpiParam = new SpiParam 
} with SpiMaster(param) {

  require(delay >= 1,s"delay:$delay >= 1")
  
  ioext = IO(new Bundle {
    val spi_rdata_dly = Output(UInt(param.DATAWIDTH.W))
  })

  val spi_rdata_dregs = RegInit(VecInit(Seq.fill(delay)(0.U(param.DATAWIDTH.W))))

  if(delay == 1)
    spi_rdata_dregs(0) := io.spi_rdata
  else {
    spi_rdata_dregs(0) := io.spi_rdata
    for(i <- 0 until spi_rdata_dregs.length - 1) {
      spi_rdata_dregs(i+1) := spi_rdata_dregs(i)
    }
  }

  ioext.spi_rdata_dly := spi_rdata_dregs(delay - 1)
}
```