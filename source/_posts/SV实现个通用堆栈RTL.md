---
title: SV实现个通用堆栈RTL
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-08-25 19:04:04
---

### 闲着了~

```verilog 

typedef struct packed {
    logic [15:0] id;
    logic [31:0] data;
} sdata_t;


module stack #(
               type DTYPE = int,
               int STACK_DEPTH = 32'd16
               ) (
                  input logic  clk,
                  input logic  rst_n,
                  input logic  stack_push,
                  input logic  stack_pop,
                  input        DTYPE stack_din,
                  output       DTYPE stack_dout,
                  output logic stack_full,
                  output logic stack_empty
                  );

    DTYPE stack_mem[1:STACK_DEPTH];


    logic [$clog2(STACK_DEPTH):0] stack_next_ptr;

    assign stack_full = (stack_next_ptr > STACK_DEPTH) ? 1'b1 : 1'b0;
    assign stack_empty = (stack_next_ptr > 32'd1) ? 1'b0 : 1'b1;

    always_ff @(posedge clk or negedge rst_n) begin
        if(rst_n == 1'b0) begin
            stack_dout <= '0;
            stack_next_ptr <= 32'd1;
            for(int i = 1; i <= STACK_DEPTH; i++) begin
                stack_mem[i] <= '0;
            end
        end
        else if( (stack_full == 1'b0) && (stack_push == 1'b1) ) begin
            stack_next_ptr <= stack_next_ptr + 32'd1;
            stack_mem[stack_next_ptr] <= stack_din;
        end
        else if( (stack_empty == 1'b0) && (stack_pop == 1'b1) ) begin
            stack_next_ptr <= stack_next_ptr - 32'd1;
            stack_dout <= stack_mem[stack_next_ptr - 32'd1];
        end
        else begin
            ;
        end
    end

endmodule // stack


module tb;

    bit clk;
    bit rst_n;
    logic stack_push;
    logic stack_pop;
    sdata_t stack_din;
    sdata_t stack_dout;
    logic stack_full;
    logic stack_empty;


    stack #(.DTYPE(sdata_t)) u_stack(clk, rst_n, stack_push, stack_pop, stack_din, stack_dout, stack_full, stack_empty);

    initial begin
        $shm_open("wave");
        $shm_probe("ACTFM");
    end


    initial begin
        rst_n <= 0;
        #10ns;
        rst_n <= 1;
    end

    initial begin
        #20ns;
        repeat(30) begin
            @(posedge clk);
            stack_push <= 1;
            stack_din <= {$random, $random};
            @(posedge clk);
            stack_push <= 0;
            stack_din <= 0;
            @(posedge clk);
            stack_pop <= 1;
            @(posedge clk);
            stack_pop <= 0;
        end
        repeat(30) begin
            @(posedge clk);
            stack_pop <= 1;
            @(posedge clk);
            stack_pop <= 0;
        end
        repeat(30) begin
            @(posedge clk);
            stack_push <= 1;
            stack_din <= {$random, $random};
            @(posedge clk);
            stack_push <= 0;
            stack_din <= 0;
        end
        repeat(30) begin
            @(posedge clk);
            stack_pop <= 1;
            @(posedge clk);
            stack_pop <= 0;
        end
    end


    initial begin
        forever #4ns clk = ~clk;
    end


    initial begin
        #3us;
        $finish;
    end

endmodule
```

![](/SV实现个通用堆栈RTL/stack.jpg)