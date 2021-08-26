---
title: JavaScript来画时序图
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-08-26 10:23:04
---



```html
<header>
<script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/2.6.8/skins/default.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/2.6.8/wavedrom.min.js" type="text/javascript"></script>

</header>
<body onload="WaveDrom.ProcessAll()">

<h2>Timing Example</h2>

<p class="wave">
<script type="WaveDrom">
{ signal : [
  { name: "clk",  wave: "p......" },
  { name: "bus",  wave: "x.27.5x",   data: "head body tail" },
  { name: "wire", wave: "0.1..0." },
]}
</script>
<br/><br/><br/><br/>
<script type="WaveDrom">
{ signal : [
  { name: "clk",  wave: "P......" },
  { name: "bus",  wave: "1111111.34.5x",   data: "head body tail" },
  { name: "wire", wave: "0.1..0." },
  { name: "test", wave: "01.zx=ud.23.456789"},
]}
</script>

</body>
  
```

![1](/JavaScript来画时序图/1.png)