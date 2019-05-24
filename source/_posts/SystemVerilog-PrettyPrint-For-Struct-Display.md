---
title: SystemVerilog PrettyPrint For Struct Display.
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-05-24 15:08:50
---

####  因为SytemVerilog没有反射特性，只能自己写一个层次化显示结构体的包。通常EDA工具只是一行显示，非常ugly，如下所示。如果拷贝走的，请自觉在自己代码上面贴上神秘人版权，或者给予红包支持，谢谢！x3 。

##### EDA丑陋显示：

```verilog
'{m:2, n:'h3, que:'{'{a:1, b:'h3, que1:'{'h1, 'h0, 'h0}}}, k:'{a:1, b:'h2,str:'{1:"sttt", 2:"eeeee"}}}
```

##### 代码包以及测试

~~~verilog
//Package for PrettyPrint for struct data
package PrettyPrint;

class stack #(type T = int);
/*{{{*/
    typedef T m_que_t[$];
    m_que_t m_que;

    function void push(T item);
        this.m_que.push_back(item);
    endfunction
    
    function T pop();
        return this.m_que.pop_back();
    endfunction
    
    function T top();
        return this.m_que[$];
    endfunction
    
    function int size();
        return this.m_que.size();
    endfunction

    function bit empty();
        return (this.m_que.size() == 0);
    endfunction
    
    function void clear();
        this.m_que.delete();
    endfunction

    function m_que_t acquire();
        return m_que;
    endfunction
/*}}}*/
endclass

function automatic string spprint(string strin,
    string padding = " ",
    byte indent = 2,
    byte extend = 1
);
    const string sspace = " ";/*{{{*/
    const string slbrace = "{";
    const string srbrace = "}";
    const string scomma = ",";
    const string smark = "'";
    const string senter = "\n";
    string strout;
    string strin_nospace;
    string strin_nospace_nomark;
    int    strin_nospace_nomark_len;
    stack #(string) sstack = new;
    foreach(strin[i]) begin:DEL_SPACE
        if(string'(strin[i]) != sspace)
            strin_nospace = {strin_nospace,strin[i]};
    end
    foreach(strin_nospace[i]) begin:DEL_MARK
        sstack.push(strin_nospace[i]);
        if(sstack.top() == slbrace) begin
            void'(sstack.pop());
            void'(sstack.pop());
            sstack.push(slbrace);
        end
    end
    //here vcs must change if not support,use follow
    //begin
    //    string str_que_tmp[$] = sstack.acquire();
    //    foreach(str_que_tmp[i])begin
    //        strin_nospace_nomark = {strin_nospace_nomark,str_que_tmp[i]};
    //    end
    //end
    strin_nospace_nomark = string'(sstack.acquire());
    sstack.clear();
    /*}}}*/
    strin_nospace_nomark_len = strin_nospace_nomark.len();
    for(int i = 0;i < strin_nospace_nomark_len;++i) begin:STACK_INDENT_PRINT
        if(string'(strin_nospace_nomark[i]) == slbrace) begin
            sstack.push(slbrace);
            strout = {strout,senter,{(sstack.size()*indent){padding}},strin_nospace_nomark[i]};
        end
        else if(string'(strin_nospace_nomark[i]) == scomma) begin
            strout = {strout,strin_nospace_nomark[i],senter,{(sstack.size()*indent+extend){padding}}};
        end
        else if(string'(strin_nospace_nomark[i]) == srbrace) begin
            strout = {strout,senter,{(sstack.size()*indent){padding}},strin_nospace_nomark[i]};
            void'(sstack.pop());
        end
        else begin
            if(string'(strin_nospace_nomark[i-1]) == slbrace)
                strout = {strout,senter,{(sstack.size()*indent+extend){padding}},strin_nospace_nomark[i]};
            else
                strout = {strout,strin_nospace_nomark[i]};
        end
    end
    return strout;
endfunction

endpackage:PrettyPrint

module PrettyPrintTB;

import PrettyPrint::spprint;

typedef struct {
    int a;
    byte b;
    string str[int];
} stx;

typedef struct {
    int a;
    byte b;
    bit que1[$];
} st1;

typedef struct {
    int m;
    byte n;
    st1 que[$];
    stx k;
} st2;

initial begin
    automatic st2 stt = '{2,3,'{'{1,3,'{1,2,4}}},'{1,2,'{1:"sttt",2:"eeeee"}}};
    $display($sformatf("%p",stt));
    $display(spprint($sformatf("%p",stt)," ",2));
    $display(spprint($sformatf("%p",stt),"*",2,2));
end

endmodule

~~~

##### 输出

```verilog
'{m:2, n:'h3, que:'{'{a:1, b:'h3, que1:'{'h1, 'h0, 'h0}}}, k:'{a:1, b:'h2, str:'{1:"sttt", 2:"eeeee"}}}

  {
   m:2,
   n:'h3,
   que:
    {
      {
       a:1,
       b:'h3,
       que1:
        {
         'h1,
         'h0,
         'h0
        }
      }
    },
   k:
    {
     a:1,
     b:'h2,
     str:
      {
       1:"sttt",
       2:"eeeee"
      }
    }
  }

**{
****m:2,
****n:'h3,
****que:
****{
******{
********a:1,
********b:'h3,
********que1:
********{
**********'h1,
**********'h0,
**********'h0
********}
******}
****},
****k:
****{
******a:1,
******b:'h2,
******str:
******{
********1:"sttt",
********2:"eeeee"
******}
****}
**}
```

