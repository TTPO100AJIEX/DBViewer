/*----------------------NAVIGATION MENU OPEN/CLOSE----------------------*/
function open_mobile_navigation()
{
    document.getElementById("navigation").classList.toggle("mobile_hidden");
}

Array.from(document.getElementsByClassName("navigation_opener")).forEach(button =>
{
    button.addEventListener("click", open_mobile_navigation, { "capture": false, "once": false, "passive": true });
})
/*function open_control_nav()
{
    document.getElementById("control_nav").classList.remove("hidden");
    document.getElementById("control_nav_backdrop").classList.remove("hidden");
}
function close_control_nav()
{
    document.getElementById("control_nav").classList.add("hidden");
    document.getElementById("control_nav_backdrop").classList.add("hidden");
}
document.getElementById("control_nav_opener").addEventListener("click", open_control_nav, { "capture": false, "once": false, "passive": true });
document.getElementById("control_nav_closer").addEventListener("click", close_control_nav, { "capture": false, "once": false, "passive": true });
document.getElementById("control_nav_backdrop").addEventListener("click", close_control_nav, { "capture": false, "once": false, "passive": true });*/