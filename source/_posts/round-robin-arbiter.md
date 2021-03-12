---
title: round robin arbiter
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-03-11 19:23:19
---



### 轮循仲裁

```verilog
module rr_arbiter #(
                    parameter REQ_NUM = 4,
                    localparam IDX_W  = $clog2(REQ_NUM-1) ,
                    localparam REQ_2  = 2*REQ_NUM)
(
    input                     clk,
    input                     rst_n,
    input [REQ_NUM-1:0]       req,
    output reg [REQ_NUM-1:0]  grant,
    output reg [IDX_W-1:0]    grant_idx
);

    ///////////////////////////////////////////////////
    // INTERNAL SIGNALS
    ///////////////////////////////////////////////////
    wire [REQ_2-1:0]          circle_req      ;
    wire [REQ_2-1:0]          shift_req       ;
    wire [REQ_NUM-1  :0]      grant_next      ;
    wire [IDX_W-1:0]          grant_idx_next  ;
    wire [REQ_NUM-1  :0]      rptr            ;
    wire [REQ_NUM-1:0]        mask            ;

    ///////////////////////////////////////////////////
    //compute the shifted request and grant next value
    ///////////////////////////////////////////////////
    assign circle_req = {req,req};
    assign shift_req  = (circle_req) & (~((circle_req) - ({{REQ_NUM{1'b0}},rptr})));
    assign grant_next = ((shift_req[(2*REQ_NUM)-1: REQ_NUM]) | (shift_req[REQ_NUM-1:0]));

    ///////////////////////////////////////////////////
    //one hot to binary converter
    ///////////////////////////////////////////////////
    genvar                    id,idm;//grand id and idm is binary value
    generate
        for (idm=0; idm<IDX_W; idm=idm+1) begin : idx_gen
            for (id=0; id<REQ_NUM; id=id+1) begin : id_gen
                assign mask[id] = id[idm];
            end
            assign grant_idx_next[idm] = |(mask & grant_next);
        end
   endgenerate

    ///////////////////////////////////////////////////
    //compute the next rotate pointer value
    ///////////////////////////////////////////////////
   assign  rptr = (grant=={REQ_NUM{1'b0}}) ? {{REQ_NUM-1{1'b0}},1'b1}
                  : (((grant & req)=={REQ_NUM{1'b0}}) ? {grant[REQ_NUM-2:0],grant[REQ_NUM-1]} : grant[REQ_NUM-1:0]);

   ///////////////////////////////////////////////////
   //register the output
   ///////////////////////////////////////////////////
   always @ (posedge clk or negedge rst_n) begin
       if(rst_n == 1'b0) begin
           grant_idx <= {IDX_W{1'b0}};
           grant     <= {REQ_NUM{1'b0}};
       end
       else begin
           grant_idx <= grant_idx_next;
           grant     <= grant_next;
       end
   end

```

