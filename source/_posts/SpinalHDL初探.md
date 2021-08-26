---
title: SpinalHDL初探
author: 神秘人
tags:
  - Chipsel
  - SpinalHDL
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-08-26 09:48:18
---



###  很早就学习了Chisel，最近看了某blog推荐SpinalHDL，确实符合硬件思维的人

转载

# 一

### 检测输入信号上升沿个数。

   信号列表：

| 信号名 | 位宽 | 方向   | 说明       |
| ------ | ---- | ------ | ---------- |
| sigIn  | 1    | input  | 待检测信号 |
| clear  | 1    | input  | 计数器清零 |
| cnt    | 32   | output | 计数值     |

### 实现

```scala
import spinal.core._
import spinal.lib._
case class example1() extends Component{
  val io=new Bundle{
    val sigIn=in Bool
    val clear=in Bool
    val cnt=out UInt (32 bits)
  }
  val counter=new Area{
    val cnt=Counter(32 bits,io.sigIn.rise(False))
    when(io.clear){
      cnt.value.clearAll()
    }
    io.cnt:=cnt.value
  }
}
object example1App extends App{
  SpinalConfig(
    defaultClockDomainFrequency = FixedFrequency(100 MHz)
  ).generateSystemVerilog(example1()).printPruned()
}
```

* 关键点

1. Bool信号上升沿检测方法rise()
2. SpinalHDL中lib库提供的Counter函数

### 检测固定时间段内输入信号上升沿个数，检测时长由参数配置，时钟频率提前未知。

### 实现

```scala
case class example1_1(timeMs:Int) extends Component{
  val io=new Bundle{
    val sigIn=in Bool
    val clear=in Bool
    val cnt=out UInt (32 bits)
  }
  val counter=new Area{
    val timeout=Timeout(timeMs ms)
    val cnt=Counter(32 bits,io.sigIn.rise(False))
    when(io.clear){
      cnt.value.clearAll()
    }
    when(timeout){
      timeout.clear()
      cnt.value.clearAll()
    }
    io.cnt:=RegNextWhen(cnt.value,timeout,U(0,32 bits))
  }
}
object example1App extends App{
  SpinalConfig(
    defaultClockDomainFrequency = FixedFrequency(100 MHz)
  ).generateSystemVerilog(example1_1(1)).printPruned()
}
```

- 关键点

1. SpinalHDL中lib库提供的Timeout模块
2. SpinalConfig中时钟频率配置，模块内TImeMs ms自动计算相应计数器值。

## 由初始化参数决定是检测上升沿还是下降沿。

### 实现

```scala
case class example1_2(timeMs:Int,detectRise:Boolean) extends Component{
  val io=new Bundle{
    val sigIn=in Bool
    val clear=in Bool
    val cnt=out UInt (32 bits)
  }
  val counter=new Area{
    val timeout=Timeout(timeMs ms)
    val incEnable=if(detectRise) io.sigIn.rise(False) else io.sigIn.fall(False)
    val cnt=Counter(32 bits,incEnable)
    when(io.clear){
      cnt.value.clearAll()
    }
    when(timeout){
      timeout.clear()
      cnt.value.clearAll()
    }
    io.cnt:=RegNextWhen(cnt.value,timeout,U(0,32 bits))
  }
  object example1App extends App{
  SpinalConfig(
    defaultClockDomainFrequency = FixedFrequency(100 MHz)
  ).generateSystemVerilog(example1_2(1,false)).printPruned()
}
```

- 关键点

1. if else在描述电路规则中的使用。在生成Verilog文件之前，val incEnable=if(detectRise) io.sigIn.rise(False) else io.sigIn.fall(False)已经确定是检测上升沿还是下降沿。这里if else类似`ifdef的功能。



# 二

## 针对多比特输入信号，对其中的比特位分组求异或值。

端口列表：

| 信号   | 位宽        | 方向   | 说明                                                |
| ------ | ----------- | ------ | --------------------------------------------------- |
| sigIn  | dataWIdth   | input  | 输入信号，位宽dataWidth由参数决定                   |
| sigOut | sigOutWidht | output | 输出信号,每个比特对应sigIn相应一组bit信号的异或值。 |

  参数类：

```scala
case class config(bitsPerGroup:Int, dataWidth:Int){
	require(dataWidth%bitsPerGroup==0,"Invalid parameter")  
    val 	sigOutWidth=dataWidth/bitsPerGroup
}
```

这里将参数放置在一个class中，以便方便使用及统一的参数检查。

### 实现

```scala
case class config(bitsPerGroup:Int,
                  dataWidth:Int){
  require(dataWidth%bitsPerGroup==0,"Invalid parameter")
  val sigOutWidth=dataWidth/bitsPerGroup
}
case class example2(cfg:config) extends Component{
  val io=new Bundle{
    val sigIn=in UInt(cfg.dataWidth bits)
    val sigOut=out UInt(cfg.sigOutWidth bits)
  }
  noIoPrefix()
  val _=new Area{
    io.sigOut:=io.sigIn.subdivideIn(cfg.bitsPerGroup bits).map(_.xorR).asBits().asUInt
  }.setName("")
 }
object example2App extends App{
  val cfg=config(8,32)
  SpinalSystemVerilog(example2(cfg)).printPruned()
}
```

- 关键点

1. subdivideIn方法的使用   
2. Scala Collection中map函数的使用

## 对每组比特安位取反，随后对每组比特累加求和.考虑到时序问题，在求和前添加一级寄存器

```scala
case class config(bitsPerGroup:Int,
                  dataWidth:Int){
  require(dataWidth%bitsPerGroup==0,"Invalid parameter")
  val sigOutWidth=dataWidth/bitsPerGroup
}
case class example2_1(cfg:config) extends Component{
  val io=new Bundle{
    val sigIn=in UInt(cfg.dataWidth bits)
    val sigOut=out UInt(cfg.bitsPerGroup bits)
  }
  noIoPrefix()
  val _=new Area{
    io.sigOut:=(io.sigIn.subdivideIn(cfg.bitsPerGroup bits).map(~_).map(RegNext(_))).reduce(_+_)
  }.setName("")
}
object example2App extends App{
  val cfg=config(8,32)
  SpinalSystemVerilog(example2_1(cfg)).printPruned()
}
```

- 关键点

1. Scala Collection中reduce函数的使用

##  当加法溢出时做饱和处理

```scala
case class config(bitsPerGroup:Int,
                  dataWidth:Int){
  require(dataWidth%bitsPerGroup==0,"Invalid parameter")
  val sigOutWidth=dataWidth/bitsPerGroup
}
case class example2_2(cfg:config) extends Component{
  val io=new Bundle{
    val sigIn=in UInt(cfg.dataWidth bits)
    val sigOut=out UInt(cfg.bitsPerGroup bits)
  }
  noIoPrefix()
  val _=new Area{
    io.sigOut:=(io.sigIn.subdivideIn(cfg.bitsPerGroup bits).map(~_).map(RegNext(_))).reduce(_ +| _)
  }.setName("")
}
object example2App extends App{
  val cfg=config(8,32)
  SpinalSystemVerilog(example2_2(cfg)).printPruned()
}
```

- 关键点

1. SpinalHDL中UInt/SInt中“+|”操作符使用。

# 三

## 模块设计，输入一组信号(位宽相同8bit，信号个数不定，由参数指定)，前一半信号寄存器按位取反输出，后一半信号寄存器加1输出。

### 实现

```scala
import spinal.core._
case class example3(sigNum:Int) extends Component{
  val io=new Bundle{
    val dataInVec=in Vec(UInt(8 bits),sigNum)
    val dataOutVec=out Vec(UInt(8 bits),sigNum)
  }
  val _=new Area{
    for(index<-0 until sigNum){
      if(index<sigNum/2)
        io.dataOutVec(index):= ~io.dataInVec(index)
      else
        io.dataOutVec(index):=io.dataInVec(index)+1
    }
  }
}
object example3App extends App{
  SpinalSystemVerilog(example3(256))
}
```

- 关键点

1. Vec类型的使用。
2. for、if else的使用。

##  输入端口数据类型为无符号数，转换为有符号数处理，前一半若小于0，则取绝对值+1，否则减1.后一半若小于0，则加1，否则+2。

### 实现

```scala
case class example3_1(sigNum:Int) extends Component{
  val io=new Bundle{
    val dataInVec=in Vec(UInt(8 bits),sigNum)
    val dataOutVec=out Vec(UInt(8 bits),sigNum)
  }
  val _=new Area{
    for(index<-0 until sigNum){
      if(index<sigNum/2){
        when(io.dataInVec(index).msb){
          io.dataOutVec(index):=io.dataInVec(index).asSInt.abs+1
        }otherwise{
          io.dataOutVec(index):=io.dataInVec(index)-1
        }
      } else {
        when(io.dataInVec(index).msb){
          io.dataOutVec(index):=io.dataInVec(index)+1
        }otherwise {
          io.dataOutVec(index):=io.dataInVec(index)+2
        }
      }
    }
  }
}
```

- 关键点

1. if为scala中的语法，可用于辅助电路描述(类似脚本的功能)，而when则为SpinalHDL中的概念，用于描述电路。