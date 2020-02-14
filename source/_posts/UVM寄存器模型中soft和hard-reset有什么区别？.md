---
title: UVM寄存器模型中soft和hard reset有什么区别？
date: 2019-04-18 09:39:46
tags: [UVM,SystemVerilog,RAL]
categories: [验证,UVM-RAL]
---
## 1.Kind = "HARD" or "SOFT"
寄存器模型中复位操作这个到底有什么作用呢？源码如下：

<font color=red>
代码例子：
<pre name="code" class="systemverilog">  	
function void uvm_reg_xxx::reset(string kind = "HARD");
	if (!m_reset.exists(kind))
  		return;
	m_mirrored = m_reset[kind];
	m_desired  = m_mirrored;
	value      = m_mirrored;
	if (kind == "HARD")
		m_written  = 0;
endfunction: reset
</pre>
</font> 
<font color=blue>
其实是作为特别处理用的，如果所有的寄存器都只有一个复位的时候默认一个HARD值统一复位。
如果某个寄存器需要特殊的复位，则可以重写该类中的reset（…）方法：
代码例子：
<pre name="code" class="systemverilog">  		
class some_reg extends uvm_reg;
    ...
	function void reset(string kind = "HARD");
		if (kind != "SOFT")
			super.reset(kind);
	endfunction

endclass
</pre>   
</font> 
