async function get_main(req, res)
{
    if (req.status == "authorized") return res.redirect("/database");
    return res.render("oauth.ejs");
}

async function post_oauth(req, res)
{
    return await res.login(req.body.login, req.body.password);
}
async function get_logout(req, res)
{
    return res.logout();
}

export { get_main, post_oauth, get_logout };