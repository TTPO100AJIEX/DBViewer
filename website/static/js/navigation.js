/*----------------------NAVIGATION MENU OPEN/CLOSE----------------------*/
function open_mobile_navigation()
{
    document.getElementById("navigation").classList.remove("closed");
    document.getElementById("navigation_backdrop").classList.remove("closed");
}
function close_mobile_navigation()
{
    document.getElementById("navigation").classList.add("closed");
    document.getElementById("navigation_backdrop").classList.add("closed");
}

Array.from(document.getElementsByClassName("navigation_opener")).forEach(button =>
{
    button.addEventListener("click", open_mobile_navigation, { "capture": false, "once": false, "passive": true });
});
Array.from(document.getElementsByClassName("navigation_closer")).forEach(button =>
{
    button.addEventListener("click", close_mobile_navigation, { "capture": false, "once": false, "passive": true });
});
document.getElementById("navigation_backdrop").addEventListener("click", close_mobile_navigation, { "capture": false, "once": false, "passive": true });