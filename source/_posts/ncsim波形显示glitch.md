---
title: ncsim波形显示glitch
author: 神秘人
tags:
  - UVM
  - ncsim
categories:
  - 验证
mathjax: false
date: 2020-07-09 18:51:23
---



### **NCSIM中如何显示波形中的glitch**?

* 使用ncsim仿真产生shm波形，verilog 代码中有一段产生reset的逻辑，然后这个逻辑又会被自身的这个复位信号给复位掉。波形上看不出来请问有没有什么指令能够在波形上显示出这个glitch
我dumpfsdb波形，然后加+fsdb+glitch=0可以在波形上显示出有个glitch? 

```shell
You can dump event based waveforms. This will help in catching any glitches that might be generated from within the design.

To dump the delta events you need to use the following TCL commands:

ncsim> database -open waves -shm -default -event
ncsim> probe -create -shm -all -depth all

You can issue the above commands at the ncsim TCL console BEFORE running the simulation/sending signals to waveform window or you can put them in a file called input.tcl and provide this file to irun/ncverilog with -input option.

> irun -input input.tcl <other options>

To expand the time sequence:

    Go to the "Simvision Waveform WIndow"
    Go to "View" menu
    Go to "Expand Sequence Time"
    Go to "All Time"
```

