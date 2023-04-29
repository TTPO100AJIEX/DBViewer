/*----------------------DROPDOWNS----------------------*/
function dropdown_open(dropdown)
{
    dropdown.hidden = false;
    const buttons = document.querySelectorAll(`[data-dropdown="${id}"]`);
    for (const button of buttons) { button.classList.add("dropdown_opened"); button.setAttribute("aria-expanded", "true"); }
    dropdown.focus();
}
function dropdown_close(dropdown)
{
    dropdown.hidden = true;
    const buttons = document.querySelectorAll(`[data-dropdown="${id}"]`);
    for (const button of buttons) { button.classList.remove("dropdown_opened"); button.setAttribute("aria-expanded", "false"); }
}
function toggle_dropdown(ev)
{
    const id = ev.currentTarget.dataset.dropdown;
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    if (dropdown.hidden) dropdown_open(dropdown);
    else dropdown_close(dropdown);
}
Array.from(document.getElementsByClassName("dropdown_opener")).forEach(el =>
{
    el.addEventListener("click", toggle_dropdown, { "capture": false, "once": false, "passive": true });
    const dropdown = document.getElementById(el.dataset.dropdown);
    if (!dropdown || dropdown.classList.contains("dropdown_inplace")) return;
    dropdown.addEventListener("focusout", ev =>
    {
        if (ev.currentTarget.contains(ev.relatedTarget) || (ev.relatedTarget && ev.relatedTarget.dataset.dropdown == ev.currentTarget.id)) return;
        dropdown_close(ev.currentTarget.id);
    }, { "capture": false, "once": false, "passive": true });
    dropdown.addEventListener("keydown", ev =>
    {
        if (ev.key != 'Tab') return;
        setTimeout(() => { if (document.activeElement == el) dropdown_close(dropdown.id) });
    }, { "capture": false, "once": false, "passive": true });
});



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
if (document.getElementById("navigation_backdrop"))
{
    document.getElementById("navigation_backdrop").addEventListener("click", close_mobile_navigation, { "capture": false, "once": false, "passive": true });
}



/*----------------------DIALOGS----------------------*/
function toggle_dialog(ev)
{
    const dialog = document.getElementById(ev.currentTarget.dataset.dialog);
    if (dialog.open) return dialog.close();
    dialog.showModal();
    dialog.focus();
}
Array.from(document.querySelectorAll("[data-dialog]")).forEach(button =>
{
    button.addEventListener("click", toggle_dialog, { "capture": false, "once": false, "passive": true });
});