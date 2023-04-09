/*----------------------DROPDOWNS----------------------*/
function dropdown_open(id)
{
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    
    dropdown.hidden = false;
    const buttons = document.querySelectorAll(`[data-dropdown="${id}"]`);
    for (const button of buttons) { button.classList.add("dropdown_opened"); button.setAttribute("aria-expanded", "true"); }
    dropdown.focus();
}
function dropdown_close(id)
{
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    dropdown.hidden = true;
    const buttons = document.querySelectorAll(`[data-dropdown="${id}"]`);
    for (const button of buttons) { button.classList.remove("dropdown_opened"); button.setAttribute("aria-expanded", "false"); }
}
function toggle_dropdown(ev)
{
    const id = ev.currentTarget.dataset.dropdown;
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    if (dropdown.hidden) dropdown_open(id);
    else dropdown_close(id);
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