---
title: 精细化控制process~
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-10-14 18:49:28
---



#### 啥也不说，做个轮子~

```verilog
//###############################################################################
//Process
//###############################################################################
class Process;

    /*{{{*/
    typedef enum {FINISHED,RUNNING,WAITING,SUSPENDED,KILLED} state;
    typedef struct {
        process pid;
        realtime start_time;
        realtime end_time;
    } process_st;
    
    static process_st pid[string];
    
    static function void Setpid (
        string name
    );
        if(!pid.exists(name)) begin/*{{{*/
            pid[name].pid = process::self(); 
            pid[name].start_time = $realtime; 
        end
        else
            $fatal(0,$sformatf("Pid name:%s already exists!",name));/*}}}*/
    endfunction  
    
    static function process Getpid (
        string name
    );
        if(pid.exists(name))/*{{{*/
            return pid[name].pid; 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endfunction  
    
    static function void SetEndTime (
        string name
    );
        if(pid.exists(name)) begin/*{{{*/
            pid[name].end_time = $realtime; 
        end
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endfunction  
    
    static function state Status(
        string name
    );
        if(pid.exists(name))/*{{{*/
            return state'(pid[name].pid.status); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endfunction
    
    static function void Kill(
        string name
    );
        if(pid.exists(name))/*{{{*/
            pid[name].pid.kill(); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endfunction
    
    static task Await(
        string name
    );
        if(pid.exists(name))/*{{{*/
            pid[name].pid.await(); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endtask
    
    static task Suspend(
        string name
    );
        if(pid.exists(name))/*{{{*/
            pid[name].pid.suspend(); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endtask
    
    static task Resume(
        string name
    );
        if(pid.exists(name))/*{{{*/
            pid[name].pid.resume(); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endtask
    
    static function void Srandom(
        string name,
        int seed
    );
        if(pid.exists(name))/*{{{*/
            pid[name].pid.srandom(seed); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endfunction
    
    static function string Get_randstate(
        string name
    );
        if(pid.exists(name))/*{{{*/
            return pid[name].pid.get_randstate(); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endfunction
    
    static function void Set_randstate(
        string name,
        string state
    );
        if(pid.exists(name))/*{{{*/
            pid[name].pid.set_randstate(state); 
        else
            $fatal(0,$sformatf("Pid name:%s not exists!",name));/*}}}*/
    endfunction
    
    static function void Gc();
        string name;/*{{{*/
        if(pid.first(name)) begin
            do begin
                if(pid[name].pid.status == process::FINISHED)begin
                    $info($sformatf("Delete pid[FINISHED] name:%s.",name));
                    pid.delete(name);
                end
                else if(pid[name].pid.status == process::KILLED)begin
                    $info($sformatf("Delete pid[KILLED] name:%s.",name));
                    pid.delete(name);
                end
            end while(pid.next(name));
        end/*}}}*/
    endfunction
    
    static task WaitForNotNull(
        string name
    );
        #0;
        wait(pid[name].pid != null);
    endtask
    
    static task WaitForAllNotNull();
        string name;/*{{{*/
        #0;
        if(pid.first(name)) begin
            do begin
                wait(pid[name].pid != null);
            end while(pid.next(name));
        end/*}}}*/
    endtask
    
    static task AwaitAll();
        string name;/*{{{*/
        if(pid.first(name)) begin
            do begin
                pid[name].pid.await();
            end while(pid.next(name));
        end/*}}}*/
    endtask
    
    static function void Print();
        string pstr;/*{{{*/
        string name;
        realtime start_time;
        realtime end_time;
        pstr = "################################################################################\n";
        pstr = {pstr,"[ ProcessIdName ]\t[   Status  ]\t[  StartTime(ns) ]\t[  EndTime(ns) ]\n"};
        pstr = {pstr,"################################################################################\n"};
        if(pid.first(name)) begin
            do begin
                start_time = pid[name].start_time;
                end_time = pid[name].end_time;
                case(pid[name].pid.status)
                    process::FINISHED  : ppstr(pstr,name,"FINISHED",start_time,end_time);
                    process::RUNNING   : ppstr(pstr,name,"RUNNING",start_time,end_time);
                    process::WAITING   : ppstr(pstr,name,"WAITING",start_time,end_time);
                    process::SUSPENDED : ppstr(pstr,name,"SUSPENDED",start_time,end_time);
                    process::KILLED    : ppstr(pstr,name,"KILLED",start_time,end_time);
                endcase
            end while(pid.next(name));
        end
        pstr = {pstr,"################################################################################\n"};
        $write(pstr);/*}}}*/
    endfunction
    
    local static function void ppstr(ref string pstr,input string name,stat,input realtime start_time,end_time);
        if(end_time == 0)/*{{{*/
            pstr = {pstr,$sformatf("[ %-13s ]\t[  %-9s ]\t[  %-12.2f  ]\t[     ----     ]\n",name,stat,start_time)};
        else
            pstr = {pstr,$sformatf("[ %-13s ]\t[  %-9s ]\t[  %-12.2f  ]\t[  %-10.2f  ]\n",name,stat,start_time,end_time)};
        pstr = {pstr,"--------------------------------------------------------------------------------\n"};/*}}}*/
    endfunction
    
    /*}}}*/
endclass
```

