---
title: signal延迟模块RTL
author: 神秘人
tags:
  - UVM
  - SystemVerilog
  - Verilog
categories:
  - 验证
mathjax: false
date: 2020-09-18 18:14:59
---

```verilog
 //============================================================================
 //     FileName: signal_ndelay.sv
 //         Desc:
 //              Function : use for pipeline signals.
 //              Parameter
 //                 RST_MODE  : use reset mode to pipeline, value inside {0:asyn, 1:sync, 2:none}
 //                 DWIDTH    : signal vector width, value inside {1:1bit, 2:2bit, ...}
 //                 PIPE_NUM  : pipeline number, value inside {0:passthrought, 1:1 pipeline, ...}
 //       Author: 神秘人
 //        Email: 275244143@qq.com
 //     HomePage:
 //      Version: 1.0.0
 //   LastChange: 2020-09-17 17:39:49
 //      History:
 //============================================================================*/

`ifndef SIGNAL_NDELAY__SV
`define SIGNAL_NDELAY__SV

module signal_ndelay #(
    parameter RST_MODE  = 0,
    parameter DWIDTH    = 1,
    parameter PIPE_NUM  = 2
) (
   input                 clk     ,
   input                 rst_n   ,
   input  [DWIDTH-1 : 0] sig_din ,
   output [DWIDTH-1 : 0] sig_dout
);


    generate
        if(PIPE_NUM == 0) begin:PASS_PROC
            assign sig_dout = sig_din;
        end
        else begin:PIPE_PROC
            reg [PIPE_NUM*DWIDTH-1:0] pipelines;
            if(PIPE_NUM == 1) begin
                if(RST_MODE == 0) begin
                    always @(posedge clk or negedge rst_n) begin
                        if(rst_n == 1'b0) begin
                            pipelines <= {(DWIDTH*PIPE_NUM){1'b0}};
                        end
                        else begin
                            pipelines <= sig_din;
                        end
                    end
                end
                else if(RST_MODE == 1) begin
                    always @(posedge clk) begin
                        if(rst_n == 1'b0) begin
                            pipelines <= {(DWIDTH*PIPE_NUM){1'b0}};
                        end
                        else begin
                            pipelines <= sig_din;
                        end
                    end
                end
                else begin
                    always @(posedge clk) begin
                        pipelines <= sig_din;
                    end
                end
                assign sig_dout = pipelines;
            end
            else begin
                if(RST_MODE == 0) begin
                    always @(posedge clk or negedge rst_n) begin
                        if(rst_n == 1'b0) begin
                            pipelines <= {(DWIDTH*PIPE_NUM){1'b0}};
                        end
                        else begin
                            pipelines <= {pipelines[(PIPE_NUM-1)*DWIDTH-1:0],sig_din};
                        end
                    end
                end
                else if(RST_MODE == 1) begin
                    always @(posedge clk) begin
                        if(rst_n == 1'b0) begin
                            pipelines <= {(DWIDTH*PIPE_NUM){1'b0}};
                        end
                        else begin
                            pipelines <= {pipelines[(PIPE_NUM-1)*DWIDTH-1:0],sig_din};
                        end
                    end
                end
                else begin
                    always @(posedge clk) begin
                        pipelines <= {pipelines[(PIPE_NUM-1)*DWIDTH-1:0],sig_din};
                    end
                end
                assign sig_dout = pipelines[PIPE_NUM*DWIDTH-1 -: DWIDTH];
            end
        end
    endgenerate

endmodule // signal_ndelay

`endif
```

