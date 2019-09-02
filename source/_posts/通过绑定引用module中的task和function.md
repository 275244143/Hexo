---
title: 通过绑定引用module中的task和function~
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-09-02 11:42:08
password: 2100140
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

####  历史遗留代码中很多task，function都是卸载module里面，一旦加密，很难调用。通过bind以及EDA工具的支持可以自动获取接口，代码如下所示。

```verilog
`ifndef BINDIF__SV
`define BINDIF__SV


module funcdut();

    task test(int a,int b);
        $display("%m:%d",a+b);
    endtask

endmodule


module dut();

    funcdut inst();

endmodule


interface myif();

	import uvm_pkg::*;
	`include "uvm_macros.svh"


    task mytest(int a,int b);
    
        test(a,b);
    
    endtask
    
    function automatic void register();
    	virtual myif vif;
        //this for vcs
        //vif  = interface::self();
        //this for irun
        vif = myif;
        uvm_config_db #(virtual myif)::set(null,$sformatf("%m"),"vif",vif);
    endfunction
    
    initial register();

endinterface


module tbtop;
	import uvm_pkg::*;
    `include "uvm_macros.svh"
    
    virtual myif vif;
    
    dut u_dut0();
    dut u_dut1();
    
    bind u_dut0.inst myif u_myif();
    bind u_dut1.inst myif u_myif();
    
    //here can use uvm class to get vif
    initial begin
        #10ns;
        uvm_config_db #(virtual myif)::get(null,"tbtop.u_dut0.inst.u_myif.register","vif",vif);
        vif.mytest(10,10);
        uvm_config_db #(virtual myif)::get(null,"tbtop.u_dut1.inst.u_myif.register","vif",vif);
        vif.mytest(10,20);
    end

endmodule

`endif
```