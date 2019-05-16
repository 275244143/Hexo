---
title: 为什么如下SV代码不报错？
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: true
date: 2019-05-16 09:35:24
---

```
module top();
 
class class_A;
  function void compare( int a1, int a2);
 
      if(a1 > a2)
         $display("%d  > %d\n",a1,a2);
      if(a1 < a2)
         $display("%d  < %d\n",a1,a2);
      if(a1 == a2)
         $display("%d  ==  %d\n",a1,a2);
 
  endfunction
endclass
 
class class_B;
 
   class_A  A;
 
   //function calling class_A's comapre function
   function void new_compare(int a , int b);;
      A.compare(a,b);
   endfunction
 
endclass
 
 //class B instance
  class_B  B;
 
  initial begin
 
     $display("Start Test\n");
     B = new;
     B.new_compare(32,24);
 
  end
 
 
endmodule : top
```

+ 解释

You code "works？？" because the method class_A::compare makes no references to any non-static class properties. Most implementations add an implicit this handle argument to non-static class methods, and it would not be until the method tries to reference the null this handle that you would see an error. However, the LRM does not guarantee this behavior and you should declare compare() as a static method so the compiler will check that compare does not access any non-static class properties.


Accessing non-static members (see 8.9) or virtual methods (see 8.20) via a null object handle is illegal. The result of an illegal access via a null object is indeterminate, and implementations may issue an error.

+ 试下公式~~~~

$$ \bbox[red,5px,border:2px solid black]
{
E=mc^2 
}
$$



$$ \bbox[yellow,5px,border:2px solid red]
{
e^x=\lim_{n\to\infty} \left( 1+\frac{x}{n} \right)^n
\qquad (1) 
}
$$

$$ \bbox[blue,5px,border:2px solid yellow]
{
\begin{matrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9 
\end{matrix}
}
$$



