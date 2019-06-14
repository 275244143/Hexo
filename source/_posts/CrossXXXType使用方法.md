---
title: CrossXXXType使用方法
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-14 17:31:07
password: 2101130
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

###    CrossQueueType 使用可以减少不必要的diamante编写~
```verilog
/*
class my_s;
     rand bit[3:0] x, y;

     covergroup cover_me;
          x_cp : coverpoint x;
          y_cp : coverpoint y;
    
          x_y_cross: cross x_cp, y_cp {
               ignore_bins ignore_x_values_higher_than_y = x_y_cross with (x_cp > y_cp);
          }
     endgroup
    
     function new();
          cover_me = new();
     endfunction
endclass
*/

class my_s;
     rand bit[3:0] x, y;

     covergroup cover_me;
          x_cp : coverpoint x;
          y_cp : coverpoint y;
    
          x_y_cross : cross x_cp, y_cp {
               function CrossQueueType createIgnoreBins();
                    // Iterate over all bins
                    for (int xx=0; xx<=15; xx++) begin
                         for (int yy=0; yy<=15; yy++) begin
                              if (xx > yy)
                                   // Ignore this bin
                                   createIgnoreBins.push_back('{xx,yy});
                              else
                                   // This is a valid bin
                                   continue;
                         end
                    end
               endfunction
    
               ignore_bins ignore_x_values_higher_than_y = createIgnoreBins();
          }
     endgroup
    
     function new();
          cover_me = new();
     endfunction
endclass

module top;
     my_s obj;
     initial begin
          obj = new;
          for (int i=0; i<100; i++) begin
               assert(obj.randomize());
               obj.cover_me.sample();
          end
     end
endmodule
```