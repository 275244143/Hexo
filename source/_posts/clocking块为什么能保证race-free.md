---
title: clocking块为什么能保证race free?
date: 2019-04-18 17:19:13
tags: [SystemVerilog]
categories: [验证]
---
## 为啥要推荐使用clocking块？

<font color=red>
代码例子：
<pre name="code" class="systemverilog">  	

clocking cb @(negedge clk);
  input v;
endclocking 

always @(cb) $display(cb.v);//采样old值

always @(negedge clk) $display(cb.v);//采样old or new值和仿真器相关。

</pre>

主要原因是clocking块中默认为1step采样，在clk下降沿发生时（@(cb)触发），数据已经采样了。
而第二条always语句直接(@(negedge clk))和（@(cb)）并发，所以就有race glitch。

</font> 
