---
title: 约束12与34都存在number数组里或者12与34都不在number数组里里？
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
date: 2019-04-30 09:59:29
---
```
module cons;

  class test;

    bit [7:0] fib[7] = '{12,34,45,47,78,96,104};
    rand bit [7:0] dt[2];
    rand bit [7:0] number[];
    rand bit in_or_not_in;
    constraint number_cn {
      number.size() inside {[2:5]};
      unique {dt};
      foreach(dt[i])
        dt[i] inside {fib[0],fib[1]};//can change
      foreach(dt[i])
        if (in_or_not_in == 1)
            dt[i] inside {number};
        else
            !(dt[i] inside {number});
      in_or_not_in dist {1:=8,0:=2};
    }

  endclass

  initial begin
    automatic test utest = new();
    for(int i=0;i<30;i++) begin
        void'(utest.randomize());
        $display("%0d,%p",utest.in_or_not_in,utest.number);
    end
  end

endmodule

```
### NCsim输出
```
1,'{'h22, 'hc}
1,'{'hd9, 'hc, 'h7e, 'h22, 'hd2}
0,'{'hdd, 'h64}
1,'{'ha, 'hc, 'h22, 'hf4}
1,'{'h22, 'hc}
1,'{'hc, 'h22}
1,'{'hc, 'h9, 'h22}
1,'{'h27, 'hc, 'h17, 'h22}
1,'{'h22, 'hc}
0,'{'hb, 'h7c, 'h6a}
1,'{'hc, 'h22}
1,'{'h7e, 'hd0, 'hc, 'h22, 'h13}
1,'{'h22, 'hca, 'hc}
1,'{'h22, 'hc}
1,'{'hc, 'h22}
1,'{'h80, 'hc, 'hc5, 'h22}
0,'{'h83, 'h5c, 'hae, 'he4}
1,'{'h95, 'hb2, 'h22, 'hc}
1,'{'hed, 'hc, 'hd0, 'hac, 'h22}
1,'{'ha3, 'h22, 'hc, 'h16, 'h84}
1,'{'h9d, 'hc, 'h22, 'h16}
1,'{'h22, 'hc, 'haa, 'ha1}
1,'{'hc, 'h22}
1,'{'h87, 'hc, 'h22}
1,'{'hc, 'h79, 'h22}
0,'{'h60, 'h99, 'h2b}
1,'{'hc, 'h22}
1,'{'h22, 'hc}
1,'{'h22, 'hc}
1,'{'hc, 'h22}
```


