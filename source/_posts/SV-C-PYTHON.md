---
title: SV&C&PYTHON
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-01-29 10:38:44
---



### QA

We built a high level model in python, we made use of the scipy library to quickly test some things. Now we're building a verification environment in SystemVerilog using the OVM. We would like to use the python implementation as a golden model. Therefor we need to cosimulate python and SystemVerilog, but I couldn't find any documentation whether this is possible? (We're using Questa). Any ideas?



### ANS

@@@

EXAMPLE
**SV-CODE**

```
 ////////////////////////////////////////////////////////////////////////
 //IMPORT FUNCTION DPI DECLARATION FROM C
 ////////////////////////////////////////////////////////////////////////            
import "DPI-C" function void python_sign_msg(string key_file_name, string msg_file_name, string signed_file_name );
import "DPI-C" function string return_string_in_c(string text, inout string output_txt);    
 
 
typedef class keycontrol_seq_handles;
//-----------------------
class keycontrol_predictor#(int PARAM_PLACEHOLDER = 1) extends pve_predictor#(keycontrol_seq_handles);//extends uvm_component;
………..
//////////////////////
//USE OF DPI
//////////////////////
string output_c,output2_c;
output_c = return_string_in_c("This text",output2_c); 
python_sign_msg("file.txt","bla","blo");
 
endclass 
```

**C-CODE**



```
//include DPI
#include "svdpi.h"
//include the IO files
#include <stdio.h>
//include string functions
#include <string.h>
//include use of malloc
#include <stdlib.h>
//include Phyton embed lib
#include <Python.h>
 
 
//to add the ability to use printf
// same inputs as defined in SV with python path which is the defined surrounded by double quotes ""
 
#ifndef PYTHON_PATH
#error You must define the path to the python file in gcc compiler with -D 'PYTHON_PATH="'$PYTHON_DIR'"' or vlog with -ccflags "-I/usr/include/python2.6/ -D 'PYTHON_PATH=\"$PYTHON_DIR\"'"
#endif
 
 /* function declaration */
void python_sign_msg( char *key_file_name, char *msg_file_name, char *signed_file_name ) {
 
 
          char *append_path = malloc(sizeof(char) * 1000);
          append_path = PYTHON_PATH":.";
          printf("Append to path is:\n%s\n", append_path);           
          setenv("PYTHONPATH",append_path,1);//Set PYTHONPATH TO working directory                 char *path = Py_GetPath();
          printf("Python search path is:\n%s\n", path);
 
          int argc;
          char * argv[2];
          char *phyton_script_name = malloc(sizeof(char) * 100);
          phyton_script_name = "test";//don't use the .py extension here
 
 
          argc = 3;//argument count is 3 arguments
          argv[0] = phyton_script_name;//key_file_name;//"mymod";//the argument value vector is
          argv[1] = "4";
          argv[2] = "3";
 
           Py_Initialize();// Initialize the Python Interpreter
 
           //First import python script module name
 
           PySys_SetArgv(argc, argv);//set the previous arguments as calling arguments of the import module
           //PyObject* myPmodule = PyImport_ImportModule("sign_hmac-sha256");//don't put the .py extension here
           PyObject* myPmodule = PyImport_ImportModule(phyton_script_name);//IMPORTANT THE MAIN MODULE IS EXECUTED here with the PySys_SetArgv arguments
           if(myPmodule==NULL)
           {
               printf("Not able to load&execute main phyton script:\n%s\n", phyton_script_name);
               PyErr_Print();
           }
           ///////////////////////////////
           //Extract variables through dict
           //////////////////////////////
           //retrieve all variables and functions of the module in a namespace or dict
           PyObject *module_dict   = PyModule_GetDict(myPmodule);
 
           char *function_name = malloc(sizeof(char) * 100);
           function_name = "suma";//don't use the .py extension here
           //getting the reference to the specific python function you want from the python script
           PyObject* myPfunction = PyObject_GetAttrString(myPmodule, function_name);
 
           if (PyCallable_Check(myPfunction))
           {
               //EXAMPLE CREATE arguments in Python 
               //PyObject* myPargs=Py_BuildValue("(z)",(char*)"something");
               //PyObject* myPargs = PyTuple_Pack(1,PyFloat_FromDouble(2.0));
               //ok = PyArg_ParseTuple(args, "lls", &k, &l, &s); /* Two longs and a string */
               //PyObject* myPargs = Py_BuildValue("sss",key_file_name,msg_file_name,signed_file_name); /* Three strings */
               //Execute the function with arguments directly
               //PyObject* result = PyObject_CallObject(myPfunction, (char*)"something", (char*)"something", (char*)"something");/* Three strings */               
               //PyObject* myPargs = Py_BuildValue("zz","4" ,"3");
               PyObject* myPargs = Py_BuildValue("ii",4 ,3);
               PyObject* item=PyTuple_GetItem(myPargs,0);//get the item of the tuple position 0 
               printf("Python tuple: %d\n", (int)PyInt_AsSsize_t(item)); /*incase an integer*/
               //printf("Python tuple: %s\n", PyString_AsString(item));
               PyErr_Print();               
               PyObject* result = PyObject_CallObject(myPfunction, myPargs);//the myPargs must be always be a Pyobject               
 
               PyErr_Print();
               Py_DECREF(myPargs);
               Py_DECREF(item);
               Py_DECREF(result);
           } else 
           {
               printf("The function:\n%s\n", function_name);
               //Pring errors comming from Python
               PyErr_Print();
           }
 
 
           ////////////////////////////////////////
           // Clean up phase
           ////////////////////////////////////////
           Py_DECREF(myPmodule);
           Py_DECREF(myPfunction);
 
 
 
           Py_Finalize();// Finish the Python Interpreter
}
 
 /* function declaration text char stream passed as pointer value and text2 passed as pointer reference */
  char * return_string_in_c( char *text,  char **text2) {
    char *fix="This variable cannot be changed although it is a pointer, just as example";/*fix allocation and constant*/
    char dest[50]="Variable array created in a function:";/* String array max 50 chars allocated*/
    char *out = malloc(sizeof(char) * 100);/* Dynamic string max 100 chars allocated*/
    /* Concatenate input text and put in out of strcat*/
    //strcat(out, text);/* initialize out using text string*/
    snprintf(out, sizeof(char) * 100, "%s%s", out,text);
    printf("fix : |%s|,dest : |%s|,text : |%s|,out : |%s|\n", fix,dest,text,out);
    *text2=dest;/* allocate pointer value with dest*/
    *text2=out;/* allocate pointer value with out*/
    return out;
}
 
 /* main */
 void main() {
    char text[100]="from_main_text_variable";/*max 100 chars allocated*/
    char *text2;/* pointer not allocated*/
    char *point = return_string_in_c(text, &text2);/* &text2 passing by reference*/
    printf("Final destination string : |%s|\n", text2);
    printf("point output : |%s|\n", point);       
 
    printf("DEFINED PYTHON_PATH: |%s|\n", PYTHON_PATH);
    python_sign_msg("","","");
    printf("Finished python\n");
 
 }
 
```

**PYTHON SCRIPT - TEST.py,**
very important to remove TABS!!!!!!
 

```
#!/usr/bin/python
# This program adds two numbers
import sys
 
if( len( sys.argv ) < 3 ) :
    raise( Exception( "Usage: test.py number1 number2" ) )
 
num1 = int(sys.argv[ 1 ])
print "sys.argv[ 1 ] : ",int(sys.argv[ 1 ])
num2 = int(sys.argv[ 2 ])
print "sys.argv[ 2 ] : ", int(sys.argv[ 2 ])
 
#the suma function definition
def suma( arg1, arg2 ):
    # Add both the parameters and return them."
    total = arg1 + arg2; # Here total is local variable.
    print "Inside the function local total : ", total
    return total;
 
# Display the suma
print('The sum using suma function of {0} and {1} is {2}'.format(num1, num2, suma(num1,num2)))
 
#num1 = 1.5
#num2 = 6.3
# Add two numbers
sum = float(num1) + float(num2)
# Display the sum
print('The sum of {0} and {1} is {2}'.format(num1, num2, sum))
 
 
#a dummy function definition
def multiply():
   c = 12345*6789
   print 'The result of 12345 x 6789 :', c
   return c
 
```

Lastly, you have to compile the files using your vendor flow.
For example,
**Questa**
1) You **compile the C code** using ccflags and introducing the defines you want to add.
In our case our C code need the define PYTHON_PATH

```
vlog $DUT_VLOG_ARGS ${TB_DIR}/your_C_code.c -ccflags "-I/usr/include/python2.6/  -D 'PYTHON_PATH=\"$PYTHON_DIR\"'"
```


2) In Questa if you have python you have to call  including 



You can also use the external DPI flow
\-        Compile : gcc -g -c -I<>/questasim/include -o tmp.o
\-        Link :      gcc -shared -fPIC -Bsymbolic -o  .so tmp.o

Example
`gcc -g -D 'PYTHON_PATH="'$PYTHON_DIR'"' -I/usr/include/python2.6/ -lpython2.6 -fPIC  -I/usr/local/Mentor/Questasim103e/questasim/include/ -o tmp.o   -c ${TB_DIR}/your_C_code.c`
`gcc -shared -fPIC -Bsymbolic -g -lpython2.6 -o output.so tmp.o`

And then load the .so shared file in QUESTA using **-sv_lib**:

```
vsim -c -sv_lib output  -ldflags '-lpython2.6' -voptargs="+acc"  -onfinish stop +UVM_TESTNAME=yourtest    <yourtop> -do "run -all"
```

**Synopsys VCS**
1) You **compile the C code** using ccflags and introducing the defines you want to add.
In our case our C code need the define PYTHON_PATH

```
#GCC in two steps for shared object
gcc -g -D 'PYTHON_PATH="'$PYTHON_DIR'"'  -fPIC -Wall -I${VCS_HOME}/include -I/usr/include/python2.6/ -lpython2.6 -c ${PROJECTDIR}/verification/PVE/keycontrol/tb/keycontrol_C_code_wrapper.c 
gcc -fPIC -shared -o keycontrol_C_code_wrapper.so  keycontrol_C_code_wrapper.o 
```


2) You do the VCS elaboration linking the python lybrary with -LDFLAGS '-lpython2.6'`vcs -timescale=1ps/1ps -ntb_opts uvm -lca -kdb -full64 keycontrol_tb_top -debug_access+all+reverse  -LDFLAGS '-lpython2.6'`3) You run the created simulation file. You call b]simv[/b] including  to import the C shared object.

```
#RUN C CODE
./simv -gui -ucli +DVE +UVM_NO_RELNOTES  -l simv.log  +UVM_TESTNAME=keycontrol_basic_test -do ../../verification/PVE/keycontrol/tools/keycontrol_ucli_init.synopsys -sv_lib keycontrol_C_code_wrapper
```

Another tools would have another flow.

Embedding python is a solution that is **more efficient** than FILE IO in your python script.

If your python script reads inputs and outputs from files, then the easiest way to call python from Systemverilog is just by doing a **system call**.

```
$system("python yourscript.py filenamein filenameout ")
```

You have of course to write in systemverilog your input file and read in systemverilog the output file for comparison.



@@@

Hi, i want to provide a **second example**. The example is also doing DPI with Phyton, just to spare time to the verification community :).

This time i export a dynamic array from Python to C and then to Systemverilog.
In order to resize the Systemverilog dynamic array there is a well defined procedure in DPI.
This can be seen in the example folder of many EDA tools.
The resize of a systemverilog dynamic array requires 2 import DPI function and one export DPI function. We need two DPI import functions because the "C side" needs the correct size for the dynamic array before it is called from SV.

I have found another example (easier), to do the resize of dynamic arrays in another web, see https://community.cadence.com/cadence_technology_forums/f/30/t/19377. However, the example on that web will not work for all EDA tools.

-->EDIT: I have included to the dpi import call an *input int select_output_array* to select on which dynamic array we want to have/fetch the output of the C calculation. This is useful if you have to call the same DPI function from different places in your test bench parallely and one single output is not enough (could be overwritten).

EXAMPLE
**SV-CODE**

```
    ////////////////////////////////////////////////////////////////////////
    //IMPORT FUNCTION DPI DECLARATION FROM C
    ////////////////////////////////////////////////////////////////////////            
    import "DPI-C" context function void python_signature_msg(input byte dpi_data_bytes[],input byte dpi_key_bytes[], input int select_output_array);
        // Fetch C data and initialize the SV dynamic array elements with C data.
        import "DPI-C" context function void fetch_sv_dynarray_data_from_C(chandle cdata, inout byte dpi_output_signature [], input int size);   
 
        export "DPI-C" function reallocate_size_of_output_openSVarray;
        // Define global dynamic array for DPI
        byte dpi_output_bytes[];
        byte dpi_testcase_out_bytes[];// This is an output for a second DPI call in other part of the testbench
        function void reallocate_size_of_output_openSVarray ( input int size, input chandle cdata, input int select_output_array);//chandle is a C pointer type of any type
        $display("SV: allocating new SV DA of size %0d bytes", size);
 
        if (select_output_array==0) begin
            dpi_output_bytes = new[size];
            fetch_sv_dynarray_data_from_C(cdata, dpi_output_bytes, size);
        end else begin
            dpi_testcase_out_bytes = new[size];
            fetch_sv_dynarray_data_from_C(cdata, dpi_testcase_out_bytes, size);
        end
    endfunction
 
//-----------------------
class keycontrol_predictor#(int PARAM_PLACEHOLDER = 1) extends pve_predictor#(keycontrol_seq_handles);//extends uvm_component;
………..
//////////////////////
//USE OF DPI
//////////////////////
dpi_data_bytes = new[10];
 
assert(std::randomize(dpi_data_bytes) with {foreach (dpi_data_bytes[i]) dpi_data_bytes[i] inside  {[0:255]};});
python_signature_msg(dpi_data_bytes,dpi_data_bytes,0);//execute C code with filling SV dynamic array dpi_output_bytes (select_output_array=0)
dpi_output_bytes=dpi_output_bytes;//here we can set a breakpoint to see that the global dynamic array is filled
 
endclass 
```

**C-CODE**



```
//include dpiheader.h
//#include "dpiheader.h" //tools are very picky with the type definitions of the DPI functions in C, to avoid autogenerated dpiheader from questa can be used
//include the IO files
#include <stdio.h>
//include DPI
#include "svdpi.h"
//include strings
#include <string.h>
//include use of malloc
#include <stdlib.h>
//include Phyton embed lib
#include <Python.h>
//this is to support dl function below
#include <dlfcn.h>
//this is to include prints in the SV transcript using  vpi_printf("c: Ref model started\n");
#include "vpi_user.h"
//to add the ability to use printf
// same inputs as defined in SV with default python path
#ifndef PYTHON_PATH
#error You must define the path to the python file in gcc compiler with -D 'PYTHON_PATH="'$PYTHON_DIR'"' or vlog  with -ccflags "-I/usr/include/python2.6/ -D 'PYTHON_PATH=\"$PYTHON_DIR\"'"
#endif
extern void reallocate_size_of_output_openSVarray(int size, void* cdata, int select_output_array); //this will execute in SV a function that resize the SVopenarray used in the DPI call of python_signature_msg
 
 
/* function declaration */
void fetch_sv_dynarray_data_from_C(void* cdata, const svOpenArrayHandle myopenarray,  int size) {
    unsigned char* inputdata = (unsigned  char*) cdata;//input data convert chandle type to char, input the svOpenArrayHandle
    int *out = (int *) svGetArrayPtr(myopenarray);//get a pointer to the svOpenArray
    memcpy(out, inputdata, sizeof(unsigned char) * size);//allocate to the same memory area of "myopenarray" the content of inputdata. That memory area is the used by the SV tool.
}
 
/* function declaration */
void python_signature_msg(const svOpenArrayHandle SVopen_vec_data_msg,
        const svOpenArrayHandle SVopen_vec_key, int select_output_array) {
 
    //SV_LOGIC_PACKED_ARRAY(8, 8bitsarray); // Implementation specific
    //int size = (svHigh(SVopen_vec_data_msg, 1) - svLow(SVopen_vec_data_msg, 1) + 1);
    int i;
    /////////////////////////////////////////
    int nbytes_SV_data_vec = svSizeOfArray(SVopen_vec_data_msg);
    printf("nbytes_SV_data_vec:%0d\n", nbytes_SV_data_vec);
 
    unsigned char *C_byte_data_msg_vec = malloc(sizeof(unsigned char) * ((nbytes_SV_data_vec *2)+1));/* Dynamic string max nbytes_SV_data_vec chars allocated, data is not converted to hex string but directly sent as binary string*/
    /*unsigned char *C_byte_data_msg_vec2 = malloc(sizeof(unsigned char) * (nbytes_SV_data_vec+1));/* Dynamic string max nbytes_SV_data_vec chars allocated, data is not converted to hex string but directly sent as binary string*/
 
    for (i = 0; i < nbytes_SV_data_vec; i++) {
       // C_byte_data_msg_vec[i] = *(unsigned char*) svGetArrElemPtr1(SVopen_vec_data_msg, i); //extract the element value of the SV vector and concatenate to double *data = malloc(10 * (sizeof(double))); printf("%g, ",data[j]);
//IMPORTANT: You must use unsigned char and not char for a correct conversion to HEX
       // printf("C_byte_data_msg_vec[%0d]:|%c|\n", i,C_byte_data_msg_vec[i]);
        sprintf(C_byte_data_msg_vec + i * 2, "%02X", *(unsigned char*) svGetArrElemPtr1(SVopen_vec_data_msg, i)); //convert to hexstr the string byte vector
       // sprintf(C_byte_data_msg_vec2+i, "%C",  *(unsigned char*) svGetArrElemPtr1(SVopen_vec_data_msg, i)); //convert to hexstr the string byte vector
    }
 
    ///////////////////////////////////////
    /////////////////////////////////////////
    int nbytes_SV_key_vec = svSizeOfArray(SVopen_vec_key);
 
    unsigned char *C_byte_key_msg_vec = malloc(sizeof(unsigned char) * ((nbytes_SV_key_vec * 2)+1));/* Dynamic string max nbytes_SV_data_vec unsigned  chars allocated, for hex conversion is 2 characters per byte. we add +1 to the data size because of the end of string character*/
    for (i = 0; i < nbytes_SV_key_vec; i++) {
        sprintf(C_byte_key_msg_vec + i * 2, "%02X", *(unsigned char*) svGetArrElemPtr1(SVopen_vec_key, i)); //convert to hexstr the string byte vector
    }
 
    ///////////////////////////////////////
    //SHOW ME THE PATH
    char *append_path = malloc(sizeof(char) * 1000);
    append_path = PYTHON_PATH
    ":.";
    //append_path = '"'PYTHON_PATH:.";
    setenv("PYTHONPATH", append_path, 1); //Set PYTHONPATH TO working directory <a href="https://www.ibm.com/support/knowledgecenter/en/SSLTBW_2.1.0/com.ibm.zos.v2r1.bpxbd00/setenv.htm
" rel="nofollow">https://www.ibm.com/support/knowledgecenter/en/SSLTBW_2.1.0/com.ibm.zos.v2r1.bpxbd00/setenv.htm
</a>    char *path = Py_GetPath();
    //printf("Python search path is:\n%s\n", path);
    ///////////////////////////////////////
 
    int argc;
    char * argv[2];
    char *phyton_script_name = malloc(sizeof(char) * 100);
    phyton_script_name = "sign_hmac-sha256func";        //don't use the .py extension here
 
    argc = 3;        //argument count is 3 arguments
    argv[0] = phyton_script_name;        //key_file_name;//"mymod";//the argument value vector is
    //PyObject *byte_array = Py_BuildValue("s#", C_byte_data_msg_vec, nbytes_SV_data_vec);
    printf("C_byte_data_msg_vec full:|%s|\n", C_byte_data_msg_vec);
    argv[1] = C_byte_key_msg_vec;
    argv[2] = C_byte_data_msg_vec;
 
 
 
 
    Py_Initialize(); // Initialize the Python Interpreter
/*
    ////////////////////////////////////////
    // If you have problems with C segmentation fault calling python, then
    // use following code instead of Py_Initialize()
    //
    //void* const libpython_handle = dlopen("libpython2.6.so", RTLD_NOW | RTLD_GLOBAL); 
    // typedef void (*void_func_t)(void);
    //void_func_t MyPy_Initialize = dlsym(libpython_handle, "Py_Initialize");
    //MyPy_Initialize();    
    //PyGILState_STATE gstate;
    //gstate = PyGILState_Ensure();
    ////////////////////////////////////////
 */   
    //First import python script module name
 
    PySys_SetArgv(argc, argv); //set the previous arguments as calling arguments of the import module
    //PyObject* myPmodule = PyImport_ImportModule("sign_hmac-sha256");//don't put the .py extension here
    PyObject* myPmodule = PyImport_ImportModule(phyton_script_name); //IMPORTANT THE MAIN MODULE IS EXECUTED here with the PySys_SetArgv arguments
    if (myPmodule == NULL) {
        printf("Not able to load&execute main phyton script:\n%s\n", phyton_script_name);
        PyErr_Print();
    } else {
        //the module was executed so the python variables contain valuabe info
        //signature
        PyObject* Pysignature = PyObject_GetAttrString(myPmodule, "signature");
        PyObject* Pydata = PyObject_GetAttrString(myPmodule, "data");
        PyObject* Pykey = PyObject_GetAttrString(myPmodule, "key");
 
 
 
        int nchar_SV_data_vec = PyString_Size(Pydata);
        char *C_Pydata = malloc(sizeof(char) * (nbytes_SV_data_vec+1));/*we add +1 to the data size because of the end of string character*/
        C_Pydata = PyString_AsString(Pydata);
 
 
        int nchar_SV_key_vec = PyString_Size(Pykey);
        char *C_Pykey = malloc(sizeof(char) * (nbytes_SV_key_vec+1));/*we add +1 to the data size because of the end of string character*/
        C_Pykey = PyString_AsString(Pykey);
 
        ////////////////////////////////////////////////////////
        //output of Python signature in binary
        int nbytes_SV_signature_vec = PyString_Size(Pysignature);
        unsigned char *C_Pysignature_hex = malloc(sizeof(char) * ((nbytes_SV_signature_vec * 2)+1));/*we add +1 to the data size because of the end of string character*/
        unsigned char *C_Pysignature_hex2 = malloc(sizeof(char) * ((nbytes_SV_signature_vec * 2)+1));/*we add +1 to the data size because of the end of string character*/
        unsigned char *C_Pysignature = malloc(sizeof(char) * (nbytes_SV_signature_vec+1));/*we add +1 to the data size because of the end of string character*/
        unsigned char *C_Pysignature2 = malloc(sizeof(char) * (nbytes_SV_signature_vec+1));/*we add +1 to the data size because of the end of string character*/
        C_Pysignature = PyString_AsString(Pysignature);
        for (i = 0; i < nbytes_SV_signature_vec; i++) {
            sprintf(C_Pysignature_hex + i * 2, "%02X", C_Pysignature[i]); //convert to hexstr the uchar string (byte)
        }
        reallocate_size_of_output_openSVarray(nbytes_SV_signature_vec, (void*) C_Pysignature, select_output_array); //Here we call a SV function that will resize a dynamic array of SV and put the provided information on it
        //See more good DPI examples inside Questa instalation directory /opt/Mentor/Questasim10.6b/questasim/examples/systemverilog/dpi/
 
 
    }
 
    ////////////////////////////////////////
    // Clean up phase
    ////////////////////////////////////////
    Py_DECREF(myPmodule);
 
    Py_Finalize();           // Finish the Python Interpreter
 
/*
    ////////////////////////////////////////
    // If you have problems with C segmentation fault calling python, then
    // use following code instead of Py_Finalize()
    ////////////////////////////////////////
    //PyGILState_Release(gstate);
    //dlclose(libpython_handle); //We don't use Python functions directly because of python problems see  <a href="https://stackoverflow.com/questions/14843408/python-c-embedded-segmentation-fault
" rel="nofollow">https://stackoverflow.com/questions/14843408/python-c-embedded-segmentation-fault
</a>    // Release the thread. No Python API allowed beyond this point. 
*/
 
}
/*HELPER FUNCTION FOR BIT VECTORS from bv to int*/
int bv_to_int(const svBitVecVal* bv, int size) {
    int val = 0;
    int mask = 1;
    int i;
    for (i = 0; i < size; i++) {
        if (svGetBitselBit(bv, i) == sv_1)
            val |= mask;
        mask <<= 1;
    }
    return val;
}
/*HELPER FUNCTION FOR BIT VECTORS fron int to bv*/
void int_to_bv(int val, svBitVecVal* bv, int size) {
    int mask = 1;
    svBit b;
    int i;
    for (i = 0; i < size; i++) {
        b = (val & mask) ? sv_1 : sv_0;
        svPutBitselBit(bv, i, b);           //but b in bv on idx i
        mask <<= 1;
    }
}
 
/* main */
int main() {
    printf("DEFINED PYTHON_PATH: |%s|\n", PYTHON_PATH);
    //execute
    const svOpenArrayHandle openhandle1 = malloc(sizeof(char) * 10);
    const svOpenArrayHandle openhandle2 = malloc(sizeof(char) * 10);
    svOpenArrayHandle openhandle3 = malloc(sizeof(char) * 10);
 
    python_signature_msg(openhandle1, openhandle2,0);
 
    printf("Finished python\n");
    return 1;
}
 
 
 
```

**PYTHON SCRIPT - TEST.py,**
very important to remove TABS!!!!!!

```
#!/usr/bin/env python
import sys
import hashlib
import hmac
 
 
# check usage
if( len( sys.argv ) < 3 ) :
    raise( Exception( "Usage: hmac-sha256func.py keyhex datahex" ) )
#key is 256bits long. it is a byte array
key    = sys.argv[ 1 ]
print "key hex : ", key   # is a string in hex
#data is (256 x n) bits long. it is a byte array
data   = sys.argv[ 2 ]  # is a string in binary
#print "data hex : ", data   # is a string in binary
#data_binary = bytearray.fromhex(data);
data_binary = str(bytearray.fromhex(unicode(data)))
#print "data utf : ", data_binary   # is a string in binary
 
# generate hmac-sha256
signature  = hmac.new( key, data_binary, hashlib.sha256 ).digest()
#print "hex_signature : ",''.join(x.encode("hex") for x in signature) 
#print "signature string byte : ", signature 
#print "type signature:", type(signature) 
#print "is string:", type(signature) is str
#print "is bytearray:", type(signature) is bytearray
# signature is a binary string
#print "hex_signature : ",''.join(x.encode("hex") for x in signature)  #This doesn't work with embedded python due to a bug in python
 
hex_signature  = hmac.new( key, data_binary, hashlib.sha256 ).hexdigest()
print "hex_signature :  ", hex_signature # is a string in hex
#signature is 256 bits long . it is a byte array
# write result to output file
signedDate = bytearray( signature + data_binary )
#signedDate which is the boot is 512 bits long. it is a byte array
#print "bytesignedDate : ", signedDate
#print "hex_signedDate : ", ''.join(format(x, '02x') for x in signedDate)
binary = ''.join(format(x, '08b') for x in signedDate)
#print "bin_signedDate : ", binary
```

IMPORTANT REMARK:
Unfortunately, i couldnt find out how to link the "svdpi.h" SV-library file inside your_code.c file with the C compiler (gcc).
That means, if your your_code.c file imports the "svdpi.h" SV-library, then it is not possible to debug your C code only using gcc i.e. gdb.
As i understood, the "svdpi.h" DPI SV-library **is automatically linked inside your EDA vendor tool** in elaboration time.
Could somebody correct me if i am wrong?
It is a pity, that you **have to use a license** of your EDA tool to debug plain C code, just because it uses the "svdpi.h" SV-library.
If somebody knows how to link the svdpi.h library with gcc, then i would appreciate it.