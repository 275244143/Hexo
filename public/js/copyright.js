document.body.oncopy = function ()
{
    setTimeout(
        function ()
        {
            var text = clipboardData.getData("text");
            if (text)
            { 
                text = text + "\r\n本文出自【验证技术博客@神秘人】："+location.href;
                clipboardData.setData("text", text);
            }
        },200
    )
}
window.onload = function()
{
    this.focus();
}
